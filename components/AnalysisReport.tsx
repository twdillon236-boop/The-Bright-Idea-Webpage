const sectionTitles = [
  "Executive Summary",
  "Biggest Bottleneck",
  "Recommended Framework",
  "Confidence Level",
  "Why This Framework Was Chosen",
  "Why The Other Frameworks Were Not Chosen",
  "Custom Strategy",
  "30-Day Action Plan",
  "Quick Wins",
  "Long-Term Strategy",
  "Follow-Up Questions",
  "Final Consultant Notes",
  "Website Findings",
] as const;

function sectionContent(report: string, title: string) {
  const marker = `${title}:`;
  const start = report.indexOf(marker);
  if (start === -1) return "";

  const remainder = report.slice(start + marker.length);
  const nextIndices = sectionTitles
    .map((candidate) => remainder.indexOf(`${candidate}:`))
    .filter((index) => index >= 0);

  const end = nextIndices.length > 0 ? Math.min(...nextIndices) : remainder.length;
  return remainder.slice(0, end).trim();
}

export function AnalysisReport({ report }: { report: string }) {
  return (
    <section className="grid gap-4">
      {sectionTitles.map((title) => {
        const content = sectionContent(report, title);
        if (!content) return null;

        return (
          <article key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-base font-semibold text-violet-100">{title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{content}</p>
          </article>
        );
      })}
    </section>
  );
}
