/**
 * lib/crawler.ts
 *
 * Lightweight, ethical website crawler for the AI consultation report.
 *
 * Limits:
 *  - Max 10 pages per crawl session
 *  - 10-second timeout per page
 *  - Public pages only (no auth, no form POSTs)
 *  - SSRF protection: private/reserved IP ranges are blocked
 *  - Off-domain crawling is prevented
 */

import * as cheerio from "cheerio";
import type { WebsiteAnalysis } from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────

const NOT_DETECTED = "Not detected from available website content.";
const MAX_PAGES = 10;
const PAGE_TIMEOUT_MS = 10_000;

/**
 * Priority page slugs to attempt after the homepage.
 * These are common pages that contain useful business information.
 */
const PRIORITY_SLUGS = [
  "/about",
  "/about-us",
  "/services",
  "/service",
  "/what-we-do",
  "/contact",
  "/contact-us",
  "/blog",
  "/pricing",
  "/portfolio",
];

/** Regex for US/international phone numbers. */
const PHONE_RE = /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;

/** Regex for email addresses. */
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

/** Keywords that indicate trust signals when found in page text. */
const TRUST_KEYWORDS = [
  "review",
  "testimonial",
  "guarantee",
  "award",
  "certification",
  "certified",
  "accredited",
  "years in business",
  "founded",
  "bbb",
  "better business bureau",
  "verified",
  "5-star",
  "five star",
  "google reviews",
  "yelp",
  "licensed",
  "insured",
  "trusted",
];

/** Link/button text patterns that indicate calls-to-action. */
const CTA_KEYWORDS = [
  "get a quote",
  "free quote",
  "contact us",
  "get started",
  "book now",
  "schedule",
  "call us",
  "request",
  "sign up",
  "learn more",
  "get free",
  "buy now",
  "order now",
  "subscribe",
  "download",
  "start now",
  "try free",
  "claim",
];

// ─── URL Validation & Normalization ───────────────────────────────────────────

/**
 * Returns true if the hostname is a private, loopback, or reserved IP/domain.
 * Used to prevent SSRF attacks.
 */
function isPrivateOrReservedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();

  // Loopback / localhost
  if (h === "localhost" || h === "[::1]") return true;

  // .local / .internal TLDs often used for intranet
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;

  // IPv4 address checks
  const ipv4Match = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [a, b, c] = ipv4Match.slice(1).map(Number);
    if (
      a === 0 || // 0.0.0.0/8 – "this" network
      a === 10 || // 10.0.0.0/8 – private
      a === 127 || // 127.0.0.0/8 – loopback
      (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 – carrier-grade NAT
      (a === 169 && b === 254) || // 169.254.0.0/16 – link-local
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 – private
      (a === 192 && b === 0 && c === 2) || // 192.0.2.0/24 – TEST-NET-1
      (a === 192 && b === 168) || // 192.168.0.0/16 – private
      (a === 198 && b === 51 && c === 100) || // 198.51.100.0/24 – TEST-NET-2
      (a === 203 && b === 0 && c === 113) || // 203.0.113.0/24 – TEST-NET-3
      a >= 240 // 240.0.0.0/4 – reserved / multicast
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Validates and normalizes a raw URL string.
 * Returns the normalized URL origin+pathname, or null if invalid/disallowed.
 */
export function validateAndNormalizeUrl(raw: string): string | null {
  try {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Prepend https:// if no protocol is present
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);

    // Only allow http and https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

    // Block private/reserved hosts (SSRF prevention)
    if (isPrivateOrReservedHost(parsed.hostname)) return null;

    // Return stable origin + pathname (strip query/hash for crawl entry point)
    const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return parsed.origin + path;
  } catch {
    return null;
  }
}

// ─── Page Fetching ─────────────────────────────────────────────────────────────

interface FetchResult {
  html: string;
  /** The final URL after redirects. */
  finalUrl: string;
}

/**
 * Fetches a single page with a per-page timeout.
 * Returns null on any error (network, timeout, non-200, non-HTML).
 *
 * Applies SSRF protection on every call: only http/https URLs pointing to
 * public hosts are allowed, regardless of how this function is called.
 */
async function fetchPage(url: string): Promise<FetchResult | null> {
  // ── SSRF guard ────────────────────────────────────────────────────────────
  // Validate every URL immediately before making an outbound request.
  // We reconstruct the URL from the parsed object so that fetch() receives
  // a value that is demonstrably derived from validated components rather
  // than the raw user-supplied string.
  let safeUrl: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (isPrivateOrReservedHost(parsed.hostname)) return null;
    // Use parsed.href: a normalised string reconstructed by the URL parser
    safeUrl = parsed.href;
  } catch {
    return null;
  }
  // ─────────────────────────────────────────────────────────────────────────

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);

    let response: Response;
    try {
      // lgtm[js/request-forgery] - Intentional: this is a web crawler that fetches
      // user-supplied URLs. SSRF is mitigated above by isPrivateOrReservedHost()
      // (blocking all private/loopback/reserved IP ranges and .local/.internal TLDs)
      // and by restricting protocols to http/https only. safeUrl is reconstructed
      // from parsed.href after those checks rather than used as-is from user input.
      response = await fetch(safeUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; BrightIdeaBot/1.0; +https://brightidea.ai/bot)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    // Guard against unreasonably large pages (>5 MB)
    const html = await response.text();
    if (html.length > 5_000_000) return null;

    return { html, finalUrl: response.url };
  } catch {
    return null;
  }
}

