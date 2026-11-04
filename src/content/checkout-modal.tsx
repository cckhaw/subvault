import { BellRing, CalendarDays, Check, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { SUBVAULT_CONFIG } from "../../plasmo.config";
import { ActionButton } from "../components/ActionButton";
import { buildTrialIcs, downloadIcs, icsFileName } from "../lib/ics";
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

export const CheckoutModal: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("ask");
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [customDate, setCustomDate] = useState(addDays(new Date(), 7));
  const [message, setMessage] = useState("");
  const lastUrl = useRef("");
  const domain = useRef("");

  const show = useCallback((url: string) => {
    if (!isCheckoutUrl(url) || wasIgnored() || lastUrl.current === url) return;
    lastUrl.current = url;
    domain.current = detectDomain();
    setName(guessServiceName(domain.current || hostFromUrl(url), document.title));
    setPhase("ask");
    setCustom(false);
    setMessage("");
    setVisible(true);
  }, []);

  useEffect(() => {
    // Initial page load (small delay lets SPA frameworks settle the document title).
    const t = window.setTimeout(() => show(location.href), 700);

    const onMessage = (msg: { type?: string; url?: string }) => {
      if (msg?.type === CHECKOUT_DETECTED && msg.url) show(msg.url);
    };
    chrome.runtime.onMessage.addListener(onMessage);
    return () => {
      window.clearTimeout(t);
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, [show]);

  // Auto-dismiss the confirmation.
  useEffect(() => {
    if (phase !== "done") return;
    const t = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(t);
  }, [phase]);

  const ignore = () => {
    rememberIgnored();
    setVisible(false);
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
        payload: { name: cleanName, domain: domain.current, cost: Number(price) || 0, endDate }
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

  const [d1, d2] = SUBVAULT_CONFIG.trialPresets;

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
          <p className="sv-body mt-3 mb-3" style={{ lineHeight: 1.35 }}>
            Detecting active signup. Is this a free trial or paid subscription?
          </p>

          <input
            className="sv-input mb-2"
            aria-label="Service name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Service name"
          />
          <input
            className="sv-input mb-3"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            aria-label="Monthly price after trial (optional)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Monthly price after trial (optional)"
          />

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
              <ActionButton fullWidth disabled={phase === "saving"} onClick={() => save(addDays(new Date(), d1))}>
                Set {d1}-Day Trial Reminder
              </ActionButton>
              <ActionButton fullWidth variant="tinted" disabled={phase === "saving"} onClick={() => save(addDays(new Date(), d2))}>
                Set {d2}-Day Trial Reminder
              </ActionButton>
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
          <p className="sv-caption mt-3 mb-0">Saved only on this device. SubVault never sees your card.</p>
        </>
      )}
    </div>
  );
};
