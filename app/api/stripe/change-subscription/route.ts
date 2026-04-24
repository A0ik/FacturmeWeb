import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase-server';

// Structure des prix
const PRICE_IDS: Record<string, Record<string, string>> = {
  solo: {
    monthly: process.env.STRIPE_SOLO_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_SOLO_YEARLY_PRICE_ID!,
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
  },
  business: {
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID!,
  },
};

// Mapping des plans pour l'ordre (pour calculer si c'est un upgrade ou downgrade)
const PLAN_ORDER = ['free', 'solo', 'pro', 'business'];

// Prix mensuels en euros (pour le calcul du prorata)
const PRICES = {
  solo: 9.99,
  pro: 19.99,
  business: 39.99,
};

/**
 * Calcule le prorata pour un changement d'abonnement
 *
 * Formule: (prix_nouveau - prix_actuel) × (jours_restants / 30)
 */
function calculateProrata(
  currentPlan: string,
  newPlan: string,
  subscriptionStart: string
): {
  prorataAmount: number;
  prorataPercent: number;
  isUpgrade: boolean;
  remainingDays: number;
} {
  // Si pas de plan actuel ou même plan
  if (!currentPlan || currentPlan === 'free' || currentPlan === newPlan) {
    return { prorataAmount: 0, prorataPercent: 0, isUpgrade: true, remainingDays: 0 };
  }

  const currentPrice = PRICES[currentPlan as keyof typeof PRICES] || 0;
  const newPrice = PRICES[newPlan as keyof typeof PRICES] || 0;

  // Calculer les jours restants dans le mois
  const start = new Date(subscriptionStart);
  const now = new Date();
  const billingDate = new Date(start);
  billingDate.setMonth(billingDate.getMonth() + 1);

  const totalDaysInPeriod = 30; // Moyenne
  const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(0, totalDaysInPeriod - daysElapsed);

  // Calculer le prorata
  const priceDiff = newPrice - currentPrice;
  const prorataAmount = (priceDiff * remainingDays) / totalDaysInPeriod;
  const prorataPercent = (remainingDays / totalDaysInPeriod) * 100;

  const isUpgrade = PLAN_ORDER.indexOf(newPlan) > PLAN_ORDER.indexOf(currentPlan);

  return {
    prorataAmount: Math.abs(prorataAmount),
    prorataPercent: Math.round(prorataPercent),
    isUpgrade,
    remainingDays,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { plan, userId, yearly = false } = await req.json();
    const interval = yearly ? 'yearly' : 'monthly';

    if (!PRICE_IDS[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = PRICE_IDS[plan][interval];
    if (!priceId) {
      return NextResponse.json({ error: `Missing ${interval} price for ${plan}` }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const supabase = createAdminClient();

    // Récupérer le profil utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Créer ou récupérer le client Stripe
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email,
        metadata: { userId }
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    // Vérifier si l'utilisateur a déjà une souscription
    const currentSubscriptionId = profile?.subscription_id;
    let prorataInfo = null;

    // Récupérer les prix pour calculer le prorata
    const currentPlan = profile?.subscription_tier;
    const subscriptionStart = profile?.subscription_start_date || new Date().toISOString();

    if (currentSubscriptionId && currentPlan && currentPlan !== 'free') {
      try {
        // Récupérer la souscription actuelle
        const currentSubscription = await stripe.subscriptions.retrieve(currentSubscriptionId);

        // Calculer le prorata
        prorataInfo = calculateProrata(currentPlan, plan, subscriptionStart);

        // Si c'est un upgrade avec prorata positif, on crée une session de paiement
        // avec le montant ajusté
        if (prorataInfo.isUpgrade && prorataInfo.prorataAmount > 0) {
          // Créer une session de paiement pour le montant du prorata
          const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
              {
                price: priceId,
                quantity: 1,
              },
            ],
            subscription_data: {
              metadata: {
                userId,
                upgradeFrom: currentPlan,
                upgradeFromSub: currentSubscriptionId,
              },
              trial_period_days: 0, // Pas d'essai pour les upgrades
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invoices?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/paywall`,
          });

          return NextResponse.json({
            url: session.url,
            prorata: prorataInfo,
            sessionId: session.id,
          });
        } else {
          // Pour les downgrades ou upgrades sans frais immédiats,
          // on modifie la souscription existante
          await stripe.subscriptions.update(currentSubscriptionId, {
            items: [{
              id: currentSubscription.items.data[0].id,
              price: priceId,
            }],
            proration_behavior: 'create_prorations',
          });

          // Mettre à jour le profil
          await supabase.from('profiles').update({
            subscription_tier: plan,
          }).eq('id', userId);

          return NextResponse.json({
            success: true,
            prorata: prorataInfo,
            message: 'Abonnement mis à jour avec succès',
          });
        }
      } catch (stripeError: unknown) {
        const se = stripeError as Error;
        console.error('[change-subscription] Erreur Stripe:', se.message);
        // Si la souscription n'existe plus ou est invalide, on continue avec une nouvelle souscription
      }
    }

    // Nouvelle souscription (pas d'upgrade)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent | null;
    const clientSecret = paymentIntent?.client_secret ?? null;

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
      prorata: prorataInfo,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('[change-subscription] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET - Récupérer les informations de prorata pour un changement de plan
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const newPlan = searchParams.get('plan');

    if (!userId || !newPlan) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentPlan = profile?.subscription_tier;
    const subscriptionStart = profile?.subscription_start_date || new Date().toISOString();

    const prorataInfo = calculateProrata(
      currentPlan || 'free',
      newPlan,
      subscriptionStart
    );

    // Calculer les prix
    const currentPrice = currentPlan && currentPlan !== 'free' ? PRICES[currentPlan as keyof typeof PRICES] : 0;
    const newPrice = PRICES[newPlan as keyof typeof PRICES] || 0;

    return NextResponse.json({
      currentPlan,
      currentPrice,
      newPlan,
      newPrice,
      ...prorataInfo,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('[change-subscription] GET Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
