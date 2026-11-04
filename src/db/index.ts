import Dexie, { type Table } from "dexie";

import { SUBVAULT_CONFIG } from "../../plasmo.config";
import { daysSince, daysUntil, hostMatchesDomain } from "../lib/utils";
import { findCancellation } from "./cancellation-db";

export interface Subscription {
  id?: number;
  name: string;
  domain: string;
  cost: number;
  billingCycle: "monthly" | "yearly";
  renewalDate: string;
  isTrial: boolean;
  trialEndDate?: string;
  cancellationUrl?: string;
  category: string;
  createdAt: string;
}

export interface DomainActivity {
  domain: string;
  lastVisited: string;
  visitCount: number;
}

export class SubVaultDatabase extends Dexie {
  subscriptions!: Table<Subscription, number>;
  domainActivity!: Table<DomainActivity, string>;

  constructor() {
    super("SubVaultDatabase");
    this.version(1).stores({
      subscriptions: "++id, name, domain, isTrial, renewalDate, trialEndDate",
      domainActivity: "&domain, lastVisited"
    });
  }
}

export const db = new SubVaultDatabase();

/* ───────────── Writes ───────────── */

export type NewSubscription = Omit<Subscription, "id" | "createdAt" | "category" | "cancellationUrl"> &
  Partial<Pick<Subscription, "category" | "cancellationUrl">>;

/** Insert a subscription, filling category + cancellation deep-link from the curated database. */
export async function addSubscription(input: NewSubscription): Promise<Subscription> {
  const hit = input.domain ? findCancellation(input.domain) : undefined;
  const record: Subscription = {
    ...input,
    category: input.category ?? hit?.category ?? "Other",
    cancellationUrl: input.cancellationUrl ?? hit?.url,
    createdAt: new Date().toISOString()
  };
  const id = await db.subscriptions.add(record);
  return { ...record, id };
}

/** Mark a trial as converted to a paid plan (keeps the entry, clears trial flags). */
export async function convertTrialToPaid(id: number): Promise<void> {
  await db.subscriptions.update(id, { isTrial: false, trialEndDate: undefined });
}

/**
 * Privacy: visits are only recorded for domains the user already tracks,
 * never for general browsing. Returns true when a row was updated.
 */
export async function recordVisit(host: string): Promise<boolean> {
  const subs = await db.subscriptions.toArray();
  const match = subs.find((s) => s.domain && hostMatchesDomain(host, s.domain));
  if (!match) return false;
  const now = new Date().toISOString();
  await db.transaction("rw", db.domainActivity, async () => {
    const existing = await db.domainActivity.get(match.domain);
    await db.domainActivity.put({
      domain: match.domain,
      lastVisited: now,
      visitCount: (existing?.visitCount ?? 0) + 1
    });
  });
  return true;
}

/* ───────────── Derived state ───────────── */

export interface IdleInfo {
  idle: boolean;
  /** Days since the last visit (or since the subscription was added if never visited). */
  daysIdle: number;
  lastVisited?: string;
}

export function getIdleInfo(
  sub: Subscription,
  activity: Map<string, DomainActivity>,
  now = new Date()
): IdleInfo {
  if (!sub.domain || sub.isTrial) return { idle: false, daysIdle: 0 };
  const last = activity.get(sub.domain)?.lastVisited;
  const daysIdle = daysSince(last ?? sub.createdAt, now);
  return {
    idle: daysIdle >= SUBVAULT_CONFIG.idleThresholdDays,
    daysIdle,
    lastVisited: last
  };
}

export async function getActivityMap(): Promise<Map<string, DomainActivity>> {
  const rows = await db.domainActivity.toArray();
  return new Map(rows.map((r) => [r.domain, r]));
}

export interface VaultSummary {
  ghosts: Subscription[];
  urgentTrials: Subscription[];
  /** Monthly money going to idle paid subscriptions. */
  wastedPerMonth: number;
}

export async function getVaultSummary(now = new Date()): Promise<VaultSummary> {
  const [subs, activity] = await Promise.all([db.subscriptions.toArray(), getActivityMap()]);
  const ghosts = subs.filter((s) => getIdleInfo(s, activity, now).idle);
  const urgentTrials = subs.filter(
    (s) => s.isTrial && s.trialEndDate && daysUntil(s.trialEndDate, now) <= SUBVAULT_CONFIG.trialUrgentDays
  );
  const wastedPerMonth = ghosts.reduce(
    (sum, s) => sum + (s.billingCycle === "yearly" ? s.cost / 12 : s.cost),
    0
  );
  return { ghosts, urgentTrials, wastedPerMonth };
}
