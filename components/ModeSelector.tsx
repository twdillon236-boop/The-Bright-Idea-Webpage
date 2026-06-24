import type { MarketingMode } from "@/lib/types";

interface ModeSelectorProps {
  value: MarketingMode;
  onChange: (mode: MarketingMode) => void;
}

const modes: { value: MarketingMode; label: string; description: string }[] = [
  { value: "ads", label: "Ads", description: "Paid ad growth strategy" },
  { value: "seo", label: "SEO", description: "Organic search visibility" },
  { value: "hybrid", label: "Hybrid", description: "Cross-channel business growth" },
];

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {modes.map((mode) => {
        const active = mode.value === value;
        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={`rounded-xl border p-4 text-left transition ${
              active
                ? "border-violet-400 bg-violet-500/20"
                : "border-white/10 bg-white/5 hover:border-violet-300/60"
            }`}
          >
            <p className="font-semibold text-white">{mode.label} Mode</p>
            <p className="mt-1 text-xs text-slate-300">{mode.description}</p>
          </button>
        );
      })}
    </div>
  );
}
