/**
 * Local, text-only trial detection. Pure functions: they only look at page text
 * handed to them (never form values, cookies or card fields) and return hints.
 */

export type BillingCycle = "monthly" | "yearly";

export interface TrialHints {
  /** Any trial wording found at all ("free trial", "14-day trial", …). */
  found: boolean;
  /** Trial length in days when the page states one. */
  days?: number;
  /** Price charged after the trial (amount only, no currency symbol). */
  price?: number;
  cycle?: BillingCycle;
}

const UNIT_DAYS: Record<string, number> = { day: 1, week: 7, month: 30 };

// "14-day free trial", "14 days free", "7 day trial", "2 weeks of free access"
const LENGTH_BEFORE = /(\d{1,3})[\s-]*(day|week|month)s?\s+(?:of\s+)?(?:free|trial)/i;
// "free for 14 days", "free for the first 2 weeks", "try free for 30 days"
const LENGTH_AFTER = /free\s+(?:for\s+)?(?:the\s+)?(?:first\s+)?(\d{1,3})[\s-]*(day|week|month)s?/i;
// Trial wording without a number.
const TRIAL_WORDS = /free[\s-]trial|start\s+(?:your\s+)?(?:\w+\s+)?trial|trial\s+period|try\s+(?:it\s+)?free/i;
// "$9.99/month", "€99 per year", "£4 a month"
const PRICE = /([$€£])\s?(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:\/|per\s+|a\s+|each\s+)\s*(mo(?:nth)?|yr|year)\b/gi;
const AFTER_TRIAL_CONTEXT = /then|after|thereafter|renew|billed|charged/i;

function toDays(n: string, unit: string): number | undefined {
  const days = Number(n) * (UNIT_DAYS[unit.toLowerCase()] ?? 0);
  return days >= 1 && days <= 365 ? days : undefined;
}

export function detectTrialHints(text: string): TrialHints {
  const hay = text.replace(/\s+/g, " ").slice(0, 40_000);

  let days: number | undefined;
  const a = LENGTH_BEFORE.exec(hay) ?? LENGTH_AFTER.exec(hay);
  if (a) days = toDays(a[1], a[2]);

  const found = days !== undefined || TRIAL_WORDS.test(hay);
  const hints: TrialHints = { found, days };

  if (found) {
    let best: { price: number; cycle: BillingCycle; score: number } | undefined;
    for (const m of hay.matchAll(PRICE)) {
      const price = Number(m[2].replace(",", "."));
      if (!Number.isFinite(price) || price <= 0) continue;
      const before = hay.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0);
      const score = AFTER_TRIAL_CONTEXT.test(before) ? 2 : 1;
      if (!best || score > best.score) {
        best = { price, cycle: /^y/i.test(m[3]) ? "yearly" : "monthly", score };
      }
    }
    if (best) {
      hints.price = best.price;
      hints.cycle = best.cycle;
    }
  }
  return hints;
}

/** Visible page text, capped so huge pages stay cheap. Reads text nodes only, never inputs. */
export function readPageText(): string {
  return (document.body?.innerText ?? "").slice(0, 40_000);
}

/** Does this button / submit control look like it commits a signup or purchase? */
export const SUBMIT_LABEL =
  /start|begin|subscribe|pay\b|purchase|place\s+order|complete|confirm|upgrade|get\s+started|sign\s*up|create\s+(?:my\s+)?account|try\b|join|continue/i;
