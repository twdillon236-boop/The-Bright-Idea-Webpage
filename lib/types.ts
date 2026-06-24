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

export interface AnalyzeRequest {
  mode: MarketingMode;
  payload: BusinessIntakePayload;
}

export interface AnalyzeResponse {
  analysis: string;
}
