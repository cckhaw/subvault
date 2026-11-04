/**
 * Watches navigations for signup / checkout style URLs and tells the content
 * script in that tab to show the SubVault sheet. This covers single-page apps
 * that change route with history.pushState, which a content script that only
 * runs at page load would miss. (Full page loads are also checked by the
 * content script itself.)
 */
import { isCheckoutUrl } from "../lib/utils";

export const CHECKOUT_DETECTED = "SUBVAULT_CHECKOUT_DETECTED";

function notify(tabId: number, url: string): void {
  if (!isCheckoutUrl(url)) return;
  chrome.tabs.sendMessage(tabId, { type: CHECKOUT_DETECTED, url }).catch(() => {
    /* No content script in this tab (e.g. restricted page) — nothing to do. */
  });
}

export function registerCheckoutInterceptor(): void {
  // SPA route changes.
  chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.frameId === 0) notify(details.tabId, details.url);
  });
  // Fragment-only route changes (#/checkout).
  chrome.webNavigation.onReferenceFragmentUpdated.addListener((details) => {
    if (details.frameId === 0) notify(details.tabId, details.url);
  });
}
