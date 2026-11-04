/**
 * A signup form usually navigates away the moment it is submitted, which would
 * destroy the sheet. The content script parks what it learned here (keyed by tab)
 * and claims it on the next page, or a moment later if the page never navigated.
 *
 * Stored in chrome.storage.session (cleared when the browser closes) with a
 * short TTL; falls back to storage.local where session storage is unavailable.
 */
import type { BillingCycle } from "../lib/trial-detect";

export interface PendingSignup {
  /** Domain to monitor for idle usage (may be empty). */
  domain: string;
  name: string;
  days?: number;
  price?: number;
  cycle?: BillingCycle;
  ts: number;
}

const TTL_MS = 3 * 60_000;
const area = () => chrome.storage.session ?? chrome.storage.local;
const key = (tabId: number) => `subvault:pending:${tabId}`;

export async function setPending(tabId: number, data: Omit<PendingSignup, "ts">): Promise<void> {
  await area().set({ [key(tabId)]: { ...data, ts: Date.now() } satisfies PendingSignup });
}

/** Returns and clears the pending signup for a tab, if it is still fresh. */
export async function claimPending(tabId: number): Promise<PendingSignup | null> {
  const k = key(tabId);
  const got = await area().get(k);
  const value = got[k] as PendingSignup | undefined;
  if (!value) return null;
  await area().remove(k);
  return Date.now() - value.ts <= TTL_MS ? value : null;
}

export function clearPendingOnTabClose(): void {
  chrome.tabs.onRemoved.addListener((tabId) => {
    void area().remove(key(tabId));
  });
}
