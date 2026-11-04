import { CalendarPlus, X } from "lucide-react";
import React, { useMemo, useState } from "react";

import { SUBVAULT_CONFIG } from "../../plasmo.config";
import { findCancellation, searchCancellationDb } from "../db/cancellation-db";
import { addSubscription } from "../db";
import { buildTrialIcs, downloadIcs, icsFileName } from "../lib/ics";
import { addDays, baseDomain, hostFromUrl, toISODate } from "../lib/utils";
import { ActionButton } from "./ActionButton";

interface TrialModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const PRESETS = [...SUBVAULT_CONFIG.trialPresets, 30] as const;

/** Quick-add sheet: track a trial or a paid subscription and export an .ics reminder. */
export const TrialModal: React.FC<TrialModalProps> = ({ open, onClose, onSaved }) => {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [cost, setCost] = useState("");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [isTrial, setIsTrial] = useState(true);
  const [preset, setPreset] = useState<number | "custom">(7);
  const [customDate, setCustomDate] = useState(addDays(new Date(), 7));
  const [exportIcs, setExportIcs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const suggestions = useMemo(() => (domain ? [] : searchCancellationDb(name)), [name, domain]);
  if (!open) return null;

  const endDate = preset === "custom" ? customDate : addDays(new Date(), preset);

  const pick = (n: string, d: string) => {
    setName(n);
    setDomain(d);
  };

  const reset = () => {
    setName(""); setDomain(""); setCost(""); setCycle("monthly"); setIsTrial(true);
    setPreset(7); setCustomDate(addDays(new Date(), 7)); setError("");
  };

  const save = async () => {
    const cleanName = name.trim();
    if (!cleanName) return setError("Give it a name.");
    const amount = cost.trim() === "" ? 0 : Number(cost);
    if (!Number.isFinite(amount) || amount < 0) return setError("Enter a valid price.");
    if (isTrial && endDate < toISODate(new Date())) return setError("The trial end date is in the past.");
    const host = domain.trim() ? baseDomain(hostFromUrl(domain.includes("://") ? domain : `https://${domain}`)) : "";

    setSaving(true);
    try {
      const hit = host ? findCancellation(host) : undefined;
      const renewal = isTrial ? endDate : addDays(new Date(), cycle === "yearly" ? 365 : 30);
      const sub = await addSubscription({
        name: cleanName,
        domain: host,
        cost: amount,
        billingCycle: cycle,
        renewalDate: renewal,
        isTrial,
        trialEndDate: isTrial ? endDate : undefined,
        category: hit?.category
      });
      if (isTrial && exportIcs) {
        downloadIcs(icsFileName(sub.name), buildTrialIcs({ name: sub.name, endDate, cancellationUrl: sub.cancellationUrl, domain: sub.domain }));
      }
      reset();
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-3" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add subscription or trial"
        onClick={(e) => e.stopPropagation()}
        className="sv-glass sv-sheet-in w-full max-w-[420px] p-4 max-h-full overflow-auto"
        style={{ background: "var(--sv-surface-solid)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="sv-headline m-0">{isTrial ? "Track a free trial" : "Add a subscription"}</h2>
          <ActionButton variant="plain" size="sm" aria-label="Close" onClick={onClose}><X size={16} /></ActionButton>
        </div>

        <div role="tablist" className="sv-segmented mb-3">
          <button role="tab" aria-selected={isTrial} className="sv-segment" onClick={() => setIsTrial(true)}>Free trial</button>
          <button role="tab" aria-selected={!isTrial} className="sv-segment" onClick={() => setIsTrial(false)}>Paid</button>
        </div>

        <div className="grid gap-2">
          <div className="relative">
            <input className="sv-input" placeholder="Service (e.g. Midjourney)" aria-label="Service name" value={name}
              onChange={(e) => { setName(e.target.value); setDomain(""); }} autoFocus />
            {suggestions.length > 0 && (
              <ul className="sv-glass absolute z-10 left-0 right-0 mt-1 p-1 list-none" style={{ background: "var(--sv-surface-solid)", borderRadius: 12 }}>
                {suggestions.map((s) => (
                  <li key={s.domain}>
                    <button className="w-full text-left border-0 bg-transparent px-2 py-1.5 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 text-[13px]"
                      style={{ color: "var(--sv-text)" }} onClick={() => pick(s.name, s.domain)}>
                      {s.name} <span className="sv-caption">· {s.domain}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <input className="sv-input" placeholder="Website (e.g. midjourney.com)" aria-label="Website domain" value={domain} onChange={(e) => setDomain(e.target.value)} />
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input className="sv-input" type="number" min="0" step="0.01" inputMode="decimal"
              placeholder={isTrial ? "Price after trial (optional)" : "Price"} aria-label="Price" value={cost} onChange={(e) => setCost(e.target.value)} />
            <select className="sv-input" aria-label="Billing cycle" value={cycle} onChange={(e) => setCycle(e.target.value as "monthly" | "yearly")}>
              <option value="monthly">/ month</option>
              <option value="yearly">/ year</option>
            </select>
          </div>

          {isTrial && (
            <>
              <div role="tablist" aria-label="Trial length" className="sv-segmented">
                {PRESETS.map((d) => (
                  <button key={d} role="tab" aria-selected={preset === d} className="sv-segment" onClick={() => setPreset(d)}>{d} days</button>
                ))}
                <button role="tab" aria-selected={preset === "custom"} className="sv-segment" onClick={() => setPreset("custom")}>Custom</button>
              </div>
              {preset === "custom" && (
                <input className="sv-input" type="date" aria-label="Trial end date" min={toISODate(new Date())} value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
              )}
              <label className="flex items-center gap-2 sv-body cursor-pointer">
                <input type="checkbox" checked={exportIcs} onChange={(e) => setExportIcs(e.target.checked)} />
                Download calendar reminder (.ics)
              </label>
            </>
          )}
        </div>

        {error && <p role="alert" className="sv-body mt-2 mb-0" style={{ color: "var(--sv-red)" }}>{error}</p>}

        <ActionButton fullWidth className="mt-3" icon={<CalendarPlus size={15} />} disabled={saving} onClick={save}>
          {isTrial ? "Save & set reminder" : "Save subscription"}
        </ActionButton>
      </div>
    </div>
  );
};