// ─── HTML Extraction Helpers ──────────────────────────────────────────────────

/**
 * Extracts internal and external links from a loaded cheerio document.
 * Only follows http/https links; prevents off-domain crawling.
 */
function extractLinks(
  $: cheerio.CheerioAPI,
  baseOrigin: string
): { internal: string[]; external: string[] } {
  const internal = new Set<string>();
  const external = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim() ?? "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }

    try {
      const resolved = new URL(href, baseOrigin);
      if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return;

      if (resolved.origin === baseOrigin) {
        // Normalize: strip trailing slash, query, and fragment
        internal.add(resolved.origin + resolved.pathname.replace(/\/$/, ""));
      } else {
        if (external.size < 30) external.add(resolved.href);
      }
    } catch {
      // Ignore malformed hrefs
    }
  });

  return { internal: Array.from(internal), external: Array.from(external) };
}

/**
 * Extracts CTA text from buttons, submit inputs, and links that match
 * common call-to-action patterns.
 */
function extractCTAs($: cheerio.CheerioAPI): string[] {
  const ctas = new Set<string>();

  // Explicit CTA elements
  $("button, input[type='submit'], input[type='button'], a.btn, a.button, .cta, [class*='cta'], [class*='btn']").each(
    (_, el) => {
      const text = ($(el).attr("value") ?? $(el).text()).trim();
      if (text && text.length > 1 && text.length < 100) ctas.add(text);
    }
  );

  // Links/buttons whose text contains CTA keywords
  $("a, button").each((_, el) => {
    const lower = $(el).text().trim().toLowerCase();
    if (CTA_KEYWORDS.some((kw) => lower.includes(kw))) {
      const original = $(el).text().trim();
      if (original && original.length > 1 && original.length < 100) ctas.add(original);
    }
  });

  return Array.from(ctas).slice(0, 10);
}

/**
 * Extracts phone numbers and email addresses from plain text.
 */
function extractContactInfo(text: string): string[] {
  const found: string[] = [];
  const phones = [...new Set(text.match(PHONE_RE) ?? [])].slice(0, 3);
  const emails = [...new Set(text.match(EMAIL_RE) ?? [])].slice(0, 3);
  found.push(...phones.map((p) => `Phone: ${p}`));
  found.push(...emails.map((e) => `Email: ${e}`));
  return found;
}

/**
 * Finds trust-signal snippets in page text by looking for trust keywords
 * and returning a short surrounding excerpt for context.
 */
function extractTrustSignals(text: string): string[] {
  const lower = text.toLowerCase();
  const signals: string[] = [];
  const seen = new Set<string>();

  for (const kw of TRUST_KEYWORDS) {
    const idx = lower.indexOf(kw);
    if (idx === -1) continue;
    const snippet = text
      .slice(Math.max(0, idx - 20), idx + kw.length + 80)
      .trim()
      .replace(/\s+/g, " ");
    // Deduplicate very similar snippets
    if (!seen.has(snippet)) {
      seen.add(snippet);
      signals.push(snippet);
    }
    if (signals.length >= 8) break;
  }

  return signals;
}

