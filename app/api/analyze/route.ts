import { NextResponse } from "next/server";
import OpenAI from "openai";
import { frameworks } from "@/lib/frameworks";
import { crawlWebsite } from "@/lib/crawler";
import type { AnalyzeRequest, BusinessIntakePayload, MarketingMode, WebsiteAnalysis } from "@/lib/types";

const unavailableMessage = "AI services are currently unavailable. Please try again later.";

const requiredKeys: (keyof BusinessIntakePayload)[] = [
  "businessName",
  "industry",
  "businessDescription",
  "location",
  "websiteUrl",
  "yearsInBusiness",
  "numberOfEmployees",
  "monthlyRevenue",
  "averageSaleTicketSize",
  "monthlyLeads",
  "closeRate",
  "marketingBudget",
  "currentMarketingChannels",
  "biggestBusinessChallenge",
  "mainBusinessGoal",
  "idealCustomer",
  "biggestCompetitor",
  "additionalNotes",
];

const isMode = (value: unknown): value is MarketingMode => value === "ads" || value === "seo" || value === "hybrid";

const isPayload = (value: unknown): value is BusinessIntakePayload => {
  if (!value || typeof value !== "object") return false;
  return requiredKeys.every((key) => {
    const candidate = (value as Record<string, unknown>)[key];
    return typeof candidate === "string" && candidate.trim().length > 0;
  });
};

const getResponseText = (response: OpenAI.Responses.Response): string => {
  if (response.output_text && response.output_text.trim()) {
    return response.output_text.trim();
  }

  return response.output
    .flatMap((item) => (item.type === "message" ? item.content : []))
    .flatMap((content) => (content.type === "output_text" ? [content.text] : []))
    .join("\n")
    .trim();
};

/**
 * Builds the website analysis section of the AI prompt.
 * If crawling was blocked or failed, returns a concise note so the AI can
 * acknowledge the limitation in the Website Findings section.
 */
function buildWebsiteAnalysisPromptSection(analysis: WebsiteAnalysis): string {
  if (analysis.crawlError) {
    return `Website Analysis:
Note: ${analysis.crawlError}
The Website Findings section should reflect that the website could not be analyzed and should acknowledge this limitation clearly.`;
  }

  return `Website Analysis (crawled ${analysis.pagesCrawled.length} page(s)):
URL: ${analysis.url}
Pages Crawled: ${analysis.pagesCrawled.join(", ")}
Title Tags: ${analysis.titleTags.join(" | ")}
Meta Descriptions: ${analysis.metaDescriptions.join(" | ")}
H1 Headings: ${analysis.h1s.join(" | ")}
H2 Headings: ${analysis.h2s.slice(0, 10).join(" | ")}
Service Pages Found: ${analysis.servicePagesFound.join(", ")}
Contact Info Detected: ${analysis.contactInfoFound.join(", ")}
CTA Examples: ${analysis.ctaExamples.join(" | ")}
Trust Signals: ${analysis.trustSignals.join(" | ")}
Image Alt Text: ${analysis.imageAltTextSummary}
Internal Links: ${analysis.internalLinkSummary}
Detected Issues: ${analysis.issuesDetected.join("; ")}
Detected Opportunities: ${analysis.opportunitiesDetected.join("; ")}
Content Excerpts:
${analysis.contentSummary}`;
}

export async function POST(request: Request) {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      console.error("OPENAI_API_KEY missing");
      return NextResponse.json({ error: unavailableMessage }, { status: 503 });
    }

    const body = (await request.json()) as Partial<AnalyzeRequest>;
    if (!isMode(body.mode) || !isPayload(body.payload)) {
      return NextResponse.json({ error: unavailableMessage }, { status: 400 });
    }

    // ── Website Crawl ──────────────────────────────────────────────────────────
    // Crawl always runs server-side before the AI call.
    // Failures are captured in the analysis object and do not block the report.
    const websiteAnalysis: WebsiteAnalysis = await crawlWebsite(body.payload.websiteUrl);
    const crawlWarning = websiteAnalysis.crawlError ?? undefined;

    const availableFrameworks = frameworks.filter((framework) => framework.category === body.mode);
    const client = new OpenAI({ apiKey: key });

    const websiteSection = buildWebsiteAnalysisPromptSection(websiteAnalysis);

    const prompt = `You are a senior marketing consultant. Analyze this business submission and recommend exactly one framework from the provided list only. Do not invent frameworks.

IMPORTANT RULES:
- Use ONLY data from the website crawl evidence and the business submission. Do not invent specifics.
- Use realistic, evidence-based language: "may improve", "could help", "likely opportunity", "based on available website content", "not enough evidence".
- Never make guarantees like "you will get X leads", "you will rank #1", or "you will double revenue".
- If website data was not available, acknowledge that in the Website Findings section.

Business submission:
${JSON.stringify(body.payload, null, 2)}

${websiteSection}

Available frameworks (${body.mode.toUpperCase()} mode only):
${JSON.stringify(availableFrameworks, null, 2)}

Your response must use exactly these section headings:
Executive Summary:
Biggest Bottleneck:
Recommended Framework:
Confidence Level:
Why This Framework Was Chosen:
Why The Other Frameworks Were Not Chosen:
Custom Strategy:
30-Day Action Plan:
Quick Wins:
Long-Term Strategy:
Follow-Up Questions:
Final Consultant Notes:
Website Findings:

In the "Why The Other Frameworks Were Not Chosen" section, include each non-selected framework by name and explain why it is not the best primary choice right now.

In the "Website Findings" section, include:
- Pages analyzed (list the URLs crawled, or note if site was inaccessible)
- What was detected (CTAs, contact info, trust signals, headings)
- SEO issues found (missing titles, meta descriptions, H1s, alt text gaps)
- Conversion issues found (missing or weak CTAs)
- Trust signals present or absent
- Recommended fixes with realistic impact language
- Confidence level for this section (based on how much crawl data was available)

Use specific evidence from the crawl data where available. For example: "Your homepage CTA reads '[detected text]' — a stronger CTA such as 'Get a Free Quote' may improve lead intent."
Do not fabricate website details that were not in the crawl data.`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
    });

    const analysis = getResponseText(response);
    if (!analysis) {
      console.error("OpenAI response missing text output", response.id);
      return NextResponse.json({ error: unavailableMessage }, { status: 503 });
    }

    return NextResponse.json({ analysis, crawlWarning });
  } catch (error) {
    console.error("Analyze API failure", error);
    return NextResponse.json({ error: unavailableMessage }, { status: 503 });
  }
}
