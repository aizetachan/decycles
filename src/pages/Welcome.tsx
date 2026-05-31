import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Compass, Filter, Heart, Wrench, Calendar,
  Package, Users as UsersIcon, Palette, ArrowRight, Check,
  Plus, Minus, Instagram, Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { useT } from "../contexts/LanguageContext";
import { useCreators } from "../hooks/useCreators";
import { Header } from "../components/layout/Header";
import { AboutModal } from "../components/modals/AboutModal";
import { ContactModal } from "../components/modals/ContactModal";
import { SupportModal } from "../components/modals/SupportModal";

// Unsplash IDs that already ship in the seed data — guaranteed to resolve.
const IMG = {
  hero: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=2000&q=80",
  workshop: "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?auto=format&fit=crop&w=1200&q=80",
  ride: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=1200&q=80",
  group: "https://images.unsplash.com/photo-1511994298241-608e28f14fde?auto=format&fit=crop&w=1200&q=80",
  detail: "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=1200&q=80",
};

const unsplash = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const CATEGORIES = [
  { label: "Products", icon: Package, blurb: "Bikes, frames, components, gear & clothing.", img: unsplash("photo-1485965120184-e220f721d03e") },
  { label: "Services", icon: Wrench, blurb: "Repairs, custom builds, restorations, fittings.", img: unsplash("photo-1576435728678-68d0fbf94e91") },
  { label: "Events", icon: Calendar, blurb: "Races, group rides, swap meets, exhibitions.", img: unsplash("photo-1532298229144-0ec0c57515c7") },
  { label: "Community", icon: UsersIcon, blurb: "Clubs, collectives, advocacy & local crews.", img: unsplash("photo-1511994298241-608e28f14fde") },
  { label: "Creative & Media", icon: Palette, blurb: "Photographers, magazines, films, publishing.", img: unsplash("photo-1507035895480-2b3156c31fc8") },
];

type Plan = {
  name: string;
  price: string;
  period: string;
  badge?: string;
  description: string;
  features: string[];
  cta: string;
  ctaAction: "signup" | "browse";
  highlight?: boolean;
};

// Two modalities × three plans. Free always present, badged "During Beta"
// instead of "Only Plan". Copy is placeholder-realistic — refine when ready.
const PRICING: Record<"users" | "creators", Plan[]> = {
  users: [
    {
      name: "Free",
      price: "€0",
      period: "/ forever",
      badge: "During Beta",
      description: "Discover and follow the directory.",
      features: [
        "Unlimited browsing and search",
        "Save favorites and follow creators",
        "Access to the global creator map",
        "Public event calendar",
      ],
      cta: "Sign up free",
      ctaAction: "signup",
    },
    {
      name: "Plus",
      price: "€5",
      period: "/ month",
      description: "More tools for active riders.",
      features: [
        "Everything in Free",
        "Saved searches and custom lists",
        "Event RSVPs and reminders",
        "Trip planner with map overlays",
        "Ad-free experience",
      ],
      cta: "Get Plus",
      ctaAction: "signup",
      highlight: true,
    },
    {
      name: "Pro",
      price: "€12",
      period: "/ month",
      description: "For the most engaged riders.",
      features: [
        "Everything in Plus",
        "Early access to new creators & events",
        "Exclusive editorial content",
        "Direct messaging with creators",
        "Priority support",
      ],
      cta: "Go Pro",
      ctaAction: "signup",
    },
  ],
  creators: [
    {
      name: "Free",
      price: "€0",
      period: "/ forever",
      badge: "During Beta",
      description: "Get your shop on the map.",
      features: [
        "Public shop profile",
        "Gallery up to 12 images",
        "1 event per month",
        "Basic search & category placement",
      ],
      cta: "Apply for free",
      ctaAction: "signup",
    },
    {
      name: "Studio",
      price: "€19",
      period: "/ month",
      description: "For working shops and makers.",
      features: [
        "Everything in Free",
        "Unlimited gallery & events",
        "Custom URL slug",
        "Basic visit analytics",
        "Newsletter & social integrations",
      ],
      cta: "Start Studio",
      ctaAction: "signup",
      highlight: true,
    },
    {
      name: "Pro",
      price: "€49",
      period: "/ month",
      description: "Maximum reach for serious creators.",
      features: [
        "Everything in Studio",
        "Featured placement in your category",
        "Promoted events & launches",
        "Full audience analytics",
        "Priority human support",
      ],
      cta: "Go Pro",
      ctaAction: "signup",
    },
  ],
};