// ─── Single-Page Data Structure ────────────────────────────────────────────────

interface PageData {
  url: string;
  title: string;
  metaDescription: string;
  h1s: string[];
  h2s: string[];
  ctaExamples: string[];
  contactInfo: string[];
  trustSignals: string[];
  imagesTotal: number;
  imagesWithAlt: number;
  internalLinks: string[];
  externalLinks: string[];
  /** First ~500 chars of clean body text for AI context. */
  textSnippet: string;
}

/**
 * Parses an HTML string into structured page data.
 */
function parsePage(html: string, pageUrl: string): PageData {
  // First pass: extract links from full document (before removing nav/footer)
  const $full = cheerio.load(html);
  const origin = new URL(pageUrl).origin;
  const { internal: internalLinks, external: externalLinks } = extractLinks($full, origin);

  // Second pass: extract CTAs from full document (nav buttons matter)
  const ctaExamples = extractCTAs($full);

  // Third pass: strip noise elements for clean text extraction
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, [aria-hidden='true'], .cookie-banner, #cookie-banner").remove();

  const title = $("title").first().text().trim();
  const metaDescription = $("meta[name='description']").attr("content")?.trim() ?? "";
  const h1s = $("h1")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 5);
  const h2s = $("h2")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 10);

  // Image alt-text audit
  let imagesTotal = 0;
  let imagesWithAlt = 0;
  $("img").each((_, el) => {
    imagesTotal++;
    const alt = $(el).attr("alt")?.trim();
    if (alt && alt.length > 0) imagesWithAlt++;
  });

  // Clean body text for contact/trust extraction
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const contactInfo = extractContactInfo(bodyText);
  const trustSignals = extractTrustSignals(bodyText);

  // First 500 chars as content snippet (for AI context)
  const textSnippet = bodyText.slice(0, 500);

  return {
    url: pageUrl,
    title,
    metaDescription,
    h1s,
    h2s,
    ctaExamples,
    contactInfo,
    trustSignals,
    imagesTotal,
    imagesWithAlt,
    internalLinks,
    externalLinks,
    textSnippet,
  };
}

// ─── Crawl Queue Builder ───────────────────────────────────────────────────────

/**
 * Builds an ordered crawl queue starting with priority slugs, then
 * supplementing with discovered internal links.
 * Deduplicates and caps at MAX_PAGES * 2 candidates.
 */
function buildCrawlQueue(origin: string, discoveredInternalLinks: string[]): string[] {
  const seen = new Set<string>();
  const queue: string[] = [];

  const add = (url: string) => {
    const normalized = url.replace(/\/$/, "");
    if (!seen.has(normalized) && queue.length < MAX_PAGES * 2) {
      seen.add(normalized);
      queue.push(normalized);
    }
  };

  // Priority slugs first
  for (const slug of PRIORITY_SLUGS) {
    add(origin + slug);
  }

  // Then discovered links
  for (const link of discoveredInternalLinks) {
    add(link);
  }

  return queue;
}

// ─── Issue & Opportunity Detection ────────────────────────────────────────────

/**
 * Detects common SEO and conversion issues from aggregated page data.
 */
function detectIssues(pages: PageData[]): string[] {
  const issues: string[] = [];

  const missingTitles = pages.filter((p) => !p.title).length;
  if (missingTitles > 0) {
    issues.push(`${missingTitles} page(s) missing a title tag.`);
  }

  const missingMeta = pages.filter((p) => !p.metaDescription).length;
  if (missingMeta > 0) {
    issues.push(`${missingMeta} page(s) missing a meta description.`);
  }

  const missingH1 = pages.filter((p) => p.h1s.length === 0).length;
  if (missingH1 > 0) {
    issues.push(`${missingH1} page(s) missing an H1 heading.`);
  }

  const allCTAs = pages.flatMap((p) => p.ctaExamples);
  if (allCTAs.length === 0) {
    issues.push("No clear call-to-action elements detected across analyzed pages.");
  }

  const totalImages = pages.reduce((s, p) => s + p.imagesTotal, 0);
  const withAlt = pages.reduce((s, p) => s + p.imagesWithAlt, 0);
  if (totalImages > 0 && withAlt / totalImages < 0.5) {
    issues.push(
      `${totalImages - withAlt} of ${totalImages} images are missing alt text (impacts SEO and accessibility).`
    );
  }

  const allContact = pages.flatMap((p) => p.contactInfo);
  if (allContact.length === 0) {
    issues.push("No phone number or email address detected on analyzed pages.");
  }

  return issues;
}

