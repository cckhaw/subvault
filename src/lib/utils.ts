import { SUBVAULT_CONFIG } from "../../plasmo.config";

/** Tiny className joiner (no dependency needed). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ───────────── Domains ───────────── */

const MULTI_PART_TLDS = new Set([
  "co.uk", "org.uk", "ac.uk", "com.au", "net.au", "co.nz", "co.jp",
  "com.br", "co.in", "co.za", "com.mx", "com.sg", "com.hk"
]);

/** `https://app.figma.com/x` → `app.figma.com`; returns "" for anything unparsable. */
export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** `app.figma.com` → `figma.com`, `shop.bbc.co.uk` → `bbc.co.uk`. */
export function baseDomain(host: string): string {
  const clean = host.toLowerCase().replace(/^www\./, "");
  const labels = clean.split(".").filter(Boolean);
  if (labels.length <= 2) return clean;
  const lastTwo = labels.slice(-2).join(".");
  return MULTI_PART_TLDS.has(lastTwo) ? labels.slice(-3).join(".") : lastTwo;
}

/** True when `host` is `domain` or one of its subdomains. */
export function hostMatchesDomain(host: string, domain: string): boolean {
  if (!host || !domain) return false;
  const h = host.toLowerCase().replace(/^www\./, "");
  const d = domain.toLowerCase().replace(/^www\./, "");
  return h === d || h.endsWith(`.${d}`);
}

export function isPaymentProcessorHost(host: string): boolean {
  return SUBVAULT_CONFIG.checkoutHosts.some((p) => hostMatchesDomain(host, p));
}

/** Does this URL look like a signup / checkout / billing page? */
export function isCheckoutUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  const host = parsed.hostname.toLowerCase();
  if (isPaymentProcessorHost(host)) return true;
  const path = parsed.pathname.toLowerCase();
  return SUBVAULT_CONFIG.checkoutPathPatterns.some((p) => path.includes(p));
}

/** "midjourney.com" → "Midjourney". Prefers a cleaned page title when it is short. */
export function guessServiceName(host: string, pageTitle?: string): string {
  const base = baseDomain(host).split(".")[0] ?? host;
  const fromHost = base.charAt(0).toUpperCase() + base.slice(1);
  if (!pageTitle || isPaymentProcessorHost(host) === false) return fromHost;
  const cleaned = pageTitle.split(/[|\-–—·]/)[0].replace(/checkout|subscribe|sign ?up/gi, "").trim();
  return cleaned && cleaned.length <= 32 ? cleaned : fromHost;
}

/* ───────────── Dates (calendar days, local time) ───────────── */

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` in the user's local time zone. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parses `YYYY-MM-DD` as a local calendar date (no UTC shift). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(from: Date | string, days: number): string {
  const d = typeof from === "string" ? parseISODate(from) : new Date(from);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function startOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Whole days from today until the given date (negative = in the past). */
export function daysUntil(iso: string, now = new Date()): number {
  return Math.round((parseISODate(iso).getTime() - startOfToday(now).getTime()) / DAY_MS);
}

/** Whole days elapsed since an ISO timestamp or date. */
export function daysSince(iso: string, now = new Date()): number {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / DAY_MS));
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return parseISODate(iso).toLocaleDateString(undefined, opts ?? { month: "short", day: "numeric", year: "numeric" });
}

/** "in 3 days", "tomorrow", "today", "2 days ago". */
export function relativeDays(iso: string, now = new Date()): string {
  const n = daysUntil(iso, now);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${Math.abs(n)} days ago`;
}

/* ───────────── Money ───────────── */

export function formatCurrency(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function monthlyCost(sub: { cost: number; billingCycle: "monthly" | "yearly" }): number {
  return sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost;
}

/** Next renewal on/after today, rolling a stale date forward by whole billing cycles. */
export function nextRenewal(sub: { renewalDate: string; billingCycle: "monthly" | "yearly" }, now = new Date()): string {
  let d = parseISODate(sub.renewalDate);
  const today = startOfToday(now);
  let guard = 0;
  while (d < today && guard++ < 600) {
    d = new Date(d.getFullYear() + (sub.billingCycle === "yearly" ? 1 : 0), d.getMonth() + (sub.billingCycle === "monthly" ? 1 : 0), d.getDate());
  }
  return toISODate(d);
}

export function safeFileName(name: string): string {
  return name.trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Subscription";
}

/** Open a URL in a new tab (extension API when available, window.open otherwise). */
export function openExternal(url: string): void {
  try {
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      void chrome.tabs.create({ url });
      return;
    }
  } catch {
    /* fall through */
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
