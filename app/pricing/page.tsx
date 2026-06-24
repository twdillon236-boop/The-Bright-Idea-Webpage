import { PricingCard } from "@/components/PricingCard";

const plans = [
  {
    name: "Bright Start",
    price: "$99/month",
    features: [
      "10 AI analyses/month",
      "Ads/SEO/Hybrid",
      "Saved history",
      "PDF export",
      "Email support",
    ],
  },
  {
    name: "Bright Growth",
    price: "$299/month",
    features: [
      "Unlimited analyses",
      "Priority AI responses",
      "Team collaboration up to 5 users",
      "AI strategy comparison",
      "Monthly health reports",
      "PDF exports",
      "Email support",
    ],
    highlight: true,
  },
  {
    name: "Bright Pro",
    price: "$599/month",
    features: [
      "Unlimited users",
      "White-label reports",
      "Advanced analytics dashboard",
      "Competitor monitoring",
      "Custom framework creation",
      "AI implementation checklists",
      "Priority support",
    ],
  },
  {
    name: "Bright Enterprise",
    price: "Custom Pricing",
    features: [
      "Dedicated account manager",
      "Unlimited analyses",
      "Team training",
      "Custom AI frameworks",
      "CRM integrations",
      "API integrations",
      "Custom reporting",
      "Enterprise onboarding",
    ],
  },
];

const consulting = [
  {
    name: "Business Strategy Session",
    price: "$1,500 one-time",
    points: ["Full AI business audit", "Consultant review", "Custom roadmap", "90-minute strategy meeting"],
  },
  {
    name: "Monthly Marketing Management",
    price: "Starting at $600/month",
    points: [
      "Meta Ads management",
      "Google Ads management",
      "SEO management",
      "Landing page optimization",
      "Monthly reporting",
      "Monthly strategy meeting",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-3xl font-semibold text-white">Pricing</h1>
        <p className="mt-2 text-slate-300">Plans built for solo operators through enterprise teams.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <PricingCard key={plan.name} {...plan} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">Consulting Offers</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {consulting.map((offer) => (
            <article key={offer.name} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-xl font-semibold text-white">{offer.name}</h3>
              <p className="mt-2 text-violet-200">{offer.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {offer.points.map((point) => (
                  <li key={point}>• {point}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