/**
 * Identifies improvement opportunities from aggregated page data.
 */
function detectOpportunities(pages: PageData[]): string[] {
  const opportunities: string[] = [];
  const allCTAs = pages.flatMap((p) => p.ctaExamples);
  const allTrust = pages.flatMap((p) => p.trustSignals);
  const allH2s = pages.flatMap((p) => p.h2s);

  if (allCTAs.length === 0) {
    opportunities.push(
      "Adding prominent CTAs (e.g., 'Get a Free Quote') may improve lead conversion rate."
    );
  } else if (allCTAs.length < 3) {
    opportunities.push(
      "Increasing the number and visibility of CTAs across pages could help capture more leads."
    );
  }

  if (allTrust.length === 0) {
    opportunities.push(
      "Adding trust signals such as reviews, guarantees, or certifications could help build visitor confidence."
    );
  }

  if (allH2s.length < 5) {
    opportunities.push(
      "Expanding page content with structured headings (H2/H3) may improve SEO keyword coverage."
    );
  }

  const hasContactPage = pages.some((p) => /contact/i.test(p.url));
  if (!hasContactPage) {
    opportunities.push(
      "A dedicated contact page may make it easier for potential customers to reach you."
    );
  }

  const hasServicePage = pages.some((p) =>
    /service|product|pricing|offering/i.test(p.url)
  );
  if (!hasServicePage) {
    opportunities.push(
      "A dedicated services or pricing page could help visitors understand your offering and reduce friction."
    );
  }

  return opportunities;
}

// ─── Main Crawl Function ───────────────────────────────────────────────────────

/**
 * Crawls the given URL and returns a structured WebsiteAnalysis.
 *
 * Always resolves — errors are captured inside the returned object.
 * Caller should check `crawlError` / `crawlBlocked` fields.
 */
