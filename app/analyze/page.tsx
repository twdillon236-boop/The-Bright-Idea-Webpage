"use client";

import { useState } from "react";
import { AnalysisReport } from "@/components/AnalysisReport";
import { BusinessForm } from "@/components/BusinessForm";
import { ModeSelector } from "@/components/ModeSelector";
import type { MarketingMode } from "@/lib/types";

const unavailableMessage = "AI services are currently unavailable. Please try again later.";

export default function AnalyzePage() {
  const [mode, setMode] = useState<MarketingMode>("ads");
  const [report, setReport] = useState("");

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-3xl font-semibold text-white">Analyze Your Business</h1>
        <p className="mt-2 text-slate-300">Choose your marketing mode and submit your intake for a live AI recommendation.</p>
        <div className="mt-6">
          <ModeSelector value={mode} onChange={(next) => setMode(next)} />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <BusinessForm mode={mode} onComplete={(analysis) => setReport(analysis)} />
      </section>

      {report ? (
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-white">AI Analysis Report</h2>
          <AnalysisReport report={report} />
        </section>
      ) : (
        <p className="text-sm text-slate-400">{unavailableMessage !== report ? "Submit the form to receive your report." : unavailableMessage}</p>
      )}
    </div>
  );
}
