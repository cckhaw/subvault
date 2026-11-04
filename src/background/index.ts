/**
 * SubVault service worker.
 *  - Records visits ONLY for domains the user already tracks (privacy by design).
 *  - Flags "Idle Ghost SaaS" (30+ days without a visit) and paints the toolbar badge.
 *  - Persists trials saved from the injected checkout sheet (content scripts cannot
 *    reach the extension's IndexedDB, so they message us).
 */
import { SUBVAULT_CONFIG } from "../../plasmo.config";
import { addSubscription, db, getVaultSummary, recordVisit } from "../db";
import { baseDomain, formatCurrency, hostFromUrl } from "../lib/utils";
import { registerCheckoutInterceptor } from "./checkout-interceptor";

const MSG_SAVE_TRIAL = "SUBVAULT_SAVE_TRIAL";
const MSG_REFRESH = "SUBVAULT_REFRESH";

const ALARM_IDLE_SCAN = "subvault-idle-scan";
const ORANGE = "#FF9500";
const RED = "#FF3B30";

/* ───────────── Badge ───────────── */

async function updateBadge(): Promise<void> {
  try {
    const { ghosts, urgentTrials, wastedPerMonth } = await getVaultSummary();
    if (ghosts.length > 0) {
      await chrome.action.setBadgeBackgroundColor({ color: ORANGE });
      await chrome.action.setBadgeText({ text: String(ghosts.length) });
      await chrome.action.setTitle({
        title: `SubVault — ${ghosts.length} idle Ghost SaaS, ≈${formatCurrency(wastedPerMonth)}/mo going unused`
      });
    } else if (urgentTrials.length > 0) {
      await chrome.action.setBadgeBackgroundColor({ color: RED });
      await chrome.action.setBadgeText({ text: String(urgentTrials.length) });
      await chrome.action.setTitle({
        title: `SubVault — ${urgentTrials.length} trial${urgentTrials.length > 1 ? "s" : ""} ending soon`
      });
    } else {
      await chrome.action.setBadgeText({ text: "" });
      await chrome.action.setTitle({ title: "SubVault" });
    }
  } catch (err) {
    console.warn("[SubVault] badge update failed", err);
  }
}

/* ───────────── Visit tracking ───────────── */

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url || tab.incognito) return;
  const host = hostFromUrl(tab.url);
  if (!host) return;
  recordVisit(host)
    .then((tracked) => (tracked ? updateBadge() : undefined))
    .catch((err) => console.warn("[SubVault] visit log failed", err));
});

/* ───────────── Lifecycle ───────────── */

function ensureAlarm(): void {
  chrome.alarms.get(ALARM_IDLE_SCAN).then((existing) => {
    if (!existing) {
      chrome.alarms.create(ALARM_IDLE_SCAN, {
        delayInMinutes: 1,
        periodInMinutes: SUBVAULT_CONFIG.idleScanIntervalMinutes
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureAlarm();
  void updateBadge();
});
chrome.runtime.onStartup.addListener(() => {
  ensureAlarm();
  void updateBadge();
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_IDLE_SCAN) void updateBadge();
});

registerCheckoutInterceptor();
ensureAlarm();
void updateBadge();

/* ───────────── Messages from content script / UI ───────────── */

interface SaveTrialPayload {
  name: string;
  domain: string;
  cost: number;
  /** `YYYY-MM-DD` */
  endDate: string;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only accept messages from our own extension's scripts.
  if (sender.id !== chrome.runtime.id) return false;

  if (message?.type === MSG_SAVE_TRIAL) {
    const p = message.payload as SaveTrialPayload;
    saveTrial(p)
      .then((subscription) => sendResponse({ ok: true, subscription }))
      .catch((err: unknown) => sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }));
    return true; // async response
  }

  if (message?.type === MSG_REFRESH) {
    updateBadge().then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

async function saveTrial(p: SaveTrialPayload) {
  const name = String(p.name ?? "").trim().slice(0, 80);
  if (!name) throw new Error("Missing service name");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.endDate)) throw new Error("Invalid trial end date");
  const domain = p.domain ? baseDomain(p.domain) : "";
  const cost = Number.isFinite(p.cost) && p.cost > 0 ? p.cost : 0;

  // Re-signing up for the same service moves the existing trial instead of duplicating it.
  if (domain) {
    const existing = await db.subscriptions.where("domain").equals(domain).filter((s) => s.isTrial).first();
    if (existing?.id !== undefined) {
      await db.subscriptions.update(existing.id, {
        trialEndDate: p.endDate,
        renewalDate: p.endDate,
        cost: cost || existing.cost
      });
      await updateBadge();
      return (await db.subscriptions.get(existing.id))!;
    }
  }

  const sub = await addSubscription({
    name,
    domain,
    cost,
    billingCycle: "monthly",
    renewalDate: p.endDate,
    isTrial: true,
    trialEndDate: p.endDate
  });
  await updateBadge();
  return sub;
}
