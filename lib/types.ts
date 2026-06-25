export type MarketingMode = "ads" | "seo" | "hybrid";

export interface Framework {
  id: number;
  name: string;
  category: MarketingMode;
  purpose: string;
  bestFor: string;
  focusAreas: string[];
  aiInstructions: string;
}

export interface BusinessIntakePayload {
  businessName: string;
  industry: string;
  businessDescription: string;
  location: string;
  websiteUrl: string;
  yearsInBusiness: string;
  numberOfEmployees: string;
  monthlyRevenue: string;
  averageSaleTicketSize: string;
  monthlyLeads: string;
  closeRate: string;
  marketingBudget: string;
  currentMarketingChannels: string;
  biggestBusinessChallenge: string;
  mainBusinessGoal: string;
  idealCustomer: string;
  biggestCompetitor: string;
  additionalNotes: string;
}

/** Structured data extracted from crawling the user's website. */
export interface WebsiteAnalysis {
  /** The normalized URL that was crawled. */
  url: string;
  /** List of page URLs successfully crawled. */
  pagesCrawled: string[];
  /** Page title tags found across crawled pages. */
  titleTags: string[];
  /** Meta description values found across crawled pages. */
  metaDescriptions: string[];
  /** H1 heading text found across crawled pages. */
  h1s: string[];
  /** H2 heading text found across crawled pages. */
  h2s: string[];
  /** URLs of pages that appear to describe services or products. */
  servicePagesFound: string[];
  /** Phone numbers and email addresses detected on crawled pages. */
  contactInfoFound: string[];
  /** CTA button/link text detected across crawled pages. */
  ctaExamples: string[];
  /** Snippets containing trust-signal keywords (reviews, guarantees, etc.). */
  trustSignals: string[];
  /** Summary of image alt-text coverage. */
  imageAltTextSummary: string;
  /** Summary of internal and external link counts. */
  internalLinkSummary: string;
  /** Short content excerpts from each crawled page for AI context. */
  contentSummary: string;
  /** Auto-detected SEO/conversion issues. */
  issuesDetected: string[];
  /** Auto-detected improvement opportunities. */
  opportunitiesDetected: string[];
  /** Set when the crawl encountered an error. Human-readable message. */
  crawlError?: string;
  /** True when the site actively blocked crawling (403/robots/timeout). */
  crawlBlocked?: boolean;
}

export interface AnalyzeRequest {
  mode: MarketingMode;
  payload: BusinessIntakePayload;
}

export interface AnalyzeResponse {
  analysis: string;
  /** Present when crawling encountered an issue the user should know about. */
  crawlWarning?: string;
}