const FAQ_ITEMS = [
  {
    q: "What is decycles?",
    a: "A curated, global directory of independent cycling creators — framebuilders, component makers, mechanics, photographers, event organizers, collectives. One place to discover the people behind the rides.",
  },
  {
    q: "Who can join as a creator?",
    a: "Anyone independently building, repairing, organizing or documenting cycling culture. From a one-person frame shop to a magazine, a community ride, or a custom painter.",
  },
  {
    q: "Is it free?",
    a: "Yes. Free for visitors. Free for creators. No subscriptions, no commissions, no paywalls.",
  },
  {
    q: "How do I get my shop listed?",
    a: "Sign up, fill out your profile, and hit Publish. We keep the directory curated, so listings are reviewed before going live to keep quality high for everyone.",
  },
  {
    q: "Can I host events?",
    a: "Yes — creators can publish events with dates, locations, descriptions and images. They show up in the directory and on the global map.",
  },
  {
    q: "How can I reach you?",
    a: "Use Contact in the menu, or DM us on Instagram @decycles.cc. We read everything.",
  },
];

export function Welcome() {
  const navigate = useNavigate();
  const { t } = useT();
  const {
    isDarkMode, openJoinModal,
    isAboutModalOpen, setIsAboutModalOpen,
    isContactModalOpen, setIsContactModalOpen,
    isSupportModalOpen, setIsSupportModalOpen,
  } = useUI();
  const { currentUser, loading: authLoading } = useAuth();
  const { creators } = useCreators();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [pricingMode, setPricingMode] = useState<"users" | "creators">("users");

  // Logged-in users are redirected straight into the platform — the landing
  // is for visitors who haven't entered yet.
  useEffect(() => {
    if (!authLoading && currentUser) navigate("/", { replace: true });
  }, [authLoading, currentUser, navigate]);

  useEffect(() => {
    const prev = document.title;
    document.title = "Decycles — Discover independent cycling culture";
    return () => { document.title = prev; };
  }, []);

  // Light counters — fall back to evocative ranges if Firestore is empty.
  const creatorCount = creators?.length || 0;
  const countryCount = new Set(
    (creators || []).map((c) => (c.country || "").trim()).filter(Boolean)
  ).size;

  // Header expects these props — on a public landing they're harmless dummies.
  const headerProfile = {} as any;

  // ───────────────────────── Style tokens ─────────────────────────
  const border = isDarkMode ? "border-white" : "border-black";
  const subBorder = isDarkMode ? "border-zinc-700" : "border-gray-300";
  const muted = isDarkMode ? "text-gray-400" : "text-gray-500";
  const cardBg = isDarkMode ? "bg-zinc-900" : "bg-white";
  const sectionAlt = isDarkMode ? "bg-zinc-950" : "bg-[#F3F4F6]";

  // Two background textures for otherwise-flat sections. Alternating them
  // (not always the same pattern) is what makes the page feel composed
  // rather than just "patterned everywhere".
  const dotGrid: React.CSSProperties = {
    backgroundImage: `radial-gradient(circle, ${isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)'} 1.2px, transparent 1.2px)`,
    backgroundSize: '22px 22px',
    backgroundPosition: '-1px -1px',
  };
  const diagStripes: React.CSSProperties = {
    backgroundImage: `repeating-linear-gradient(45deg, transparent 0 18px, ${
      isDarkMode ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.04)'
    } 18px 19px)`,
  };

  // Oversized hollow/outlined number, editorial-magazine style. Visible enough
  // to read structure but never dominant — uses `-webkit-text-stroke` for a
  // brutalist outline that doesn't fill mass on the section.
  const Ghost = ({ n }: { n: string }) => (
    <div
      aria-hidden
      className="pointer-events-none select-none absolute -top-6 right-2 md:right-6 font-display tracking-wider leading-[0.85] text-[180px] sm:text-[260px] md:text-[340px] lg:text-[420px]"
      style={{
        color: "transparent",
        WebkitTextStroke: `2px ${isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.14)"}`,
      }}
    >
      {n}
    </div>
  );

  const btnPrimary = `inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest brutalist-border brutalist-shadow transition-colors ${
    isDarkMode
      ? "bg-white text-black border-white hover:bg-zinc-200"
      : "bg-black text-white border-black hover:bg-zinc-800"
  }`;
  const btnSecondary = `inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest brutalist-border brutalist-shadow transition-colors ${
    isDarkMode
      ? "bg-black text-white border-white hover:bg-zinc-800"
      : "bg-white text-black border-black hover:bg-zinc-100"
  }`;

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}>
      <Header profileData={headerProfile} setSelectedCreator={() => {}} />

      {/* ─────────────────────────── HERO ─────────────────────────── */}
      <section className={`relative overflow-hidden border-b-2 ${border}`}>
        <div className="absolute inset-0">
          <img src={IMG.hero} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <div className={`absolute inset-0 ${isDarkMode ? "bg-black/70" : "bg-black/55"}`} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 lg:py-40 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 border-white/80 bg-black/30 backdrop-blur mb-6">
            <Sparkles className="w-3 h-3" />
            The cycling directory, curated
          </div>
          <h1 className="font-display tracking-wider text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.9] mb-6 max-w-5xl">
            DISCOVER<br className="hidden sm:block" /> INDEPENDENT<br className="hidden sm:block" /> CYCLING.
          </h1>
          <p className="text-base md:text-xl font-medium max-w-2xl mb-10 text-white/90">
            A handpicked map of the framebuilders, mechanics, organizers and storytellers
            moving cycling culture forward — anywhere in the world.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link to="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest border-2 border-white bg-white text-black hover:bg-zinc-200 transition-colors brutalist-shadow">
              {t("welcome.cta.explore")} <ArrowRight className="w-4 h-4" />
            </Link>
            <button onClick={() => openJoinModal("signup")} className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest border-2 border-white bg-transparent text-white hover:bg-white/10 transition-colors brutalist-shadow">
              {t("welcome.cta.join")}
            </button>
          </div>
        </div>
      </section>

      {/* ────────────────────────── MARQUEE ──────────────────────────
          Render the phrase 4× (even count) so the -50% keyframe loops on
          a copy boundary — zero gap when text wraps. */}
      <div className="marquee-container">
        <div className="marquee-content">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="mx-6">RIDE · BUILD · ORGANIZE · DOCUMENT · REPAIR · CONNECT ·</span>
          ))}
        </div>
      </div>

      {/* ────────────────────────── STATS ──────────────────────────
          Neutral row of bold KPIs. A single cell (the last, "FREE") flips to
          neon to give the strip an accent without making the whole section a
          neon wall. */}
      <section className={`border-b-2 ${border} ${sectionAlt}`} style={diagStripes}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { kpi: creatorCount > 0 ? `${creatorCount}+` : "∞", label: "Creators listed", accent: false },
            { kpi: countryCount > 0 ? `${countryCount}+` : "WW", label: "Countries", accent: false },
            { kpi: "5", label: "Categories", accent: false },
            { kpi: "Free", label: "For everyone", accent: true },
          ].map((s, i) => (
            <div
              key={i}
              className={`p-5 md:p-6 border-2 ${
                s.accent
                  ? "bg-[var(--color-rad-neon)] text-black border-black"
                  : `${border} ${cardBg}`
              }`}
            >
              <div className="font-display tracking-wider text-4xl md:text-6xl leading-none">{s.kpi}</div>
              <div className={`mt-3 text-[10px] font-bold uppercase tracking-widest ${
                s.accent ? "opacity-75" : muted
              }`}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────── WHAT IS DECYCLES ─────────────────────── */}
      <section className={`relative overflow-hidden border-b-2 ${border}`} style={dotGrid}>
        <Ghost n="01" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            <div className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${muted}`}>What is decycles</div>
            <h2 className="font-display tracking-wider text-4xl md:text-6xl mb-6 leading-[0.95]">
              A directory for the people<br />behind the rides.
            </h2>
            <p className={`text-base md:text-lg ${muted} mb-4`}>
              Cycling isn't built by faceless brands. It's built by framebuilders welding in
              their garages, mechanics keeping rides on the road, photographers chasing light,
              clubs lighting up Sunday mornings.
            </p>
            <p className={`text-base md:text-lg ${muted}`}>
              Decycles is one place to find them — searchable, mappable, and curated so the
              signal stays strong.
            </p>
          </div>
          <div className={`relative aspect-[4/5] border-2 ${border} overflow-hidden`}>
            <img src={IMG.workshop} alt="Workshop" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        </div>
      </section>

      {/* ────────────────────── VALUE: USERS ────────────────────── */}
      <section className={`relative overflow-hidden border-b-2 ${border} ${sectionAlt}`} style={diagStripes}>
        <Ghost n="02" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div>
              <div className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${muted}`}>For riders & enthusiasts</div>
              <h2 className="font-display tracking-wider text-4xl md:text-5xl">Find your people. Anywhere.</h2>
            </div>
            <Link to="/" className={btnSecondary}>Open the map <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {[
              { icon: Compass, title: "Discover", body: "Independent shops, builders and crews you'd never surface from a generic search." },
              { icon: Filter, title: "Filter sharply", body: "By country, category, subcategory. From titanium custom frames to local fixie groups." },
              { icon: Heart, title: "Save & return", body: "Favorite the ones you love, and they'll be there next time you're planning a trip or a build." },
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className={`p-6 border-2 ${border} ${cardBg} flex flex-col gap-3`}>
                  <Icon className="w-7 h-7" />
                  <h3 className="font-display tracking-wider text-2xl">{c.title}</h3>
                  <p className={`text-sm ${muted}`}>{c.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ────────────────────── VALUE: CREATORS ────────────────────── */}
      <section className={`relative overflow-hidden ${border}`} style={dotGrid}>
        <Ghost n="03" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className={`relative aspect-[4/5] border-2 ${border} overflow-hidden order-2 lg:order-1`}>
            <img src={IMG.ride} alt="Creators" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="order-1 lg:order-2">
            <div className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${muted}`}>For creators & shops</div>
            <h2 className="font-display tracking-wider text-4xl md:text-5xl mb-6 leading-[0.95]">
              Get found by people<br />who actually care.
            </h2>
            <ul className="space-y-4 mb-8">
              {[
                { t: "Free, forever", b: "No listing fees, no subscriptions, no take-rate." },
                { t: "Own your story", b: "Bio, gallery, links, location, events — all editable from your dashboard." },
                { t: "Global audience", b: "Visitors from anywhere can find you by country, category, or text search." },
                { t: "Built for craft", b: "Curated, not scraped. A directory you're proud to be on." },
              ].map((b, i) => (
                <li key={i} className="flex gap-3">
                  <div className={`shrink-0 w-6 h-6 border-2 ${border} flex items-center justify-center`}><Check className="w-4 h-4" /></div>
                  <div>
                    <div className="font-bold text-base">{b.t}</div>
                    <div className={`text-sm ${muted}`}>{b.b}</div>
                  </div>
                </li>
              ))}
            </ul>
            <button onClick={() => openJoinModal("signup")} className={btnPrimary}>
              {t("welcome.cta.apply")} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ────────────────────── CATEGORIES ────────────────────── */}
      <section className={`relative overflow-hidden border-b-2 ${border} ${sectionAlt}`} style={diagStripes}>
        <Ghost n="04" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${muted}`}>What's inside</div>
          <h2 className="font-display tracking-wider text-4xl md:text-5xl mb-10">Five worlds. One directory.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {CATEGORIES.map((c, i) => {
              const Icon = c.icon;
              return (
                <Link key={i} to="/" className={`group block border-2 ${border} ${cardBg} overflow-hidden transition-transform hover:-translate-y-0.5`}>
                  <div className="relative aspect-[5/3] overflow-hidden">
                    <img src={c.img} alt={c.label} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white">
                      <Icon className="w-5 h-5" />
                      <span className="font-display tracking-wider text-2xl">{c.label}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className={`text-sm ${muted}`}>{c.blurb}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ────────────────────── HOW IT WORKS ────────────────────── */}
      <section className={`relative overflow-hidden border-b-2 ${border}`} style={dotGrid}>
        <Ghost n="05" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${muted}`}>How it works</div>
          <h2 className="font-display tracking-wider text-4xl md:text-5xl mb-10">Three steps, no friction.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {[
              { n: "01", t: "Create your account", b: "Sign up in seconds with email or Google. Choose if you're here to discover or to be listed." },
              { n: "02", t: "Build your profile", b: "Creators add bio, photos, location, links and events. Visitors pick favorites and follow what they love." },
              { n: "03", t: "Get on the map", b: "Once published, your shop is searchable worldwide and pinned on the global creator map." },
            ].map((s, i) => (
              <div key={i} className={`relative p-6 md:p-8 border-2 ${border} ${cardBg}`}>
                <div className="font-display tracking-wider text-6xl md:text-7xl opacity-15 absolute top-2 right-3">{s.n}</div>
                <div className="font-display tracking-wider text-xl md:text-2xl mb-3 relative">{s.t}</div>
                <p className={`text-sm ${muted} relative`}>{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────── PRICING ────────────────────── */}
      <section className={`relative overflow-hidden border-b-2 ${border} ${sectionAlt}`} style={diagStripes}>
        <Ghost n="06" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center">
            <div className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${muted}`}>Pricing</div>
            <h2 className="font-display tracking-wider text-4xl md:text-6xl mb-4">Pick your plan.</h2>
            <p className={`text-base md:text-lg ${muted} mb-8 max-w-2xl mx-auto`}>
              Free is here to stay — during Beta and beyond. Paid plans unlock more power for the
              people who want it.
            </p>

            {/* Mode toggle — users vs creators */}
            <div className={`inline-flex border-2 ${border} ${cardBg} mb-10`} role="tablist" aria-label="Pricing audience">
              {(["users", "creators"] as const).map((m) => {
                const active = pricingMode === m;
                return (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setPricingMode(m)}
                    className={`px-5 md:px-7 py-2.5 text-xs md:text-sm font-bold uppercase tracking-widest transition-colors ${
                      active
                        ? isDarkMode ? "bg-white text-black" : "bg-black text-white"
                        : isDarkMode ? "text-gray-300 hover:bg-white/5" : "text-gray-600 hover:bg-black/5"
                    }`}
                  >
                    For {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3-plan grid. Free is live; paid tiers are placeholder until we
              wire up billing — they render a disabled "Coming soon" button. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 text-left">
            {PRICING[pricingMode].map((plan, i) => {
              const hl = plan.highlight;
              const isFree = plan.badge === "During Beta";
              return (
                <div
                  key={i}
                  className={`relative flex flex-col p-6 md:p-8 border-2 ${
                    hl
                      ? "border-black bg-[var(--color-rad-neon)] text-black"
                      : `${border} ${cardBg}`
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-4 left-6 px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-[var(--color-rad-neon)] text-black border-2 border-black">
                      {plan.badge}
                    </div>
                  )}
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${hl ? "opacity-70" : muted}`}>
                    {plan.name}
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-display tracking-wider text-5xl md:text-6xl leading-none">{plan.price}</span>
                    <span className={`text-xs font-bold uppercase tracking-widest ${hl ? "opacity-70" : muted}`}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={`text-sm mb-5 ${hl ? "opacity-80" : muted}`}>{plan.description}</p>
                  <ul className="space-y-2.5 text-sm mb-6 flex-1">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <Check className="w-4 h-4 shrink-0 mt-0.5" /> <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {isFree ? (
                    <button
                      type="button"
                      onClick={() => openJoinModal("signup")}
                      className={`inline-flex items-center justify-center gap-2 px-5 py-3 text-xs md:text-sm font-bold uppercase tracking-widest border-2 brutalist-shadow transition-colors ${
                        hl
                          ? "bg-black text-white border-black hover:bg-zinc-800"
                          : isDarkMode
                          ? "bg-white text-black border-white hover:bg-zinc-200"
                          : "bg-black text-white border-black hover:bg-zinc-800"
                      }`}
                    >
                      {plan.cta} <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      aria-disabled
                      className={`inline-flex items-center justify-center gap-2 px-5 py-3 text-xs md:text-sm font-bold uppercase tracking-widest border-2 cursor-not-allowed opacity-60 ${
                        hl
                          ? "bg-black/15 text-black border-black/40"
                          : isDarkMode
                          ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                          : "bg-gray-100 text-gray-500 border-gray-300"
                      }`}
                    >
                      Coming soon
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className={`text-center text-xs font-bold uppercase tracking-widest mt-8 ${muted}`}>
            All prices in EUR. Cancel anytime. Free plan is permanent.
          </p>
        </div>
      </section>

      {/* ────────────────────────── FAQ ────────────────────────── */}
      <section className={`relative overflow-hidden border-b-2 ${border}`} style={dotGrid}>
        <Ghost n="07" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${muted}`}>FAQ</div>
          <h2 className="font-display tracking-wider text-4xl md:text-5xl mb-10">Common questions.</h2>
          <div className={`border-2 ${border} ${cardBg}`}>
            {FAQ_ITEMS.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={i} className={`border-b-2 last:border-b-0 ${subBorder}`}>
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className={`w-full flex items-center justify-between gap-4 px-5 py-5 text-left transition-colors ${
                      isDarkMode ? "hover:bg-zinc-800/60" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-base md:text-lg font-bold uppercase tracking-wide">{item.q}</span>
                    {open ? <Minus className="w-5 h-5 shrink-0" /> : <Plus className="w-5 h-5 shrink-0" />}
                  </button>
                  {open && (
                    <div className={`px-5 pb-5 -mt-1 text-sm md:text-base ${muted}`}>
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ────────────────────── FINAL CTA ────────────────────── */}
      <section className={`border-b-2 ${border} relative overflow-hidden`}>
        <div className="absolute inset-0">
          <img src={IMG.group} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-black/70" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center text-white">
          <h2 className="font-display tracking-wider text-5xl md:text-7xl mb-6 leading-[0.95]">
            READY TO ROLL?
          </h2>
          <p className="text-base md:text-xl max-w-2xl mx-auto mb-10 text-white/90">
            Whether you're here to find your next custom build, your next ride crew,
            or to put your shop on the map — start now.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link to="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest border-2 border-white bg-white text-black hover:bg-zinc-200 transition-colors brutalist-shadow">
              Enter the platform <ArrowRight className="w-4 h-4" />
            </Link>
            <button onClick={() => openJoinModal("signup")} className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest border-2 border-white bg-transparent text-white hover:bg-white/10 transition-colors brutalist-shadow">
              Create your account
            </button>
          </div>
        </div>
      </section>

      {/* ────────────────────────── FOOTER ──────────────────────────
          Mobile gets a compact two-column links block beside the logo to
          keep the footer short. Desktop keeps the original horizontal layout. */}
      <footer className={`${isDarkMode ? "bg-black" : "bg-white"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

          {/* MOBILE */}
          <div className="md:hidden flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="font-display tracking-wider text-2xl leading-none">DECYCLES.CC</div>
              <div className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${muted}`}>© {new Date().getFullYear()}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-widest text-right">
              <button
                type="button"
                onClick={() => setIsAboutModalOpen(true)}
                className="hover:opacity-70 transition-opacity"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(true)}
                className="hover:opacity-70 transition-opacity"
              >
                Contact
              </button>
              <a
                href="https://www.instagram.com/decycles.cc/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-70 transition-opacity"
              >
                Instagram
              </a>
              <Link to="/" className="hover:opacity-70 transition-opacity">
                Enter
              </Link>
            </div>
          </div>

          {/* DESKTOP */}
          <div className="hidden md:flex md:items-center md:justify-between gap-6">
            <div>
              <div className="font-display tracking-wider text-3xl">DECYCLES.CC</div>
              <div className={`text-xs font-bold uppercase tracking-widest mt-1 ${muted}`}>Discover cycling culture worldwide</div>
            </div>
            <div className="flex items-center gap-5">
              <a href="https://www.instagram.com/decycles.cc/" target="_blank" rel="noopener noreferrer" className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity">
                <Instagram className="w-4 h-4" /> Instagram
              </a>
              <Link to="/" className="text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity">
                Enter platform
              </Link>
            </div>
            <div className={`text-xs ${muted}`}>© {new Date().getFullYear()} Decycles.cc</div>
          </div>
        </div>
      </footer>

      {/* Header menu modals — mirror Home's pattern so About/Contact/Support work here too. */}
      {isAboutModalOpen && (
        <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} isDarkMode={isDarkMode} />
      )}
      {isContactModalOpen && (
        <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} isDarkMode={isDarkMode} />
      )}
      {isSupportModalOpen && (
        <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} isDarkMode={isDarkMode} />
      )}
    </div>
  );
}
