interface PricingCardProps {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
}

export function PricingCard({ name, price, features, highlight = false }: PricingCardProps) {
  return (
    <article
      className={`rounded-2xl border p-6 ${
        highlight
          ? "border-violet-400 bg-gradient-to-b from-violet-500/20 to-slate-900"
          : "border-white/10 bg-white/5"
      }`}
    >
      <h3 className="text-xl font-semibold text-white">{name}</h3>
      <p className="mt-2 text-2xl font-bold text-violet-200">{price}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-300">
        {features.map((feature) => (
          <li key={feature}>• {feature}</li>
        ))}
      </ul>
    </article>
  );
}
