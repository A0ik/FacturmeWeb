'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Zap, ArrowRight, LogIn, Menu, Star, PlayCircle, AlertTriangle, Clock, TrendingDown, Puzzle, Layers, FileText, Sparkles, Send, Users, Calculator, LayoutGrid, Mic, Type, Pencil, ScanText, Camera, Tag, Link as LinkIcon, ShieldCheck, CreditCard, CheckCircle, ChevronDown, HelpCircle, MessageCircle, Lock, Rocket, Check, X, Minus, Palette, Building2, Code2, Store, Briefcase, HeartPulse, Share2, Twitter, Linkedin, Github, MailCheck, Calendar, Package, Truck, FileClock, Globe, Smartphone, Cloud, Shield, FileBadge, Scale, Eye
} from 'lucide-react';

/* ─── Particles Canvas ─── */
function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext('2d'); if (!ctx) return;
    const isMobile = window.innerWidth < 768;
    const isXL = window.innerWidth >= 1280;
    const is2XL = window.innerWidth >= 1536;
    const count = isMobile ? 20 : isXL ? (is2XL ? 80 : 65) : 45;
    const connections = !isMobile;
    let w = 0, h = 0;
    const resize = () => { const p = cvs.parentElement; if (p) { w = cvs.width = p.offsetWidth; h = cvs.height = p.offsetHeight; } };
    resize();
    const ro = new ResizeObserver(resize); if (cvs.parentElement) ro.observe(cvs.parentElement);
    const ps: { x: number; y: number; s: number; vx: number; vy: number; o: number; l: number; ml: number }[] = [];
    for (let i = 0; i < count; i++) { const l = Math.random() * 200 + 100; ps.push({ x: Math.random() * w, y: Math.random() * h, s: Math.random() * (isXL ? 2.5 : 1.5) + 0.5, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, o: Math.random() * 0.4 + 0.1, l, ml: l }); }
    const reset = (p: typeof ps[0]) => { p.x = Math.random() * w; p.y = Math.random() * h; p.s = Math.random() * (isXL ? 2.5 : 1.5) + 0.5; p.vx = (Math.random() - 0.5) * 0.3; p.vy = (Math.random() - 0.5) * 0.3; p.o = Math.random() * 0.4 + 0.1; p.l = Math.random() * 200 + 100; p.ml = p.l; };
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ps.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.l--;
        if (p.l <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) reset(p);
        const a = (p.l / p.ml) * p.o;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fillStyle = `rgba(52,211,153,${a})`; ctx.fill();
        if (connections) { for (let j = i + 1; j < ps.length; j++) { const dx = p.x - ps[j].x, dy = p.y - ps[j].y, d = Math.sqrt(dx * dx + dy * dy); if (d < (isXL ? 150 : 120)) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ps[j].x, ps[j].y); ctx.strokeStyle = `rgba(52,211,153,${0.05 * (1 - d / (isXL ? 150 : 120))})`; ctx.lineWidth = isXL ? 0.75 : 0.5; ctx.stroke(); } } }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />;
}

