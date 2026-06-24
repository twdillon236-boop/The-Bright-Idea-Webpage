"use client";

import { useState } from "react";
import type { AnalyzeResponse, BusinessIntakePayload, MarketingMode } from "@/lib/types";

const unavailableMessage = "AI services are currently unavailable. Please try again later.";

const initialState: BusinessIntakePayload = {
  businessName: "",
  industry: "",
  businessDescription: "",
  location: "",
  websiteUrl: "",
  yearsInBusiness: "",
  numberOfEmployees: "",
  monthlyRevenue: "",
  averageSaleTicketSize: "",
  monthlyLeads: "",
  closeRate: "",
  marketingBudget: "",
  currentMarketingChannels: "",
  biggestBusinessChallenge: "",
  mainBusinessGoal: "",
  idealCustomer: "",
  biggestCompetitor: "",
  additionalNotes: "",
};

type FieldConfig = { key: keyof BusinessIntakePayload; label: string; multiline?: boolean; type?: "text" | "url" };

const fields: FieldConfig[] = [
  { key: "businessName", label: "Business Name" },
  { key: "industry", label: "Industry" },
  { key: "businessDescription", label: "Business Description", multiline: true },
  { key: "location", label: "Location" },
  { key: "websiteUrl", label: "Website URL", type: "url" },
  { key: "yearsInBusiness", label: "Years in Business" },
  { key: "numberOfEmployees", label: "Number of Employees" },
  { key: "monthlyRevenue", label: "Monthly Revenue" },
  { key: "averageSaleTicketSize", label: "Average Sale / Ticket Size" },
  { key: "monthlyLeads", label: "Monthly Leads" },
  { key: "closeRate", label: "Close Rate" },
  { key: "marketingBudget", label: "Marketing Budget" },
  { key: "currentMarketingChannels", label: "Current Marketing Channels", multiline: true },
  { key: "biggestBusinessChallenge", label: "Biggest Business Challenge", multiline: true },
  { key: "mainBusinessGoal", label: "Main Business Goal", multiline: true },
  { key: "idealCustomer", label: "Ideal Customer", multiline: true },
  { key: "biggestCompetitor", label: "Biggest Competitor" },
  { key: "additionalNotes", label: "Additional Notes", multiline: true },
];

interface BusinessFormProps {
  mode: MarketingMode;
  onComplete: (report: string) => void;
}

export function BusinessForm({ mode, onComplete }: BusinessFormProps) {
  const [formData, setFormData] = useState<BusinessIntakePayload>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, payload: formData }),
      });

      if (!response.ok) {
        setError(unavailableMessage);
        return;
      }

      const data = (await response.json()) as AnalyzeResponse;
      if (!data.analysis) {
        setError(unavailableMessage);
        return;
      }

      onComplete(data.analysis);
    } catch {
      setError(unavailableMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map(({ key, label, multiline, type = "text" }) => (
          <label key={key} className={multiline ? "md:col-span-2" : ""}>
            <span className="mb-1 block text-sm font-medium text-slate-200">{label}</span>
            {multiline ? (
              <textarea
                required
                value={formData[key]}
                onChange={(event) => setFormData((prev) => ({ ...prev, [key]: event.target.value }))}
                className="min-h-24 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-violet-300 focus:ring"
              />
            ) : (
              <input
                required
                type={type}
                value={formData[key]}
                onChange={(event) => setFormData((prev) => ({ ...prev, [key]: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-violet-300 focus:ring"
              />
            )}
          </label>
        ))}
      </div>

      {error ? <p className="text-sm font-medium text-rose-300">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Analyzing..." : "Analyze My Business"}
      </button>
    </form>
  );
}
