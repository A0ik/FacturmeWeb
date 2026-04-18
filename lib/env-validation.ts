/**
 * Environment variable validation
 * Validates all required environment variables at startup
 */

const requiredEnvVars = {
  // Supabase (always required)
  NEXT_PUBLIC_SUPABASE_URL: 'Supabase URL',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Supabase anonymous key',
  SUPABASE_SERVICE_ROLE_KEY: 'Supabase service role key',

  // Stripe (required for payments)
  STRIPE_SECRET_KEY: 'Stripe secret key',
  STRIPE_WEBHOOK_SECRET: 'Stripe webhook secret',

  // Groq (required for voice transcription)
  GROQ_API_KEY: 'Groq API key',

  // OpenRouter (required for AI parsing)
  OPENROUTER_API_KEY: 'OpenRouter API key',

  // Brevo (required for emails)
  BREVO_API_KEY: 'Brevo API key',
  BREVO_SENDER_EMAIL: 'Brevo sender email',

  // App URL
  NEXT_PUBLIC_APP_URL: 'App URL',

  // VAPID (required for push notifications)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'VAPID public key',
  VAPID_PRIVATE_KEY: 'VAPID private key',
  VAPID_SUBJECT: 'VAPID subject email',
} as const;

const optionalEnvVars = {
  // Optional: Stripe Price IDs (can be set dynamically)
  STRIPE_SOLO_MONTHLY_PRICE_ID: 'Stripe Solo Monthly Price ID',
  STRIPE_SOLO_YEARLY_PRICE_ID: 'Stripe Solo Yearly Price ID',
  STRIPE_PRO_MONTHLY_PRICE_ID: 'Stripe Pro Monthly Price ID',
  STRIPE_PRO_YEARLY_PRICE_ID: 'Stripe Pro Yearly Price ID',
  STRIPE_CLIENT_ID: 'Stripe Connect Client ID',

  // Optional: Sumup (alternative payment provider)
  SUMUP_API_KEY: 'Sumup API key',
  SUMUP_CLIENT_ID: 'Sumup Client ID',
  SUMUP_CLIENT_SECRET: 'Sumup Client Secret',
  SUMUP_WEBHOOK_SECRET: 'Sumup webhook secret',

  // Optional: Chorus Pro (public sector billing)
  CHORUS_PRO_CLIENT_ID: 'Chorus Pro Client ID',
  CHORUS_PRO_CLIENT_SECRET: 'Chorus Pro Client Secret',
  CHORUS_PRO_LOGIN: 'Chorus Pro Login',
  CHORUS_PRO_PASSWORD: 'Chorus Pro Password',
} as const;

const missingVars: string[] = [];
const warnings: string[] = [];

function validate() {
  // Check required variables
  for (const [key, description] of Object.entries(requiredEnvVars)) {
    if (!process.env[key]) {
      missingVars.push(`${key} (${description})`);
    }
  }

  // Check optional variables and warn if missing
  for (const [key, description] of Object.entries(optionalEnvVars)) {
    if (!process.env[key]) {
      warnings.push(`${key} (${description})`);
    }
  }

  // Log results
  if (missingVars.length > 0) {
    console.error('\n❌ CRITICAL: Missing required environment variables:');
    missingVars.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease add these variables to your .env file.\n');
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Warning: Optional environment variables not set:');
    warnings.forEach(w => console.warn(`   - ${w}`));
    console.warn('\nThese are optional but may limit functionality.\n');
  }

  console.log('✅ All required environment variables are validated.');
}

export function validateEnv() {
  // Only validate in production or if explicitly enabled
  if (process.env.NODE_ENV === 'production' || process.env.VALIDATE_ENV === 'true') {
    validate();
  }
}

export { requiredEnvVars, optionalEnvVars };
