import Link from "next/link";
import { frameworks } from "@/lib/frameworks";

const modeCards = [
  { name: "Ads", description: "Paid acquisition frameworks for fast lead growth." },
  { name: "SEO", description: "Organic visibility systems for durable demand." },
  { name: "Hybrid", description: "Cross-channel strategy for full-funnel performance." },
];

const pricingPreview = [
  { name: "Bright Start", price: "$99/month" },
  { name: "Bright Growth", price: "$299/month" },
  { name: "Bright Pro", price: "$599/month" },
  { name: "Bright Enterprise", price: "Custom" },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/30 via-slate-900 to-slate-950 p-8 sm:p-12">
        <p className="text-sm uppercase tracking-widest text-violet-200">Bright Idea AI</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight text-white sm:text-5xl">
          AI-powered marketing consulting for your highest-impact next move.
        </h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Submit your business details, choose your mode, and receive a live consultant-style recommendation with a custom execution plan.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/analyze" className="rounded-xl bg-violet-500 px-5 py-2.5 font-semibold text-white">
            Start Analysis
          </Link>
          <Link href="/frameworks" className="rounded-xl border border-white/20 px-5 py-2.5 font-semibold text-slate-100">
            Explore Frameworks
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">How it works</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {["Choose a mode", "Submit business intake", "Get AI strategy report"].map((step, index) => (
            <article key={step} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-wider text-violet-200">Step {index + 1}</p>
              <p className="mt-2 text-lg font-semibold text-white">{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">Marketing modes</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {modeCards.map((mode) => (
            <article key={mode.name} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-semibold text-white">{mode.name}</h3>
              <p className="mt-2 text-sm text-slate-300">{mode.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold text-white">Framework library preview</h2>
          <Link href="/frameworks" className="text-sm font-medium text-violet-200">
            View all 18 frameworks →
          </Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {frameworks.slice(0, 6).map((framework) => (
            <article key={framework.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="font-semibold text-white">{framework.name}</h3>
              <p className="mt-2 text-sm text-slate-300">{framework.purpose}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold text-white">Pricing preview</h2>
          <Link href="/pricing" className="text-sm font-medium text-violet-200">
            See full pricing →
          </Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {pricingPreview.map((plan) => (
            <article key={plan.name} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="font-semibold text-white">{plan.name}</h3>
              <p className="mt-2 text-violet-200">{plan.price}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
        <h2 className="text-3xl font-semibold text-white">Ready for your next bright idea?</h2>
        <p className="mt-3 text-slate-300">Get a focused, live AI recommendation in minutes.</p>
        <Link href="/analyze" className="mt-6 inline-block rounded-xl bg-violet-500 px-5 py-2.5 font-semibold text-white">
          Analyze My Business
        </Link>
      </section>
    </div>
  );
}
