import { BellRing, CalendarDays, Check, ScanSearch, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { SUBVAULT_CONFIG } from "../../plasmo.config";
import { ActionButton } from "../components/ActionButton";
import { buildTrialIcs, downloadIcs, icsFileName } from "../lib/ics";
import { detectTrialHints, readPageText, SUBMIT_LABEL, type BillingCycle, type TrialHints } from "../lib/trial-detect";
import {
  addDays,
  formatDate,
  guessServiceName,
  hostFromUrl,
  isCheckoutUrl,
  isPaymentProcessorHost,
  toISODate
} from "../lib/utils";

const CHECKOUT_DETECTED = "SUBVAULT_CHECKOUT_DETECTED";
const MSG_SAVE_TRIAL = "SUBVAULT_SAVE_TRIAL";
const MSG_PENDING_SET = "SUBVAULT_PENDING_SET";
const MSG_PENDING_CLAIM = "SUBVAULT_PENDING_CLAIM";

/** How long to wait after a submit before deciding the page is not navigating away (SPAs). */
const SPA_SUBMIT_WAIT_MS = 1500;

type Phase = "ask" | "saving" | "done" | "error";

function dismissKey(): string {
  return `subvault:ignored:${location.hostname}`;
}
function wasIgnored(): boolean {
  try {
    return sessionStorage.getItem(dismissKey()) === "1";
  } catch {
    return false;
  }
}
function rememberIgnored(): void {
  try {
    sessionStorage.setItem(dismissKey(), "1");
  } catch {
    /* sessionStorage can be blocked; ignoring is then per-visit only */
  }
}

/** The domain we should monitor for idle usage: the merchant, not the payment processor. */
function detectDomain(): string {
  const host = hostFromUrl(location.href);
  if (!isPaymentProcessorHost(host)) return host;
  const ref = hostFromUrl(document.referrer || "");
  return ref && !isPaymentProcessorHost(ref) ? ref : "";
}

function describeHints(h: TrialHints): string {
  const parts: string[] = [];
  if (h.days) parts.push(`${h.days}-day free trial`);
  else if (h.found) parts.push("free trial");
  if (h.price) parts.push(`${h.price}/${h.cycle === "yearly" ? "year" : "month"} after`);
  return parts.join(" · ");
}

interface PendingSignup {
  domain: string;
  name: string;
  days?: number;
  price?: number;
  cycle?: BillingCycle;
}

export const CheckoutModal: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("ask");
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [hints, setHints] = useState<TrialHints>({ found: false });
  const [customDate, setCustomDate] = useState(addDays(new Date(), 7));
  const [message, setMessage] = useState("");

  const domain = useRef("");
  const armed = useRef(false);
  const shownFor = useRef("");
  const lastSubmit = useRef(0);
  const visibleRef = useRef(false);

  const present = useCallback((p: PendingSignup, key: string) => {
    if (wasIgnored() || visibleRef.current || shownFor.current === key) return;
    shownFor.current = key;
    domain.current = p.domain;
    setName(p.name);
    setHints({ found: p.days !== undefined || p.price !== undefined, days: p.days, price: p.price, cycle: p.cycle });
    setPrice(p.price ? String(p.price) : "");
    setCycle(p.cycle ?? "monthly");
    setPhase("ask");
    setCustom(false);
    setMessage("");
    visibleRef.current = true;
    setVisible(true);
  }, []);

  /** Snapshot of what this page tells us right now. */
  const snapshot = useCallback((): { hints: TrialHints; pending: PendingSignup } => {
    const h = detectTrialHints(readPageText());
    const d = detectDomain();
    return {
      hints: h,
      pending: {
        domain: d,
        name: guessServiceName(d || hostFromUrl(location.href), document.title),
        days: h.days,
        price: h.price,
        cycle: h.cycle
      }
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    /** Page load or SPA route change: arm for a submit, and show at once only on strong evidence. */
    const evaluate = (url: string) => {
      const { hints: h, pending } = snapshot();
      const urlMatch = isCheckoutUrl(url);
      if (!urlMatch && !h.found) return;
      armed.current = true;
      if (urlMatch && h.found) present(pending, `arrive:${url}`);
    };

    /** The user just committed to something: park the details, then show the sheet. */
    const onCommit = () => {
      if (disposed || wasIgnored() || Date.now() - lastSubmit.current < 4000) return;
      const { hints: h, pending } = snapshot();
      if (!armed.current && !isCheckoutUrl(location.href) && !h.found) return;
      lastSubmit.current = Date.now();

      // Park first: if the page navigates away, the next page claims it.
      void chrome.runtime.sendMessage({ type: MSG_PENDING_SET, payload: pending }).catch(() => undefined);

      // If the page is still here shortly after (single-page app), claim and show now.
      window.setTimeout(async () => {
        if (disposed) return;
        const res = await chrome.runtime.sendMessage({ type: MSG_PENDING_CLAIM }).catch(() => null);
        if (res?.pending) present(res.pending as PendingSignup, `submit:${Date.now()}`);
      }, SPA_SUBMIT_WAIT_MS);
    };

    const onSubmit = () => onCommit();
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.('button, [role="button"], input[type="submit"], input[type="button"], a[class*="btn" i]');
      if (!el) return;
      const label = (el as HTMLInputElement).value || el.textContent || el.getAttribute("aria-label") || "";
      if (label.length <= 60 && SUBMIT_LABEL.test(label)) onCommit();
    };

    // 1) Did the previous page hand something over (form submit that navigated)?
    chrome.runtime
      .sendMessage({ type: MSG_PENDING_CLAIM })
      .then((res) => {
        if (!disposed && res?.pending) present(res.pending as PendingSignup, `claimed:${location.href}`);
      })
      .catch(() => undefined);

    // 2) Scan this page shortly after load (lets SPA frameworks render and set the title).
    const t = window.setTimeout(() => evaluate(location.href), 700);

    // 3) Watch for the user committing.
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onClick, true);

    // 4) SPA route changes reported by the background interceptor.
    const onMessage = (msg: { type?: string; url?: string }) => {
      if (msg?.type === CHECKOUT_DETECTED && msg.url) window.setTimeout(() => evaluate(msg.url!), 500);
    };
    chrome.runtime.onMessage.addListener(onMessage);

    return () => {
      disposed = true;
      window.clearTimeout(t);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onClick, true);
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, [present, snapshot]);

  // Auto-dismiss the confirmation.
  useEffect(() => {
    if (phase !== "done") return;
    const t = window.setTimeout(() => {
      visibleRef.current = false;
      setVisible(false);
    }, 5000);
    return () => window.clearTimeout(t);
  }, [phase]);

  const hide = () => {
    visibleRef.current = false;
    setVisible(false);
  };
  const ignore = () => {
    rememberIgnored();
    hide();
  };

  const save = async (endDate: string) => {
    const cleanName = name.trim();
    if (!cleanName) {
      setPhase("error");
      setMessage("Give this service a name first.");
      return;
    }
    if (endDate < toISODate(new Date())) {
      setPhase("error");
      setMessage("That date is in the past.");
      return;
    }
    setPhase("saving");
    try {
      const res = await chrome.runtime.sendMessage({
        type: MSG_SAVE_TRIAL,
        payload: { name: cleanName, domain: domain.current, cost: Number(price) || 0, billingCycle: cycle, endDate }
      });
      if (!res?.ok) throw new Error(res?.error ?? "Could not save");
      const sub = res.subscription as { name: string; domain: string; cancellationUrl?: string };
      downloadIcs(
        icsFileName(sub.name),
        buildTrialIcs({ name: sub.name, endDate, cancellationUrl: sub.cancellationUrl, domain: sub.domain })
      );
      setMessage(`Reminder set for ${formatDate(endDate)}. Calendar file downloaded.`);
      setPhase("done");
    } catch (err) {
      setPhase("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (!visible) return null;

  // Detected length first (filled button), then the standard presets.
  const presets = [...SUBVAULT_CONFIG.trialPresets] as number[];
  const lengths = hints.days ? [hints.days, ...presets.filter((d) => d !== hints.days)] : presets;
  const detected = describeHints(hints);

  return (
    <div
      className="sv-root sv-sheet-in sv-glass"
      role="dialog"
      aria-label="SubVault trial detection"
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        width: 340,
        maxWidth: "calc(100vw - 40px)",
        zIndex: 2147483647,
        padding: 16
      }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#007AFF] text-white grid place-items-center" aria-hidden>
            <BellRing size={15} />
          </div>
          <span className="sv-headline">SubVault</span>
        </div>
        <button
          onClick={ignore}
          aria-label="Dismiss"
          className="sv-press border-0 bg-transparent cursor-pointer p-1 rounded-full"
          style={{ color: "var(--sv-text-secondary)" }}>
          <X size={16} />
        </button>
      </div>

      {phase === "done" ? (
        <div className="flex items-center gap-2 mt-3 sv-body" role="status">
          <Check size={18} style={{ color: "var(--sv-green)" }} />
          <span>{message}</span>
        </div>
      ) : (
        <>
          <p className="sv-body mt-3 mb-2" style={{ lineHeight: 1.35 }}>
            Detecting active signup. Is this a free trial or paid subscription?
          </p>
          {detected && (
            <p className="sv-badge sv-badge-blue mb-3" style={{ whiteSpace: "normal" }}>
              <ScanSearch size={12} aria-hidden /> Found on page: {detected}
            </p>
          )}

          <input
            className="sv-input mb-2"
            aria-label="Service name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Service name"
          />
          <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "1fr auto" }}>
            <input
              className="sv-input"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              aria-label="Price after trial (optional)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price after trial (optional)"
            />
            <select className="sv-input" aria-label="Billing cycle" value={cycle} onChange={(e) => setCycle(e.target.value as BillingCycle)}>
              <option value="monthly">/ month</option>
              <option value="yearly">/ year</option>
            </select>
          </div>

          {custom ? (
            <div className="grid gap-2">
              <input
                className="sv-input"
                type="date"
                aria-label="Trial end date"
                min={toISODate(new Date())}
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
              />
              <div className="flex gap-2">
                <ActionButton fullWidth onClick={() => save(customDate)} icon={<CalendarDays size={14} />}>
                  Set reminder
                </ActionButton>
                <ActionButton variant="plain" onClick={() => { setCustom(false); setPhase("ask"); }}>
                  Back
                </ActionButton>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              {lengths.map((d, i) => (
                <ActionButton
                  key={d}
                  fullWidth
                  variant={i === 0 ? "filled" : "tinted"}
                  disabled={phase === "saving"}
                  onClick={() => save(addDays(new Date(), d))}>
                  Set {d}-Day Trial Reminder{i === 0 && d === hints.days ? " (detected)" : ""}
                </ActionButton>
              ))}
              <div className="flex gap-2">
                <ActionButton fullWidth variant="tinted" disabled={phase === "saving"} onClick={() => setCustom(true)}>
                  Custom Date
                </ActionButton>
                <ActionButton fullWidth variant="plain" onClick={ignore}>
                  Ignore
                </ActionButton>
              </div>
            </div>
          )}

          {phase === "error" && (
            <p role="alert" className="sv-body mt-2 mb-0" style={{ color: "var(--sv-red)" }}>
              {message}
            </p>
          )}
          <p className="sv-caption mt-3 mb-0">Saved only on this device. SubVault never reads your card or form entries.</p>
        </>
      )}
    </div>
  );
};
