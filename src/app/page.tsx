"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const badges = [
  "Free to use",
  "No account required",
  "Multilingual support",
  "AI-powered triage"
];

const steps = [
  {
    icon: "\u{1F4AC}",
    title: "Describe Symptoms",
    description: "Type or speak your symptoms in any supported language"
  },
  {
    icon: "\u{1F916}",
    title: "AI Triage",
    description: "Get instant urgency assessment: Green, Yellow, or Red"
  },
  {
    icon: "\u{1F5FA}\uFE0F",
    title: "Find Care",
    description: "Locate nearest clinics and download a doctor-ready summary"
  }
];

const heroVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: "easeOut"
    }
  }
};

const cardContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: "easeOut"
    }
  }
};

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <motion.section
        variants={heroVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 px-5 py-10 text-center shadow-panel backdrop-blur-xl sm:px-8 sm:py-14"
      >
        <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-90" />
        <div className="pointer-events-none absolute inset-0 bg-medical-grid bg-[size:24px_24px] opacity-40" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center">
          <div className="text-6xl sm:text-7xl" aria-hidden="true">
            {"\u{1F3E5}"}
          </div>
          <h1 className="mt-5 font-[family-name:var(--font-serif)] text-4xl leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Your Health, <span className="text-brand-600">Understood Instantly</span>
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
            AI-powered symptom triage for rural and underserved communities. Get
            instant urgency assessment, find nearby clinics, and prepare for your
            doctor visit - all in your language.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
            <Link
              href="/triage"
              aria-label="Start symptom check"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700"
            >
              {"\u{1F50D}"} Start Symptom Check
            </Link>
            <Link
              href="/map"
              aria-label="Find nearest clinic"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-brand-200 bg-white px-6 py-3 text-sm font-semibold text-brand-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50"
            >
              {"\u{1F4CD}"} Find Nearest Clinic
            </Link>
          </div>

          <a
            href="#how-it-works"
            aria-label="Jump to how it works section"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-5 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            How it works
          </a>

          <div className="mt-7 grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {badges.map((badge) => (
              <div
                key={badge}
                className="flex items-center justify-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-health-forest"
              >
                <span aria-hidden="true">{"\u2705"}</span>
                <span>{badge}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <section id="how-it-works" className="scroll-mt-28 space-y-6">
        <div className="mx-auto max-w-2xl text-center">
          <a
            href="#how-it-works"
            aria-label="How MedLens works"
            className="chip text-brand-700"
          >
            How it works
          </a>
          <h2 className="mt-4 font-[family-name:var(--font-serif)] text-3xl text-slate-900 sm:text-4xl">
            From symptoms to next steps in three simple stages.
          </h2>
        </div>

        <motion.div
          variants={cardContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-4 md:grid-cols-3"
        >
          {steps.map((step) => (
            <motion.article
              key={step.title}
              variants={cardVariants}
              className="panel-strong flex flex-col items-center text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-3xl">
                {step.icon}
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {step.description}
              </p>
            </motion.article>
          ))}
        </motion.div>
      </section>
    </div>
  );
}