/* ─── 3D Card Wrapper ─── */
function Card3D({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof window !== 'undefined' && 'ontouchstart' in window) return;
    const el = ref.current; if (!el) return;
    const isXL = window.innerWidth >= 1280;
    const is2XL = window.innerWidth >= 1536;
    const tiltAmount = is2XL ? 10 : isXL ? 8 : 7;
    const scaleAmount = is2XL ? 1.03 : 1.02;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const rx = ((e.clientY - r.top - r.height / 2) / (r.height / 2)) * -tiltAmount;
      const ry = ((e.clientX - r.left - r.width / 2) / (r.width / 2)) * tiltAmount;
      el.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(${scaleAmount},${scaleAmount},1)`;
    };
    const onLeave = () => { el.style.transform = 'perspective(1200px) rotateX(0) rotateY(0) scale3d(1,1,1)'; };
    el.addEventListener('mousemove', onMove); el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, []);
  return <div className="card-3d"><div ref={ref} className={`card-3d-inner transition-transform duration-500 ease-out ${className}`} style={{ transformStyle: 'preserve-3d' }}>{children}</div></div>;
}

/* ─── Voice Bars ─── */
function VoiceBars() {
  const [heights, setHeights] = useState<number[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Generate random heights only on client
    setHeights([0, 1, 2, 3, 4, 5].map(() => 10 + Math.random() * 16));
  }, []);

  if (!isClient) {
    // Return placeholder bars on server to avoid hydration mismatch
    return (
      <>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="w-[2.5px] sm:w-[2.5px] lg:w-[3px] bg-brand-400 rounded-full" style={{ height: '16px' }} />
        ))}
      </>
    );
  }

  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="w-[2.5px] sm:w-[2.5px] lg:w-[3px] bg-brand-400 rounded-full" style={{ height: `${heights[i] || 16}px`, animation: `voicePulse${(i % 3) + 1} 1s ease-in-out infinite`, animationDelay: `${i * 0.08}s` }} />
      ))}
    </>
  );
}

/* ─── Scroll Reveal ─── */
function ScrollReveal({ children, direction = 'up', delay = 0 }: { children: React.ReactNode; direction?: 'up' | 'down' | 'left' | 'right' | 'scale'; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(e.target); } }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  const tf = direction === 'up' ? 'translateY(40px)' : direction === 'down' ? 'translateY(-25px)' : direction === 'left' ? 'translateX(-50px)' : direction === 'right' ? 'translateX(50px)' : 'scale(0.85)';
  return <div ref={ref} className={`transition-all duration-700 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`} style={{ transform: visible ? 'none' : tf, transitionDelay: `${delay}s` }}>{children}</div>;
}

/* ─── Animated Counter ─── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { let cur = 0; const inc = target / 35; const t = setInterval(() => { cur += inc; if (cur >= target) { cur = target; clearInterval(t); } setCount(Math.round(cur)); }, 25); obs.unobserve(e.target); } }, { threshold: 0.5 });
    obs.observe(el); return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─── FAQ Item ─── */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors">
        <span className="font-semibold text-base pr-4">{question}</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-400 ease-in-out ${open ? 'max-h-40 px-5 pb-5' : 'max-h-0'}`}>
        <p className="text-sm text-slate-500 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    const onScroll = () => { setScrolled(window.scrollY > 50); setShowStickyCta(window.scrollY > 600); };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.querySelector(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 80, behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const features = [
    { icon: FileText, title: 'Facturation multi-documents', desc: 'Factures, devis, avoirs, bons de commande, bons de livraison, factures d\'acompte.' },
    { icon: Sparkles, title: 'Intelligence Artificielle', desc: 'Dictez ou décrivez votre facture. L\'IA remplit tout et comprend les modifications.' },
    { icon: Send, title: 'Envoi et suivi', desc: 'E-mail avec PDF, liens de paiement, portail client, relances automatiques, signature.' },
    { icon: Users, title: 'CRM intégré', desc: 'Fiches clients, import CSV, auto-complétion SIRET, tags, historique et pipeline de vente.' },
    { icon: Calculator, title: 'Comptabilité', desc: 'Export officiel pour les impôts, suivi des dépenses, scan de reçus, rapprochement bancaire.' },
    { icon: LayoutGrid, title: 'Espace collaboratif', desc: 'Jusqu\'à 10 espaces de travail isolés, rôles, flux d\'activité et notifications.' },
    { icon: Calendar, title: 'Gestion de planning', desc: 'Calendrier intégré pour suivre vos échéances et relances.' },
    { icon: Package, title: 'Catalogue produits', desc: 'Créez votre catalogue de produits/services pour une facturation plus rapide.' },
    { icon: Truck, title: 'Fournisseurs', desc: 'Gérez vos dépenses et vos fournisseurs en un seul endroit.' },
    { icon: FileClock, title: 'Factures récurrentes', desc: 'Automatisez vos factures récurrentes avec un seul clic.' }
  ];

  const testimonials = [
    { name: 'Sarah M.', role: 'Développeuse freelance', text: 'Je passais 2h par mois sur mes factures. Depuis Factu.me, je dicte en 10 secondes et c\'est envoyé. Un gain de temps énorme.', avatar: 'sarah-m' },
    { name: 'Thomas L.', role: 'Auto-entrepreneur, transport', text: 'Le scan de reçus est bluffant. Je photographie mes tickets essence et c\'est directement catégorisé. Mon comptable est impressionné.', avatar: 'thomas-l' },
    { name: 'Claire D.', role: 'Directrice, agence digitale', text: 'On était 4 dans l\'agence, chacun avait son outil. Aujourd\'hui on est tous sur Factu.me avec des workspaces séparés.', avatar: 'claire-d' }
  ];

  const faqItems = [
    { q: 'Est-ce vraiment gratuit ?', a: 'Oui, le plan Gratuit est gratuit pour toujours avec 3 factures par mois, sans carte bancaire requise. Vous pouvez passer à un plan payant quand vous en avez besoin, sans engagement.' },
    { q: 'Mes données sont-elles en sécurité ?', a: 'Absolument. Vos données sont chiffrées, hébergées en France, et chaque utilisateur ne peut accéder qu\'à ses propres données. Vous pouvez exporter ou supprimer vos données à tout moment.' },
    { q: 'Puis-je récupérer mes données si je veux quitter ?', a: 'Oui, conformément au RGPD vous pouvez télécharger l\'intégralité de vos données à tout moment ou demander la suppression totale de votre compte.' },
    { q: 'L\'IA comprend-elle vraiment ce que je dis ?', a: 'Oui, l\'IA est entraînée pour comprendre le français naturel. Vous pouvez dire "5 jours de dev à 600€" et elle créera la facture complète.' },
    { q: 'Est-ce conforme pour les impôts français ?', a: 'Oui, les mentions légales sont ajoutées automatiquement. L\'export officiel pour les impôts est disponible sur les plans Pro et Business.' }
  ];

  const plans = [
    { name: 'Gratuit', price: '0€', period: 'Pour toujours', features: ['3 factures / mois', 'Clients illimités', '6 templates PDF', 'Envoi par e-mail', 'Paiement en ligne'], popular: false },
    { name: 'Solo', price: '9,99€', period: '/mois', features: ['Factures illimitées', 'Clients illimités', 'IA et dictée vocale', 'Scan de reçus', 'Import bancaire'], popular: false },
    { name: 'Pro', price: '19,99€', period: '/mois', features: ['Tout du plan Solo', 'Export officiel impôts', 'CRM Pipeline', 'Factures récurrentes', 'Signature électronique'], popular: true },
    { name: 'Business', price: '39,99€', period: '/mois', features: ['Tout du plan Pro', '10 espaces de travail', 'Multi-utilisateurs', 'API et Webhooks', 'Support prioritaire'], popular: false }
  ];

  return (
    <div className="font-sans bg-white text-slate-900 antialiased overflow-x-hidden min-h-screen">

      {/* Progress bar */}
      <div className="fixed top-0 left-0 h-1 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 z-[100] origin-left" style={{ width: scrolled ? '100%' : '0%', transition: 'width 0.3s' }} />

      {/* Sticky mobile CTA */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 p-3 transition-transform duration-300 sm:hidden ${showStickyCta ? 'translate-y-0' : 'translate-y-full'}`}>
        <a href="#tarifs" onClick={(e) => scrollTo(e, '#tarifs')} className="flex items-center justify-center gap-2 bg-brand-500 text-white font-semibold py-3 rounded-2xl shadow-xl shadow-brand-500/30 text-sm">
          <Zap className="w-4 h-4" />Commencer gratuitement
        </a>
      </div>

      {/* ═══════════ NAVBAR ═══════════ */}
      <nav className={`fixed top-2 sm:top-3 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto z-50 backdrop-blur-2xl bg-white/90 rounded-full border transition-all duration-300 sm:max-w-[680px] lg:max-w-[800px] xl:max-w-[900px] px-3 sm:px-5 py-2 sm:py-2.5 ${scrolled ? 'border-brand-200/60 shadow-lg shadow-brand-500/8' : 'border-brand-100/30 shadow-md shadow-black/[0.03]'}`}>
        <div className="flex items-center justify-between gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-brand-500 rounded-lg flex items-center justify-center"><Zap className="w-4 h-4 sm:w-4.5 sm:h-4.5 lg:w-5 lg:h-5 text-white" /></div>
            <span className="text-base sm:text-lg lg:text-xl font-bold tracking-tight">Factu<span className="text-brand-500">.me</span></span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <a href="#features" onClick={(e) => scrollTo(e, '#features')} className="text-[13px] sm:text-sm lg:text-base font-medium text-slate-500 hover:text-brand-600 transition-colors">Fonctionnalités</a>
            <a href="#ai" onClick={(e) => scrollTo(e, '#ai')} className="text-[13px] sm:text-sm lg:text-base font-medium text-slate-500 hover:text-brand-600 transition-colors">IA</a>
            <a href="#tarifs" onClick={(e) => scrollTo(e, '#tarifs')} className="text-[13px] sm:text-sm lg:text-base font-medium text-slate-500 hover:text-brand-600 transition-colors">Tarifs</a>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex items-center gap-1.5 text-[13px] sm:text-sm lg:text-base font-medium text-slate-600 hover:text-brand-600 transition-colors px-2.5 py-1.5 rounded-full hover:bg-brand-50">
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span>Connexion</span>
            </Link>
            <Link href="/register" className="inline-flex items-center gap-1.5 text-[13px] sm:text-sm lg:text-base font-semibold text-white bg-brand-500 hover:bg-brand-600 px-3.5 py-1.5 rounded-full transition-all shadow-md shadow-brand-500/20 active:scale-[0.97]">
              <span className="hidden sm:inline">Essai gratuit</span><span className="sm:hidden">Essai</span><ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-1.5 rounded-full hover:bg-brand-50 transition-colors">
              <Menu className="w-4.5 h-4.5 text-slate-600" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="fixed top-14 sm:top-16 left-2 right-2 sm:left-4 sm:right-4 z-50 md:hidden backdrop-blur-2xl bg-white/95 rounded-2xl border border-brand-100/30 shadow-xl shadow-black/[0.06] overflow-hidden">
          <div className="px-4 py-3 space-y-1">
            <a href="#features" onClick={(e) => scrollTo(e, '#features')} className="block text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-brand-50 py-2.5 px-3 rounded-xl transition-colors">Fonctionnalités</a>
            <a href="#ai" onClick={(e) => scrollTo(e, '#ai')} className="block text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-brand-50 py-2.5 px-3 rounded-xl transition-colors">Intelligence Artificielle</a>
            <a href="#tarifs" onClick={(e) => scrollTo(e, '#tarifs')} className="block text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-brand-50 py-2.5 px-3 rounded-xl transition-colors">Tarifs</a>
            <div className="pt-2 border-t border-slate-100 mt-1">
              <Link href="/login" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-brand-50 py-2.5 px-3 rounded-xl transition-colors">
                <LogIn className="w-4 h-4" />Se connecter
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative min-h-[100dvh] flex flex-col justify-center overflow-hidden bg-brand-950 pt-24 pb-16 sm:pt-0 sm:pb-0">
        <div className="absolute inset-0">
          {/* Blob 1 — top left, ULTRA MASSIVE for 4K */}
          <div className="absolute top-[-40%] left-[-30%] w-[140vw] sm:w-[1100px] md:w-[1500px] lg:w-[2000px] xl:w-[2400px] 2xl:w-[2800px] h-[140vw] sm:h-[1100px] md:h-[1500px] lg:h-[2000px] xl:h-[2400px] 2xl:h-[2800px] bg-brand-500/15 rounded-full blur-[180px] sm:blur-[250px] lg:blur-[300px] animate-[blob_15s_ease-in-out_infinite]" />
          {/* Blob 2 — bottom right, ULTRA MASSIVE for 4K */}
          <div className="absolute bottom-[-40%] right-[-30%] w-[120vw] sm:w-[1000px] md:w-[1400px] lg:w-[1800px] xl:w-[2200px] 2xl:w-[2600px] h-[120vw] sm:h-[1000px] md:h-[1400px] lg:h-[1800px] xl:h-[2200px] 2xl:h-[2600px] bg-brand-400/12 rounded-full blur-[160px] sm:blur-[220px] lg:blur-[280px] animate-[blob_15s_ease-in-out_infinite]" style={{ animationDelay: '-5s' }} />
          {/* Blob 3 — center glow, ULTRA MASSIVE for 4K */}
          <div className="absolute top-[25%] left-[25%] w-[70vw] sm:w-[700px] md:w-[1000px] lg:w-[1400px] xl:w-[1800px] 2xl:w-[2200px] h-[70vw] sm:h-[700px] md:h-[1000px] lg:h-[1400px] xl:h-[1800px] 2xl:h-[2200px] bg-brand-500/8 rounded-full blur-[120px] sm:blur-[180px] lg:blur-[250px] animate-[blob_15s_ease-in-out_infinite]" style={{ animationDelay: '-10s' }} />
          {/* Blob 4 — extra glow for 4K impact */}
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[40vw] sm:w-[500px] md:w-[800px] lg:w-[1200px] xl:w-[1600px] h-[40vw] sm:h-[500px] md:h-[800px] lg:h-[1200px] xl:h-[1600px] bg-brand-400/5 rounded-full blur-[100px] sm:blur-[150px] lg:blur-[200px] animate-[blob_15s_ease-in-out_infinite]" style={{ animationDelay: '-2s' }} />
          {/* Gradient overlay for extra depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-950/20 to-brand-950/40" />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)', backgroundSize: '50px 50px' }} />
          <ParticlesCanvas />
        </div>

        <div className="max-w-7xl xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-10 xl:px-12 py-4 sm:py-8 lg:py-10 xl:py-12 relative z-10 w-full">
          <div className="grid lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 xl:gap-14 2xl:gap-16 items-center">
            {/* Text */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-7 lg:space-y-8 xl:space-y-9 order-2 lg:order-1 text-center lg:text-left">
              <ScrollReveal direction="down">
                <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-3 sm:px-4 xl:px-5 py-1.5 sm:py-2 xl:py-2.5 text-[11px] sm:text-sm xl:text-base font-medium text-brand-300">
                  <span className="relative flex h-2 w-2 xl:h-2.5 xl:w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 xl:h-2.5 xl:w-2.5 bg-brand-400" /></span>
                  100% Français <Zap className="w-3 h-3 sm:w-4 sm:h-4 xl:w-5 xl:h-5 text-brand-400" />
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.1}>
                <h1 className="text-[1.85rem] leading-[1.1] sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-extrabold tracking-tight">
                  <span className="text-white">La facturation</span><br />
                  <span className="gradient-text-light">propulsée</span>
                  <span className="text-white"> par</span><br />
                  <span className="gradient-text-light">l&apos;IA</span>
                  <Zap className="inline-block w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 lg:w-10 lg:h-10 xl:w-12 xl:h-12 text-brand-400 ml-1 sm:ml-2 md:ml-3 lg:ml-3 animate-[wiggle_2s_ease-in-out_infinite]" />
                </h1>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <div className="space-y-4 sm:space-y-5 xl:space-y-6">
                  <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl text-brand-200/70 leading-relaxed max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto lg:mx-0">Créez vos factures en dictant à voix haute. L&apos;IA fait tout le reste.</p>
                  {/* Voice bars */}
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 lg:gap-2.5 bg-white/5 border border-white/10 rounded-2xl px-3 sm:px-3.5 lg:px-4 py-3 sm:py-4 lg:py-5 max-w-[280px] sm:max-w-[320px] lg:max-w-[360px] mx-auto lg:mx-0 backdrop-blur">
                    <div className="flex items-end gap-[1.5px] sm:gap-2 lg:gap-[2px] h-[22px] sm:h-[26px] lg:h-[32px] overflow-hidden">
                      <VoiceBars />
                    </div>
                    <Mic className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-brand-400 flex-shrink-0" />
                    <div className="flex items-end gap-[1.5px] sm:gap-2 lg:gap-[2px] h-[22px] sm:h-[26px] lg:h-[32px] overflow-hidden">
                      <VoiceBars />
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.3}>
                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 lg:gap-5 mx-auto lg:mx-0 max-w-sm sm:max-w-none">
                  <Link href="/register" className="group inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold px-5 py-3 sm:px-8 sm:py-4 lg:px-10 lg:py-4.5 rounded-2xl transition-all shadow-xl shadow-brand-500/30 hover:shadow-2xl active:scale-[0.97] text-[13px] sm:text-base lg:text-lg relative overflow-hidden">
                    <span className="relative z-10">Commencer gratuitement</span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 relative z-10 group-hover:translate-x-1 transition-transform" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_ease-in-out]" />
                  </Link>
                  <a href="#features" onClick={(e) => scrollTo(e, '#features')} className="group inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-medium px-5 py-3 sm:px-8 sm:py-4 lg:px-10 lg:py-4.5 rounded-2xl transition-all border border-white/10 hover:border-white/20 text-[13px] sm:text-base lg:text-lg backdrop-blur">
                    <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-brand-400" />Voir la démo
                  </a>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.4}>
                <div className="flex items-center justify-center lg:justify-start gap-3 sm:gap-4 lg:gap-5 text-[10px] sm:text-[11px] lg:text-[12px] text-brand-200/30">
                  <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 lg:w-4 lg:h-4" />France</span>
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3 lg:w-4 lg:h-4" />SSL</span>
                  <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 lg:w-4 lg:h-4" />RGPD</span>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.5}>
                <div className="flex items-center gap-3 sm:gap-5 lg:gap-6 pt-1 justify-center lg:justify-start">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <img key={i} src={`https://picsum.photos/seed/face${i}/36/36.jpg`} className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full border-2 border-brand-950 object-cover" alt="" />
                    ))}
                    <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full border-2 border-brand-950 bg-brand-500/20 flex items-center justify-center text-[9px] sm:text-[10px] lg:text-[11px] font-bold text-brand-300">+2k</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 text-white fill-white" />)}</div>
                    <div className="text-[10px] sm:text-[11px] lg:text-[12px] text-brand-300/40 mt-0.5">2 000+ entrepreneurs</div>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* 3D Invoice V2 */}
            <div className="lg:col-span-5 relative order-1 lg:order-2 flex justify-center items-center px-2 sm:px-0">
              <ScrollReveal direction="scale" delay={0.3}>
                <div className="relative w-full max-w-[280px] sm:max-w-[380px] md:max-w-[450px] lg:max-w-[500px] xl:max-w-[550px] 2xl:max-w-[600px]">
                  {/* Background glow */}
                  <div className="absolute -inset-3 sm:-inset-4 md:-inset-5 lg:-inset-6 bg-brand-500/10 rounded-[2rem] blur-[30px] sm:blur-[40px] md:blur-[50px] lg:blur-[60px] animate-[blob_15s_ease-in-out_infinite]" />

                  {/* Main floating wrapper */}
                  <div className="relative animate-[heroFloat_8s_ease-in-out_infinite]" style={{ transformStyle: 'preserve-3d', filter: 'drop-shadow(0 0 60px rgba(16,185,129,.25)) drop-shadow(0 30px 60px rgba(0,0,0,.15))' }}>

                    {/* The invoice card */}
                    <div className="relative bg-white rounded-2xl sm:rounded-3xl overflow-hidden" style={{ transform: 'perspective(1200px) rotateY(-12deg) rotateX(3deg)' }}>

                      {/* Accent bar top */}
                      <div className="h-1 sm:h-1.5 lg:h-2 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />

                      {/* Browser chrome */}
                      <div className="bg-gradient-to-b from-slate-800 to-slate-900 px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 lg:py-2.5 flex items-center gap-2 sm:gap-2.5 lg:gap-3">
                        <div className="flex gap-1.5 sm:gap-2">
                          <div className="w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] md:w-3 md:h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-[#FF5F57]" />
                          <div className="w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] md:w-3 md:h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-[#FEBC2E]" />
                          <div className="w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] md:w-3 md:h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-[#28C840]" />
                        </div>
                        <div className="flex-1 bg-slate-700/80 rounded-md sm:rounded-lg px-2 sm:px-2.5 lg:px-3 py-0.5 sm:py-0.75 lg:py-1 flex items-center gap-1 sm:gap-1.25">
                          <Lock className="w-[9px] h-[9px] sm:w-[11px] sm:h-[11px] md:w-3 md:h-3 lg:w-3.5 lg:h-3.5 text-green-400 flex-shrink-0" />
                          <span className="text-[8px] sm:text-[10px] md:text-[11px] lg:text-[11px] text-slate-400 font-mono truncate">factu.me/invoice/FACT-2026-0042</span>
                        </div>
                      </div>

                      {/* Invoice body */}
                      <div className="p-3 sm:p-4 md:p-5 lg:p-6 space-y-2.5 sm:space-y-3 md:space-y-4 lg:space-y-5 bg-gradient-to-b from-white to-slate-50/50">

                        {/* Header row */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2 sm:gap-2.5">
                            <div className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 bg-brand-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-5.5 lg:h-5.5 text-white" />
                            </div>
                            <div>
                              <div className="font-bold text-[10px] sm:text-xs md:text-sm lg:text-sm text-slate-800">Martin Consulting</div>
                              <div className="text-[7px] sm:text-[9px] md:text-[10px] lg:text-xs text-slate-400">12 rue de la Paix, 75002</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-xs text-slate-400 uppercase tracking-wider font-semibold">Facture</div>
                            <div className="text-[8px] sm:text-[10px] md:text-[11px] lg:text-xs font-mono text-slate-600 font-semibold">FACT-2026-0042</div>
                            <div className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-xs text-slate-400 mt-0.5">19 avril 2026</div>
                          </div>
                        </div>

                        {/* Client + Status row */}
                        <div className="flex justify-between items-center bg-slate-50 rounded-lg sm:rounded-xl p-2 sm:p-2.5 lg:p-3">
                          <div>
                            <div className="text-[6px] sm:text-[8px] md:text-[9px] lg:text-xs text-slate-400 uppercase tracking-wider font-semibold">Client</div>
                            <div className="font-semibold text-[9px] sm:text-[11px] md:text-[13px] lg:text-sm text-slate-800">Dupont Consulting SAS</div>
                          </div>
                          <div className="inline-flex items-center gap-0.5 sm:gap-1 bg-green-50 text-green-700 text-[7px] sm:text-[9px] md:text-[10px] lg:text-xs font-bold px-1.5 sm:px-2 lg:px-2.5 py-0.5 sm:py-0.75 lg:py-1 rounded-full border border-green-200">
                            <CheckCircle className="w-[9px] h-[9px] sm:w-[11px] sm:h-[11px] md:w-3 md:h-3 lg:w-3.5 lg:h-3.5" />Payée
                          </div>
                        </div>

                        {/* Line items */}
                        <div className="overflow-hidden rounded-lg sm:rounded-xl border border-slate-200/80">
                          <div className="bg-slate-800 px-2 sm:px-3 md:px-4 lg:px-5 py-1.5 sm:py-2 lg:py-2 grid grid-cols-12 gap-1">
                            <span className="col-span-5 text-[6px] sm:text-[8px] md:text-[9px] lg:text-xs text-slate-400 uppercase tracking-wider font-semibold">Description</span>
                            <span className="col-span-2 text-right text-[6px] sm:text-[8px] md:text-[9px] lg:text-xs text-slate-400 uppercase tracking-wider font-semibold">Qté</span>
                            <span className="col-span-2 text-right text-[6px] sm:text-[8px] md:text-[9px] lg:text-xs text-slate-400 uppercase tracking-wider font-semibold">Prix</span>
                            <span className="col-span-3 text-right text-[6px] sm:text-[8px] md:text-[9px] lg:text-xs text-slate-400 uppercase tracking-wider font-semibold">Total</span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            <div className="px-2 sm:px-3 md:px-4 lg:px-5 py-2 sm:py-2.5 md:py-3 lg:py-3 grid grid-cols-12 gap-1 items-center bg-white">
                              <div className="col-span-5">
                                <div className="text-[8px] sm:text-[11px] md:text-[13px] lg:text-sm font-medium text-slate-800">Développement web</div>
                                <div className="text-[6px] sm:text-[8px] md:text-[9px] lg:text-xs text-slate-400">Site vitrine React</div>
                              </div>
                              <span className="col-span-2 text-right text-[8px] sm:text-[10px] md:text-[12px] lg:text-sm text-slate-500">5 j</span>
                              <span className="col-span-2 text-right text-[8px] sm:text-[10px] md:text-[12px] lg:text-sm text-slate-500">600 €</span>
                              <span className="col-span-3 text-right text-[8px] sm:text-[11px] md:text-[13px] lg:text-base font-bold text-slate-800">3 000 €</span>
                            </div>
                            <div className="px-2 sm:px-3 md:px-4 lg:px-5 py-2 sm:py-2.5 md:py-3 lg:py-3 grid grid-cols-12 gap-1 items-center bg-white">
                              <div className="col-span-5">
                                <div className="text-[8px] sm:text-[11px] md:text-[13px] lg:text-sm font-medium text-slate-800">Conseil UX/UI</div>
                                <div className="text-[6px] sm:text-[8px] md:text-[9px] lg:text-xs text-slate-400">Design système</div>
                              </div>
                              <span className="col-span-2 text-right text-[8px] sm:text-[10px] md:text-[12px] lg:text-sm text-slate-500">2 j</span>
                              <span className="col-span-2 text-right text-[8px] sm:text-[10px] md:text-[12px] lg:text-sm text-slate-500">400 €</span>
                              <span className="col-span-3 text-right text-[8px] sm:text-[11px] md:text-[13px] lg:text-base font-bold text-slate-800">800 €</span>
                            </div>
                          </div>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end">
                          <div className="w-[55%] sm:w-[50%] lg:w-[45%] space-y-0.5 sm:space-y-1">
                            <div className="flex justify-between text-[7px] sm:text-[10px] md:text-[11px] lg:text-xs text-slate-400 px-1"><span>Total HT</span><span className="text-slate-600">3 800,00 €</span></div>
                            <div className="flex justify-between text-[7px] sm:text-[10px] md:text-[11px] lg:text-xs text-slate-400 px-1"><span>TVA 20%</span><span className="text-slate-600">760,00 €</span></div>
                            <div className="flex justify-between items-center bg-brand-500 text-white rounded-lg sm:rounded-xl px-2 sm:px-3 lg:px-3.5 py-1.5 sm:py-2 lg:py-2.5 mt-1">
                              <span className="text-[8px] sm:text-[11px] md:text-[13px] lg:text-sm font-bold">Total TTC</span>
                              <span className="text-[10px] sm:text-sm md:text-base lg:text-lg font-extrabold">4 560 €</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-1 text-[6px] sm:text-[8px] md:text-[9px] lg:text-xs text-slate-300">
                            <ShieldCheck className="w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] md:w-3 md:h-3 lg:w-3.5 lg:h-3.5" />Paiement sécurisé
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="h-3 sm:h-4 md:h-5 lg:h-5.5 px-1 sm:px-1.5 bg-slate-800 rounded-[2px] sm:rounded-[3px] flex items-center justify-center">
                              <span className="text-[5px] sm:text-[7px] md:text-[8px] lg:text-[9px] font-bold text-white tracking-wider">VISA</span>
                            </div>
                            <div className="h-3 sm:h-4 md:h-5 lg:h-5.5 px-1 sm:px-1.5 bg-brand-500 rounded-[2px] sm:rounded-[3px] flex items-center justify-center">
                              <span className="text-[4px] sm:text-[6px] md:text-[7px] lg:text-[8px] font-bold text-white">stripe</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating badge: IA Active */}
                  <div className="absolute -top-2 -right-1 sm:-top-3 sm:-right-3 md:-top-4 md:-right-4 lg:-top-5 lg:-right-5 animate-[float_6s_ease-in-out_infinite] z-20" style={{ animationDelay: '0.5s' }}>
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl shadow-brand-500/15 px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-2.5 flex items-center gap-2 sm:gap-2.5 border border-brand-100/50">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:w-8 lg:w-9 lg:h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-brand-500/30">
                        <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-4.5 lg:h-4.5 text-white" />
                      </div>
                      <div>
                        <div className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] font-bold text-slate-800">IA Active</div>
                        <div className="text-[6px] sm:text-[7px] md:text-[8px] lg:text-[9px] text-brand-500 font-semibold">Générée en 3s</div>
                      </div>
                    </div>
                  </div>

                  {/* Floating badge: Payée */}
                  <div className="absolute -bottom-2 -left-1 sm:-bottom-3 sm:-left-3 md:-bottom-4 md:-left-4 lg:-bottom-5 lg:-left-5 animate-[float_6s_ease-in-out_infinite] z-20" style={{ animationDelay: '1.5s' }}>
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl shadow-brand-500/15 px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-2.5 flex items-center gap-2 sm:gap-2.5 border border-brand-100/50">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:w-8 lg:w-9 lg:h-9 bg-gradient-to-br from-green-400 to-green-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-green-500/30">
                        <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-4.5 lg:h-4.5 text-white" />
                      </div>
                      <div>
                        <div className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] font-bold text-slate-800">Payée</div>
                        <div className="text-[6px] sm:text-[7px] md:text-[8px] lg:text-[9px] text-green-500 font-semibold">via Stripe</div>
                      </div>
                    </div>
                  </div>

                  {/* Floating badge: Amount (desktop only) */}
                  <div className="hidden sm:block absolute top-1/2 -translate-y-1/2 -right-2 md:-right-3 lg:-right-4 animate-[float_6s_ease-in-out_infinite] z-20" style={{ animationDelay: '2.5s' }}>
                    <div className="bg-brand-950/90 backdrop-blur-sm rounded-xl sm:rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 lg:px-3.5 lg:py-2.5 border border-brand-800/50 shadow-xl shadow-brand-500/10">
                      <div className="text-[8px] sm:text-[9px] lg:text-[10px] text-brand-300/60 font-medium">Montant</div>
                      <div className="text-xs sm:text-sm md:text-base lg:text-lg font-extrabold text-white">4 560€</div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full"><path d="M0 30C360 60 720 60 1080 40C1260 30 1380 25 1440 30V60H0V30Z" fill="white" /></svg>
        </div>
      </section>

      {/* ═══════════ STATS ═══════════ */}
      <section className="py-6 sm:py-10 lg:py-12 bg-white relative z-10">
        <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 lg:gap-10">
            {[{ target: 6, label: 'Types de documents' }, { target: 6, label: 'Templates PDF' }].map((s, i) => (
              <div key={i} className="text-center">
                <ScrollReveal delay={i * 0.1}><div className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-slate-900 tracking-tight"><Counter target={s.target} /></div><div className="text-xs sm:text-sm lg:text-base xl:text-lg text-slate-400 mt-1 font-medium">{s.label}</div></ScrollReveal>
              </div>
            ))}
            <div className="text-center"><ScrollReveal delay={0.2}><div className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-brand-500 tracking-tight">3<span className="text-base sm:text-lg lg:text-xl xl:text-2xl">s</span></div><div className="text-xs sm:text-sm lg:text-base xl:text-lg text-slate-400 mt-1 font-medium">Facturation par IA</div></ScrollReveal></div>
            <div className="text-center"><ScrollReveal delay={0.3}><div className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-slate-900 tracking-tight"><Counter target={100} suffix="%" /></div><div className="text-xs sm:text-sm lg:text-base xl:text-lg text-slate-400 mt-1 font-medium">Conforme droit FR</div></ScrollReveal></div>
          </div>
        </div>
      </section>

      {/* ═══════════ TRUST ═══════════ */}
      <section className="py-10 sm:py-14 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mb-6 uppercase tracking-wider">Ils nous font confiance</p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12">
              {[{ icon: Building2, label: 'Auto-entrepreneurs' }, { icon: Code2, label: 'Freelances' }, { icon: Store, label: 'TPE / PME' }, { icon: Briefcase, label: 'Consultants' }, { icon: Palette, label: 'Agences' }, { icon: HeartPulse, label: 'Santé' }].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-slate-300"><Icon className="w-5 h-5" /><span className="text-sm font-semibold">{label}</span></div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════ PROBLEM ═══════════ */}
      <section className="py-16 sm:py-24 lg:py-32 bg-slate-50">
        <div className="max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 rounded-full px-3.5 py-1.5 text-xs sm:text-sm lg:text-base font-medium text-red-600 mb-4"><AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5" />Le problème</div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight mb-4">Vous perdez des heures sur l&apos;administratif</h2>
              <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-slate-500 max-w-2xl mx-auto">Jusqu&apos;à <span className="font-bold text-slate-800">5 heures par semaine</span> sur des tâches qui ne génèrent aucun revenu.</p>
            </ScrollReveal>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {[{ icon: Clock, value: '5h', unit: '/sem', label: 'Perdues sur l\'administratif' }, { icon: TrendingDown, value: '25%', unit: '', label: 'De factures impayées à temps' }, { icon: Puzzle, value: '5', unit: '', label: 'Outils différents nécessaires' }].map((item, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <Card3D><div className="bg-white rounded-2xl p-6 sm:p-8 lg:p-10 border border-slate-100 h-full hover:shadow-lg">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><item.icon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-brand-500" /></div>
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-1 text-center">{item.value}<span className="text-brand-400">{item.unit}</span></div>
                  <div className="text-sm lg:text-base text-slate-500 text-center">{item.label}</div>
                </div></Card3D>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="py-16 sm:py-24 lg:py-32 bg-white">
        <div className="max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3.5 py-1.5 text-xs sm:text-sm lg:text-base font-medium text-brand-700 mb-4"><Rocket className="w-4 h-4 lg:w-5 lg:h-5" />Comment ça marche</div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight mb-3">Opérationnel en 3 étapes</h2>
            </ScrollReveal>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 relative">
            <div className="hidden sm:block absolute top-10 left-[16%] right-[16%] h-px bg-brand-200" />
            {[{ num: 1, title: 'Créez votre compte', desc: 'Inscription en 2 minutes. Choisissez votre template de facture préféré.' }, { num: 2, title: 'Décrivez votre facture', desc: 'Dites-la à voix haute ou tapez-la. L\'IA fait le reste.' }, { num: 3, title: 'Recevez votre paiement', desc: 'Envoyez par e-mail, votre client paie en un clic.' }].map((step, i) => (
              <ScrollReveal key={i} delay={0.05 + i * 0.1}>
                <div className="text-center relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-brand-500/20 relative z-10"><span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">{step.num}</span></div>
                  <h3 className="font-bold text-base sm:text-lg lg:text-xl mb-2">{step.title}</h3>
                  <p className="text-sm lg:text-base text-slate-500 max-w-[240px] lg:max-w-[280px] mx-auto">{step.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ BEFORE / AFTER (3D) ═══════════ */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-14"><ScrollReveal><h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">Avant / Après Factu.me</h2></ScrollReveal></div>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <ScrollReveal direction="right" delay={0.05}>
              <Card3D>
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-red-100 h-full">
                  <div className="flex items-center gap-2 mb-5"><div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center"><X className="w-4 h-4 text-red-500" /></div><span className="font-bold text-sm text-red-600">Avant</span></div>
                  <ul className="space-y-3">
                    {['45 minutes pour faire une facture', '3 outils différents minimum', 'Relances oubliées ou mal faites', 'Reçus perdus dans un tiroir', 'Mentions légales incorrectes', 'Export impôts = cauchemar'].map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-500"><Minus className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />{item}</li>
                    ))}
                  </ul>
                </div>
              </Card3D>
            </ScrollReveal>
            <ScrollReveal direction="left" delay={0.15}>
              <Card3D>
                <div className="bg-brand-500 rounded-2xl p-6 sm:p-8 border border-brand-400 h-full shadow-lg shadow-brand-500/20">
                  <div className="flex items-center gap-2 mb-5"><div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"><Check className="w-4 h-4 text-white" /></div><span className="font-bold text-sm text-white">Après Factu.me</span></div>
                  <ul className="space-y-3">
                    {['3 secondes grâce à l\'IA', 'Tout en un seul endroit', 'Relances automatiques', 'Reçus scannés et catégorisés', 'Mentions légales automatiques', 'Export impôts en un clic'].map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-white/90"><Zap className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />{item}</li>
                    ))}
                  </ul>
                </div>
              </Card3D>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section id="features" className="py-16 sm:py-24 lg:py-32 xl:py-40 bg-white">
        <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3.5 py-1.5 text-xs sm:text-sm lg:text-base font-medium text-brand-700 mb-4"><Layers className="w-4 h-4 lg:w-5 lg:h-5" />Fonctionnalités</div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight mb-3">Tout en un seul endroit</h2>
              <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-slate-500 max-w-2xl mx-auto">Remplacez vos 5 outils par une seule plateforme.</p>
            </ScrollReveal>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8">
            {features.slice(0, 6).map((f, i) => (
              <ScrollReveal key={i} delay={i * 0.05}>
                <Card3D><div className="bg-white rounded-2xl p-6 sm:p-7 lg:p-8 border border-slate-100 h-full hover:shadow-lg">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-brand-50 rounded-xl flex items-center justify-center mb-4"><f.icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-brand-500" /></div>
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-2">{f.title}</h3>
                  <p className="text-sm lg:text-base text-slate-500 leading-relaxed">{f.desc}</p>
                </div></Card3D>
              </ScrollReveal>
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {features.slice(6, 10).map((f, i) => (
              <ScrollReveal key={i} delay={i * 0.05}>
                <Card3D><div className="bg-white rounded-2xl p-5 sm:p-6 lg:p-7 border border-slate-100 h-full hover:shadow-lg">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-brand-50 rounded-xl flex items-center justify-center mb-3"><f.icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-brand-500" /></div>
                  <h3 className="text-sm sm:text-base lg:text-lg font-bold mb-1">{f.title}</h3>
                  <p className="text-xs sm:text-sm lg:text-base text-slate-500 leading-relaxed">{f.desc}</p>
                </div></Card3D>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ AI SECTION ═══════════ */}
      <section id="ai" className="py-16 sm:py-24 lg:py-32 xl:py-40 bg-brand-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] sm:w-[500px] lg:w-[700px] xl:w-[900px] h-[400px] sm:h-[500px] lg:h-[700px] xl:h-[900px] bg-brand-500/10 rounded-full blur-[100px] sm:blur-[120px] lg:blur-[150px] animate-[blob_15s_ease-in-out_infinite]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)', backgroundSize: '50px 50px' }} />
        <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 xl:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <ScrollReveal direction="left">
                <div className="bg-brand-900/80 backdrop-blur rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl shadow-brand-500/10 border border-brand-800/50">
                  <div className="flex items-center gap-2 px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-4 bg-brand-900 border-b border-brand-800/50">
                    <div className="flex gap-1.5"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-red-400/60" /><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-amber-400/60" /><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-green-400/60" /></div>
                    <span className="ml-2 text-[10px] sm:text-xs lg:text-sm text-brand-400 font-medium">Factu.me AI</span>
                  </div>
                  <div className="p-4 sm:p-6 lg:p-8 space-y-3 sm:space-y-4 lg:space-y-5 font-mono text-xs sm:text-sm lg:text-base">
                    <div className="flex items-start gap-2 sm:gap-3 lg:gap-4">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-brand-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-brand-400" /></div>
                      <div className="bg-brand-800/50 rounded-xl rounded-tl-none px-3 py-2 sm:px-4 sm:py-3 lg:px-5 lg:py-4 text-brand-200 max-w-[92%] border border-brand-700/30 text-[11px] sm:text-[13px] lg:text-sm">
                        &quot;Facture pour Dupont, 5 jours de dev à 600€ HT, TVA 20%, ajoute 2 jours conseil à 400€&quot;
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3 lg:gap-4">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-brand-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-brand-400" /></div>
                      <div className="space-y-2 max-w-[92%]">
                        <div className="bg-brand-800/50 rounded-xl rounded-tl-none px-3 py-2 sm:px-4 sm:py-2.5 lg:px-5 lg:py-3 text-brand-300 border border-brand-700/30 text-[11px] sm:text-[13px] lg:text-sm"><span className="text-brand-400">Analyse...</span></div>
                        <div className="bg-brand-800/50 rounded-xl rounded-tl-none px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-4 text-brand-200 space-y-1.5 sm:space-y-2 lg:space-y-2.5 border border-brand-700/30 text-[10px] sm:text-xs lg:text-sm">
                          <div className="flex items-center gap-1.5 text-green-400"><Check className="w-3 h-3 lg:w-4 lg:h-4" />Client : Dupont Consulting SAS</div>
                          <div className="flex items-center gap-1.5 text-green-400"><Check className="w-3 h-3 lg:w-4 lg:h-4" />Développement — 5j x 600€</div>
                          <div className="flex items-center gap-1.5 text-green-400"><Check className="w-3 h-3 lg:w-4 lg:h-4" />Conseil — 2j x 400€</div>
                          <div className="flex items-center gap-1.5 text-green-400"><Check className="w-3 h-3 lg:w-4 lg:h-4" />TVA 20% appliquée</div>
                          <div className="flex items-center gap-1.5 text-brand-300 font-semibold pt-1 border-t border-brand-700/30"><Zap className="w-3 h-3 lg:w-4 lg:h-4 text-brand-400" /> FACT-2026-0042 créée</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
            <div className="space-y-5 sm:space-y-7 lg:space-y-8 order-1 lg:order-2">
              <ScrollReveal direction="right">
                <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-3.5 py-1.5 text-xs sm:text-sm lg:text-base font-medium text-brand-300"><Sparkles className="w-4 h-4 lg:w-5 lg:h-5" />Propulsé par l&apos;IA</div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight">Dites-le, l&apos;IA<br />le fait pour vous</h2>
                <div className="space-y-6 sm:space-y-5 lg:space-y-6">
                  {[{ icon: Mic, title: 'Dictée vocale', desc: 'Parlez naturellement, l\'IA remplit tous les champs.' }, { icon: Type, title: 'Génération textuelle', desc: 'Tapez en langage naturel, descriptions professionnelles automatiques.' }, { icon: Pencil, title: 'Modification intelligente', desc: '"Ajoute 2 jours" — l\'IA comprend et modifie en conséquence.' }].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 sm:gap-4 lg:gap-5">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-brand-500/10 rounded-xl flex items-center justify-center flex-shrink-0"><item.icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-brand-400" /></div>
                      <div><h3 className="font-bold text-sm sm:text-base lg:text-lg mb-1">{item.title}</h3><p className="text-xs sm:text-sm lg:text-base text-brand-200/60">{item.desc}</p></div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ PAYMENT ═══════════ */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <ScrollReveal direction="left">
              <div className="bg-slate-50 rounded-2xl p-5 sm:p-8 border border-slate-100 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center"><LinkIcon className="w-5 h-5 text-brand-600" /></div>
                  <div><div className="font-bold text-sm">Lien de paiement envoyé</div><div className="text-xs text-slate-400">factu.me/pay/inv-0042</div></div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-100 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Conception site web</span><span className="font-semibold">3 000€</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Conseil UX/UI</span><span className="font-semibold">800€</span></div>
                  <div className="flex justify-between text-sm border-t border-slate-100 pt-2"><span className="font-semibold">Total TTC</span><span className="font-bold text-brand-600">4 560€</span></div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="w-3.5 h-3.5 text-brand-500" />Paiement sécurisé par Stripe</div>
                <Link href="/login" className="block w-full bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm text-center hover:bg-brand-600 transition-colors">
                  <span className="flex items-center justify-center gap-2"><CreditCard className="w-4 h-4" />Payer maintenant</span>
                </Link>
              </div>
            </ScrollReveal>
            <div className="space-y-5 sm:space-y-6">
              <ScrollReveal direction="right">
                <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium text-brand-700"><CreditCard className="w-4 h-4" />Paiement en ligne</div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Envoyez un lien,<br />votre client paie directement</h2>
                <p className="text-base sm:text-lg text-slate-500 leading-relaxed">Plus besoin d&apos;attendre un virement. Votre client clique, paie par carte, et le statut se met à jour instantanément.</p>
                <div className="space-y-3">
                  {['Paiement par carte ou virement instantané', 'Statut mis à jour en temps réel', 'Relances automatiques si impayé'].map((item, i) => (
                    <div key={i} className="flex items-center gap-3"><div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0"><Check className="w-4 h-4 text-brand-500" /></div><span className="text-sm text-slate-600">{item}</span></div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CRM (3D pipeline cards) ═══════════ */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-5 sm:space-y-6">
              <ScrollReveal direction="left">
                <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium text-brand-700"><Users className="w-4 h-4" />CRM intégré</div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Vos clients,<br />toujours sous la main</h2>
                <p className="text-base sm:text-lg text-slate-500 leading-relaxed">Fiches complètes, historique, et un pipeline visuel pour suivre vos opportunités.</p>
                <div className="space-y-3">
                  {['Auto-complétion des infos entreprise (SIRET)', 'Pipeline de vente en 6 étapes visuelles', 'Import de clients en masse depuis un fichier'].map((item, i) => (
                    <div key={i} className="flex items-center gap-3"><div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0"><Check className="w-4 h-4 text-brand-500" /></div><span className="text-sm text-slate-600">{item}</span></div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
            <ScrollReveal direction="right">
              <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Pipeline de vente</div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
                  {[{ name: 'Prospect', bg: 'bg-brand-50', border: 'border-brand-100', text: 'text-brand-700', deals: [{ name: 'Dupont SAS', amount: '12 000€' }, { name: 'Martin SARL', amount: '8 500€' }] }, { name: 'Proposition', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', deals: [{ name: 'Lemoine Co', amount: '25 000€' }] }, { name: 'Gagné', bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', deals: [{ name: 'Garcia SI', amount: '15 000€' }] }].map((stage, i) => (
                    <Card3D key={i}>
                      <div className={`${stage.bg} rounded-xl p-2.5 sm:p-3 border ${stage.border}`}>
                        <div className={`text-[10px] sm:text-xs font-semibold ${stage.text} mb-2`}>{stage.name}</div>
                        {stage.deals.map((deal, j) => (
                          <div key={j} className={`bg-white rounded-lg p-2 text-[10px] sm:text-xs border ${stage.border} mb-1.5 shadow-sm`}>
                            <div className="font-medium text-slate-700">{deal.name}</div><div className="text-slate-400">{deal.amount}</div>
                          </div>
                        ))}
                      </div>
                    </Card3D>
                  ))}
                </div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Fiche client</div>
                <Card3D>
                  <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center text-xs font-bold text-brand-700">DC</div>
                      <div><div className="font-bold text-sm">Dupont Consulting SAS</div><div className="text-[11px] text-slate-400">8 av. Champs-Élysées, 75008</div></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded-lg p-2 border border-slate-100"><div className="text-sm font-bold text-brand-600">12</div><div className="text-[10px] text-slate-400">Factures</div></div>
                      <div className="bg-white rounded-lg p-2 border border-slate-100"><div className="text-sm font-bold text-brand-600">45 600€</div><div className="text-[10px] text-slate-400">CA total</div></div>
                      <div className="bg-white rounded-lg p-2 border border-slate-100"><div className="text-sm font-bold text-green-600">0€</div><div className="text-[10px] text-slate-400">Impayé</div></div>
                    </div>
                  </div>
                </Card3D>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════ OCR ═══════════ */}
      <section className="py-16 sm:py-24 bg-brand-950 text-white relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-[400px] sm:w-[500px] h-[400px] sm:h-[500px] bg-brand-500/8 rounded-full blur-[100px] animate-[blob_15s_ease-in-out_infinite]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <ScrollReveal direction="left">
                <div className="bg-brand-900/80 backdrop-blur rounded-2xl overflow-hidden border border-brand-800/50 p-5 sm:p-6">
                  <div className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-4">Scan de reçu en cours</div>
                  <div className="relative bg-white rounded-xl p-4 aspect-[3/4] sm:aspect-[4/3] flex items-center justify-center overflow-hidden">
                    <div className="w-full space-y-2 relative z-10">
                      <div className="h-2 w-16 bg-slate-300 rounded mx-auto" /><div className="h-1.5 w-24 bg-slate-200 rounded mx-auto" /><div className="h-px bg-slate-200 my-2" />
                      <div className="space-y-1.5 px-2"><div className="h-1.5 w-full bg-slate-200 rounded" /><div className="h-1.5 w-3/4 bg-slate-200 rounded" /><div className="h-1.5 w-5/6 bg-slate-200 rounded" /></div>
                      <div className="h-px bg-slate-200 my-2" />
                      <div className="flex justify-between px-2"><div className="h-1.5 w-12 bg-slate-300 rounded" /><div className="h-1.5 w-16 bg-slate-300 rounded" /></div>
                      <div className="flex justify-between px-2"><div className="h-1.5 w-10 bg-slate-300 rounded" /><div className="h-1.5 w-14 bg-slate-300 rounded" /></div>
                      <div className="h-px bg-slate-300 my-2" />
                      <div className="flex justify-between px-2"><div className="h-2 w-14 bg-slate-400 rounded" /><div className="h-2 w-20 bg-slate-400 rounded" /></div>
                    </div>
                    <div className="absolute left-2 right-2 h-0.5 bg-brand-500 shadow-lg shadow-brand-500/50 animate-[scanLine_2.5s_ease-in-out_infinite_alternate]" style={{ top: '10%' }} />
                  </div>
                  <div className="mt-4 space-y-2">
                    {[{ label: 'Fournisseur', value: 'Boulangerie Dupont' }, { label: 'Montant', value: '24,80€' }, { label: 'TVA', value: '4,10€ (20%)' }, { label: 'Catégorie', value: 'Repas' }].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs"><CheckCircle className="w-3.5 h-3.5 text-green-400" /><span className="text-brand-200">{item.label} : <strong>{item.value}</strong></span></div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            </div>
            <div className="space-y-5 sm:space-y-7 order-1 lg:order-2">
              <ScrollReveal direction="right">
                <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium text-brand-300"><ScanText className="w-4 h-4" />Scan intelligent</div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Photographiez un reçu,<br />l&apos;IA fait le reste</h2>
                <p className="text-base sm:text-lg text-brand-200/60 leading-relaxed">Prenez en photo vos factures fournisseurs, tickets de restaurant, reçus d&apos;essence. L&apos;IA extrait automatiquement le montant, la TVA, la date et le fournisseur.</p>
                <div className="space-y-3">
                  {[{ icon: Camera, title: 'Photo ou upload', desc: 'Prenez en photo ou importez un PDF' }, { icon: Sparkles, title: 'Extraction automatique', desc: 'Montant, TVA, date, fournisseur reconnus' }, { icon: Tag, title: 'Catégorisation intelligente', desc: 'Repas, transport, équipement, bureau...' }].map((item, i) => (
                    <div key={i} className="flex items-start gap-3"><div className="w-8 h-8 bg-brand-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><item.icon className="w-4 h-4 text-brand-400" /></div><div><div className="font-bold text-sm mb-0.5">{item.title}</div><div className="text-xs text-brand-200/50">{item.desc}</div></div></div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ TEMPLATES ═══════════ */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-5 sm:space-y-6">
              <ScrollReveal direction="left">
                <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium text-brand-700"><Palette className="w-4 h-4" />Templates personnalisables</div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Votre facture,<br />votre style</h2>
                <p className="text-base sm:text-lg text-slate-500 leading-relaxed">Choisissez parmi 6 modèles professionnels, personnalisez avec votre logo et vos couleurs.</p>
                <div className="space-y-3">
                  {['Logo et couleurs personnalisées', '6 modèles professionnels', 'L\'IA applique votre template automatiquement'].map((item, i) => (
                    <div key={i} className="flex items-center gap-3"><div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0"><Check className="w-4 h-4 text-brand-500" /></div><span className="text-sm text-slate-600">{item}</span></div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
            <ScrollReveal direction="right">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[{ from: 'from-slate-50', to: 'to-slate-100', bar: 'bg-slate-300', bar2: 'bg-slate-200' }, { from: 'from-brand-400', to: 'to-brand-600', bar: 'bg-white/60', bar2: 'bg-white/40', dark: true }, { from: 'from-brand-50', to: 'to-emerald-50', bar: 'bg-brand-300', bar2: 'bg-brand-200' }, { from: 'from-slate-800', to: 'to-slate-900', bar: 'bg-slate-500', bar2: 'bg-slate-600', dark: true }, { from: 'from-slate-700', to: 'to-blue-950', bar: 'bg-slate-400', bar2: 'bg-slate-500', dark: true }, { from: 'from-green-50', to: 'to-emerald-100', bar: 'bg-green-400', bar2: 'bg-green-300' }].map((t, i) => (
                  <div key={i} className={`bg-gradient-to-br ${t.from} ${t.to} rounded-xl sm:rounded-2xl overflow-hidden aspect-[3/4]`}>
                    <div className="p-2 sm:p-3 space-y-1.5 mt-4">
                      <div className={`h-1.5 w-12 ${t.bar} rounded`} /><div className={`h-1 w-16 ${t.bar2} rounded`} />
                      <div className={`h-4 mt-2 rounded ${t.dark ? 'bg-slate-700/50' : 'bg-white border'}`} />
                      <div className={`h-4 rounded ${t.dark ? 'bg-slate-700/50' : 'bg-white border'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════ NEW: INTEGRATIONS ═══════════ */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium text-brand-700 mb-4"><Globe className="w-4 h-4" />Intégrations</div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">Connecté à vos outils</h2>
            <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto mb-10 sm:mb-14">Factu.me s&apos;intègre nativement avec vos services préférés pour une expérience sans friction.</p>
          </ScrollReveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            {[
              { icon: CreditCard, name: 'Stripe', desc: 'Paiement en ligne' },
              { icon: Smartphone, name: 'SumUp', desc: 'Terminal mobile' },
              { icon: Cloud, name: 'Google Drive', desc: 'Sauvegarde cloud' },
              { icon: FileText, name: 'Compta', desc: 'Export FEC' },
              { icon: MailCheck, name: 'Mail', desc: 'Envoi automatique' },
              { icon: Calendar, name: 'Calendrier', desc: 'Rappels' },
            ].map((item, i) => (
              <ScrollReveal key={i} delay={i * 0.05}>
                <Card3D>
                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 h-full hover:shadow-lg text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-50 rounded-xl flex items-center justify-center mx-auto mb-3"><item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-brand-500" /></div>
                    <div className="font-bold text-xs sm:text-sm">{item.name}</div>
                    <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{item.desc}</div>
                  </div>
                </Card3D>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ NEW: SECURITY ═══════════ */}
      <section className="py-16 sm:py-24 bg-brand-950 text-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] bg-brand-500/5 rounded-full blur-[120px]" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
          <ScrollReveal>
            <div className="text-center mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium text-brand-300 mb-4"><Shield className="w-4 h-4" />Sécurité & Conformité</div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">Vos données sont entre bonnes mains</h2>
              <p className="text-base sm:text-lg text-brand-200/60 max-w-2xl mx-auto">Hébergement en France, chiffrement de bout en bout, conformité RGPD.</p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: Shield, title: 'Chiffrement AES-256', desc: 'Toutes vos données sont chiffrées en transit et au repos.' },
              { icon: FileBadge, title: 'Hébergement France', desc: 'Serveurs localisés à Paris, soumis au droit français.' },
              { icon: Scale, title: 'Conforme RGPD', desc: 'Export et suppression de vos données à tout moment.' },
              { icon: Eye, title: 'Accès contrôlé', desc: 'Chaque utilisateur ne voit que ses propres données.' },
            ].map((item, i) => (
              <ScrollReveal key={i} delay={i * 0.05}>
                <Card3D>
                  <div className="bg-brand-900/60 backdrop-blur rounded-2xl p-5 sm:p-6 border border-brand-800/50 h-full hover:shadow-lg hover:shadow-brand-500/10">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-brand-500/10 rounded-xl flex items-center justify-center mb-4"><item.icon className="w-5 h-5 text-brand-400" /></div>
                    <h3 className="font-bold text-sm sm:text-base mb-1">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-brand-200/50">{item.desc}</p>
                  </div>
                </Card3D>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium text-brand-700 mb-4"><MessageCircle className="w-4 h-4" />Témoignages</div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">Ce qu&apos;ils en disent</h2>
            </ScrollReveal>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {testimonials.map((t, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <Card3D><div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-100 h-full flex flex-col hover:shadow-lg">
                  <div className="flex items-center gap-1 mb-4">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}</div>
                  <p className="text-sm text-slate-600 leading-relaxed flex-grow mb-5">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <img src={`https://picsum.photos/seed/${t.avatar}/48/48.jpg`} className="w-11 h-11 rounded-full object-cover" alt="" />
                    <div><div className="font-bold text-sm">{t.name}</div><div className="text-xs text-slate-400">{t.role}</div></div>
                  </div>
                </div></Card3D>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section id="tarifs" className="py-16 sm:py-24 lg:py-32 xl:py-40 bg-slate-50">
        <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3.5 py-1.5 text-xs sm:text-sm lg:text-base font-medium text-brand-700 mb-4"><Tag className="w-4 h-4 lg:w-5 lg:h-5" />Tarifs transparents</div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight mb-3">Choisissez votre plan</h2>
              <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-slate-500 max-w-2xl mx-auto">Sans engagement. Évoluez quand vous voulez.</p>
            </ScrollReveal>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {plans.map((plan, i) => (
              <ScrollReveal key={i} delay={i * 0.05}>
                <div className={`relative ${plan.popular ? 'pricing-popular' : ''}`}>
                  <Card3D>
                    <div className="bg-white rounded-2xl p-5 sm:p-7 lg:p-8 border border-slate-100 h-full flex flex-col hover:shadow-lg relative z-10">
                      <div className="mb-5">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-base sm:text-lg lg:text-xl font-bold">{plan.name}</h3>
                          {plan.popular && <span className="bg-brand-500 text-white text-[10px] sm:text-xs lg:text-sm font-bold px-2.5 py-0.5 lg:px-3 lg:py-1 rounded-full">Populaire</span>}
                        </div>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">{plan.price}<span className="text-xs sm:text-sm lg:text-base text-slate-400 ml-1">{plan.period}</span></div>
                        {plan.name === 'Gratuit' && <div className="text-xs sm:text-sm lg:text-base text-slate-400">Pour toujours</div>}
                      </div>
                      <ul className="space-y-2.5 mb-6 flex-grow">
                        {plan.features.map((f, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm lg:text-base"><Check className="w-4 h-4 lg:w-5 lg:h-5 text-brand-500 flex-shrink-0" /><span className="text-slate-600">{f}</span></li>
                        ))}
                      </ul>
                      <Link href={`/register${plan.name !== 'Gratuit' ? `?plan=${plan.name.toLowerCase()}` : ''}`} className={`block text-center font-semibold py-2.5 rounded-xl transition-all text-sm lg:text-base active:scale-[0.97] ${plan.popular ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/25' : plan.name === 'Gratuit' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
                        {plan.name === 'Gratuit' ? 'Commencer' : `Choisir ${plan.name}`}
                      </Link>
                    </div>
                  </Card3D>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <div className="text-center mt-6 sm:mt-8">
            <ScrollReveal><p className="text-xs sm:text-sm lg:text-base text-slate-400 flex items-center justify-center gap-3"><ShieldCheck className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-brand-500" />Données hébergées en France · Connexion sécurisée · Annulation en un clic</p></ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="py-16 sm:py-24 lg:py-32 bg-white">
        <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3.5 py-1.5 text-xs sm:text-sm lg:text-base font-medium text-brand-700 mb-4"><HelpCircle className="w-4 h-4 lg:w-5 lg:h-5" />Questions fréquentes</div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight">Tout ce que vous voulez savoir</h2>
            </ScrollReveal>
          </div>
          <ScrollReveal>
            <div className="space-y-3 sm:space-y-4 lg:space-y-5">{faqItems.map((item, i) => <FAQItem key={i} question={item.q} answer={item.a} />)}</div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="py-16 sm:py-24 lg:py-32 xl:py-40 bg-brand-950 text-white relative overflow-hidden">
        <div className="absolute inset-0"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[800px] lg:w-[1000px] xl:w-[1200px] h-[500px] sm:h-[800px] lg:h-[1000px] xl:h-[1200px] bg-brand-500/10 rounded-full blur-[100px] sm:blur-[150px] lg:blur-[200px] animate-[blob_15s_ease-in-out_infinite]" /></div>
        <div className="max-w-4xl xl:max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <ScrollReveal direction="scale">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-brand-500 rounded-2xl sm:rounded-3xl mb-6 sm:mb-8 animate-[float_6s_ease-in-out_infinite] shadow-2xl shadow-brand-500/30"><Zap className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" /></div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-extrabold tracking-tight mb-5 sm:mb-6 lg:mb-8">Prêt à en finir avec<br /><span className="gradient-text-light">la paperasse ?</span></h2>
            <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-brand-200/60 max-w-2xl xl:max-w-3xl mx-auto mb-8 sm:mb-10 lg:mb-12">Rejoignez les 2 000+ entrepreneurs qui ont repris le contrôle de leur facturation.</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-5 justify-center">
              <Link href="/register" className="group inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold px-6 py-3.5 sm:px-8 sm:py-4 lg:px-10 lg:py-5 rounded-2xl transition-all shadow-xl shadow-brand-500/30 hover:shadow-2xl active:scale-[0.97] text-sm sm:text-base lg:text-lg relative overflow-hidden">
                <span className="relative z-10">Commencer gratuitement</span><ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 relative z-10 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_ease-in-out]" />
              </Link>
              <Link href="/login" className="group inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-medium px-6 py-3.5 sm:px-8 sm:py-4 lg:px-10 lg:py-5 rounded-2xl transition-all border border-white/10 hover:border-white/20 text-sm sm:text-base lg:text-lg backdrop-blur">
                <LogIn className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-brand-400" />Se connecter
              </Link>
            </div>
            <p className="text-xs sm:text-sm lg:text-base text-brand-200/30 mt-5 sm:mt-6 lg:mt-8">Sans carte bancaire · Sans engagement · Annulation en un clic</p>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-brand-950 text-white border-t border-brand-900 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10 mb-10 sm:mb-12">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-brand-500 rounded-xl flex items-center justify-center"><Zap className="w-[18px] h-[18px] sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" /></div>
                <span className="text-lg sm:text-xl lg:text-2xl font-bold">Factu<span className="text-brand-400">.me</span></span>
              </Link>
              <p className="text-xs sm:text-sm lg:text-base text-brand-200/40 leading-relaxed max-w-xs lg:max-w-sm mb-4">La plateforme de facturation 100% française, propulsée par l&apos;IA.</p>
              <div className="flex items-center gap-2 sm:gap-3">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-brand-900 hover:bg-brand-800 rounded-lg flex items-center justify-center transition-all active:scale-95"><Twitter className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-brand-300/60" /></a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-brand-900 hover:bg-brand-800 rounded-lg flex items-center justify-center transition-all active:scale-95"><Linkedin className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-brand-300/60" /></a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-brand-900 hover:bg-brand-800 rounded-lg flex items-center justify-center transition-all active:scale-95"><Github className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-brand-300/60" /></a>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm lg:text-base mb-3 text-brand-200">Produit</h4>
              <ul className="space-y-2">
                <li><a href="#features" onClick={(e) => scrollTo(e, '#features')} className="text-xs sm:text-sm lg:text-base text-brand-200/40 hover:text-brand-400 transition-colors">Fonctionnalités</a></li>
                <li><a href="#tarifs" onClick={(e) => scrollTo(e, '#tarifs')} className="text-xs sm:text-sm lg:text-base text-brand-200/40 hover:text-brand-400 transition-colors">Tarifs</a></li>
                <li><a href="#ai" onClick={(e) => scrollTo(e, '#ai')} className="text-xs sm:text-sm lg:text-base text-brand-200/40 hover:text-brand-400 transition-colors">IA</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm lg:text-base mb-3 text-brand-200">Ressources</h4>
              <ul className="space-y-2">
                <li><Link href="/legal/mentions-legales" className="text-xs sm:text-sm lg:text-base text-brand-200/40 hover:text-brand-400 transition-colors">Mentions légales</Link></li>
                <li><Link href="/legal/cgu" className="text-xs sm:text-sm lg:text-base text-brand-200/40 hover:text-brand-400 transition-colors">CGU</Link></li>
                <li><Link href="/legal/confidentialite" className="text-xs sm:text-sm lg:text-base text-brand-200/40 hover:text-brand-400 transition-colors">Confidentialité</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm lg:text-base mb-3 text-brand-200">Légal</h4>
              <ul className="space-y-2">
                <li><Link href="/legal/mentions-legales" className="text-xs sm:text-sm lg:text-base text-brand-200/40 hover:text-brand-400 transition-colors">Mentions légales</Link></li>
                <li><Link href="/legal/cgu" className="text-xs sm:text-sm lg:text-base text-brand-200/40 hover:text-brand-400 transition-colors">CGU</Link></li>
                <li><Link href="/legal/confidentialite" className="text-xs sm:text-sm lg:text-base text-brand-200/40 hover:text-brand-400 transition-colors">Confidentialité</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-brand-900 pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs sm:text-sm lg:text-base text-brand-200/30">2026 Factu.me. Fait avec <Zap className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 inline text-brand-400" /> en France.</p>
            <div className="flex items-center gap-2 text-[11px] sm:text-xs lg:text-sm text-brand-200/30"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5 bg-brand-500 rounded-full animate-pulse" />Opérationnel</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
