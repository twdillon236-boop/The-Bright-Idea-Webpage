import { NextResponse } from "next/server";
import OpenAI from "openai";
import { frameworks } from "@/lib/frameworks";
import type { AnalyzeRequest, BusinessIntakePayload, MarketingMode } from "@/lib/types";

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

    const availableFrameworks = frameworks.filter((framework) => framework.category === body.mode);
    const client = new OpenAI({ apiKey: key });

    const prompt = `You are a senior marketing consultant. Analyze this business submission and recommend exactly one framework from the provided list only. Do not invent frameworks.

Business submission:
${JSON.stringify(body.payload, null, 2)}

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

In the "Why The Other Frameworks Were Not Chosen" section, include each non-selected framework by name and explain why it is not the best primary choice right now.`;

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

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Analyze API failure", error);
    return NextResponse.json({ error: unavailableMessage }, { status: 503 });
  }
}