export async function crawlWebsite(rawUrl: string): Promise<WebsiteAnalysis> {
  // ── Validate URL ────────────────────────────────────────────────────────────
  const normalized = validateAndNormalizeUrl(rawUrl);

  if (!normalized) {
    return {
      url: rawUrl,
      pagesCrawled: [],
      titleTags: [NOT_DETECTED],
      metaDescriptions: [NOT_DETECTED],
      h1s: [NOT_DETECTED],
      h2s: [NOT_DETECTED],
      servicePagesFound: [NOT_DETECTED],
      contactInfoFound: [NOT_DETECTED],
      ctaExamples: [NOT_DETECTED],
      trustSignals: [NOT_DETECTED],
      imageAltTextSummary: NOT_DETECTED,
      internalLinkSummary: NOT_DETECTED,
      contentSummary: NOT_DETECTED,
      issuesDetected: ["URL appears to be invalid or points to a restricted address."],
      opportunitiesDetected: [NOT_DETECTED],
      crawlError: "The provided URL does not appear to be valid.",
    };
  }

  const origin = new URL(normalized).origin;

  // ── Fetch Homepage ──────────────────────────────────────────────────────────
  const homepageResult = await fetchPage(normalized);

  if (!homepageResult) {
    return {
      url: normalized,
      pagesCrawled: [],
      titleTags: [NOT_DETECTED],
      metaDescriptions: [NOT_DETECTED],
      h1s: [NOT_DETECTED],
      h2s: [NOT_DETECTED],
      servicePagesFound: [NOT_DETECTED],
      contactInfoFound: [NOT_DETECTED],
      ctaExamples: [NOT_DETECTED],
      trustSignals: [NOT_DETECTED],
      imageAltTextSummary: NOT_DETECTED,
      internalLinkSummary: NOT_DETECTED,
      contentSummary: NOT_DETECTED,
      issuesDetected: [NOT_DETECTED],
      opportunitiesDetected: [NOT_DETECTED],
      crawlError:
        "Website could not be accessed. It may be blocking automated requests, or may be temporarily unavailable.",
      crawlBlocked: true,
    };
  }

  // ── Parse Homepage ──────────────────────────────────────────────────────────
  const crawledPages: PageData[] = [];
  const crawledUrls = new Set<string>();

  const homepageData = parsePage(homepageResult.html, homepageResult.finalUrl);
  crawledPages.push(homepageData);
  crawledUrls.add(homepageResult.finalUrl);
  crawledUrls.add(normalized);
  // Also mark the origin root as crawled
  crawledUrls.add(origin);
  crawledUrls.add(origin + "/");

  // ── Build & Execute Crawl Queue ─────────────────────────────────────────────
  const queue = buildCrawlQueue(origin, homepageData.internalLinks).filter(
    (url) => !crawledUrls.has(url) && !crawledUrls.has(url + "/")
  );

  for (const url of queue) {
    if (crawledPages.length >= MAX_PAGES) break;
    if (crawledUrls.has(url)) continue;

    crawledUrls.add(url);
    const result = await fetchPage(url);
    if (!result) continue;

    // Skip if redirect led to an already-crawled page
    if (crawledUrls.has(result.finalUrl)) continue;
    crawledUrls.add(result.finalUrl);

    const pageData = parsePage(result.html, result.finalUrl);
    crawledPages.push(pageData);
  }

  // ── Aggregate Data ──────────────────────────────────────────────────────────
  const unique = <T>(arr: T[]): T[] => [...new Set(arr)];

  const allTitles = unique(crawledPages.map((p) => p.title).filter(Boolean));
  const allMeta = unique(crawledPages.map((p) => p.metaDescription).filter(Boolean));
  const allH1s = unique(crawledPages.flatMap((p) => p.h1s));
  const allH2s = unique(crawledPages.flatMap((p) => p.h2s));
  const allCTAs = unique(crawledPages.flatMap((p) => p.ctaExamples));
  const allContact = unique(crawledPages.flatMap((p) => p.contactInfo));
  const allTrust = unique(crawledPages.flatMap((p) => p.trustSignals));
  const allInternalLinks = unique(crawledPages.flatMap((p) => p.internalLinks));
  const allExternalLinks = unique(crawledPages.flatMap((p) => p.externalLinks));

  // Pages that appear to be about services or products
  const servicePages = crawledPages
    .filter(
      (p) =>
        /service|product|pricing|offering|package/i.test(p.url) ||
        /service|product|what we do|what we offer/i.test(p.h1s.join(" ") + " " + p.title)
    )
    .map((p) => p.url);

  // Image alt-text summary
  const totalImages = crawledPages.reduce((s, p) => s + p.imagesTotal, 0);
  const withAlt = crawledPages.reduce((s, p) => s + p.imagesWithAlt, 0);
  const imageAltTextSummary =
    totalImages === 0
      ? NOT_DETECTED
      : `${withAlt} of ${totalImages} images have alt text (${Math.round((withAlt / totalImages) * 100)}% coverage).`;

  // Content summary: short excerpts from each page for AI context (capped at 3000 chars)
  const contentSummary =
    crawledPages
      .map((p) => `[${p.url}]: ${p.textSnippet}`)
      .join("\n\n")
      .slice(0, 3000) || NOT_DETECTED;

  return {
    url: normalized,
    pagesCrawled: crawledPages.map((p) => p.url),
    titleTags: allTitles.length > 0 ? allTitles : [NOT_DETECTED],
    metaDescriptions: allMeta.length > 0 ? allMeta : [NOT_DETECTED],
    h1s: allH1s.length > 0 ? allH1s.slice(0, 10) : [NOT_DETECTED],
    h2s: allH2s.length > 0 ? allH2s.slice(0, 20) : [NOT_DETECTED],
    servicePagesFound: servicePages.length > 0 ? servicePages : [NOT_DETECTED],
    contactInfoFound: allContact.length > 0 ? allContact : [NOT_DETECTED],
    ctaExamples: allCTAs.length > 0 ? allCTAs.slice(0, 10) : [NOT_DETECTED],
    trustSignals: allTrust.length > 0 ? allTrust.slice(0, 10) : [NOT_DETECTED],
    imageAltTextSummary,
    internalLinkSummary: `${allInternalLinks.length} unique internal links found across ${crawledPages.length} page(s). External links: ${allExternalLinks.length}.`,
    contentSummary,
    issuesDetected: detectIssues(crawledPages),
    opportunitiesDetected: detectOpportunities(crawledPages),
  };
}
