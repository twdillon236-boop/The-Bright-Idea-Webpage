"use client";

import { useMemo, useState } from "react";
import { FrameworkCard } from "@/components/FrameworkCard";
import { frameworks } from "@/lib/frameworks";
import type { MarketingMode } from "@/lib/types";

type FilterMode = MarketingMode | "all";

const filters: FilterMode[] = ["all", "ads", "seo", "hybrid"];

export default function FrameworksPage() {
  const [activeFilter, setActiveFilter] = useState<FilterMode>("all");

  const visibleFrameworks = useMemo(
    () => (activeFilter === "all" ? frameworks : frameworks.filter((framework) => framework.category === activeFilter)),
    [activeFilter],
  );

  return (
    <div>
      <h1 className="text-3xl font-semibold text-white">Framework Library</h1>
      <p className="mt-2 text-slate-300">All 18 Bright Idea AI frameworks in one source of truth.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium uppercase ${
              activeFilter === filter
                ? "bg-violet-500/30 text-violet-100"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleFrameworks.map((framework) => (
          <FrameworkCard key={framework.id} framework={framework} />
        ))}
      </div>
    </div>
  );
}
