import type { Framework } from "@/lib/types";

interface FrameworkCardProps {
  framework: Framework;
}

export function FrameworkCard({ framework }: FrameworkCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
      <p className="mb-2 inline-flex rounded-full bg-violet-500/20 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-violet-100">
        {framework.category}
      </p>
      <h3 className="text-lg font-semibold text-white">{framework.name}</h3>
      <p className="mt-2 text-sm text-slate-300">{framework.purpose}</p>
      <p className="mt-3 text-sm text-slate-300">
        <span className="font-medium text-slate-100">Best for: </span>
        {framework.bestFor}
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
        {framework.focusAreas.map((focus) => (
          <li key={focus} className="rounded-lg bg-white/5 px-2 py-1">
            {focus}
          </li>
        ))}
      </ul>
    </article>
  );
}
