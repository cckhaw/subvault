import { Ghost, LayoutDashboard, Plus, ShieldCheck } from "lucide-react";
import React, { useState } from "react";

import "~styles/globals.css";

import { ActionButton } from "~components/ActionButton";
import { GlassCard } from "~components/GlassCard";
import { SubscriptionRow } from "~components/SubscriptionRow";
import { TrialModal } from "~components/TrialModal";
import { UsageHeatmap } from "~components/UsageHeatmap";
import { convertTrialToPaid, db, type Subscription } from "~db";
import { useVault } from "~lib/useVault";
import { formatCurrency } from "~lib/utils";

type Tab = "vault" | "trials" | "heatmap";

function Popup() {
  const { loading, subs, paid, trials, ghosts, activity, monthly, wastedPerMonth } = useVault();
  const [tab, setTab] = useState<Tab>("vault");
  const [adding, setAdding] = useState(false);

  const remove = async (s: Subscription) => {
    if (s.id !== undefined && window.confirm(`Remove ${s.name} from SubVault?`)) {
      await db.subscriptions.delete(s.id);
      void chrome.runtime.sendMessage({ type: "SUBVAULT_REFRESH" }).catch(() => undefined);
    }
  };
  const keep = async (s: Subscription) => {
    if (s.id !== undefined) {
      await convertTrialToPaid(s.id);
      void chrome.runtime.sendMessage({ type: "SUBVAULT_REFRESH" }).catch(() => undefined);
    }
  };

  const list = tab === "trials" ? trials : paid;

  return (
    <main className="sv-root w-[380px] min-h-[420px] max-h-[600px] overflow-auto p-4 bg-[var(--sv-bg)]">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[10px] bg-[#007AFF] text-white grid place-items-center" aria-hidden>
            <ShieldCheck size={18} />
          </div>
          <h1 className="sv-title m-0">SubVault</h1>
        </div>
        <div className="flex gap-1">
          <ActionButton variant="tinted" size="sm" icon={<Plus size={14} />} onClick={() => setAdding(true)}>
            Add
          </ActionButton>
          <ActionButton variant="plain" size="sm" aria-label="Open dashboard" title="Open dashboard" onClick={() => chrome.runtime.openOptionsPage()}>
            <LayoutDashboard size={16} />
          </ActionButton>
        </div>
      </header>

      <GlassCard className="mb-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="sv-caption">Per month</div>
            <div className="text-[18px] font-bold">{formatCurrency(monthly)}</div>
          </div>
          <div>
            <div className="sv-caption">Active trials</div>
            <div className="text-[18px] font-bold" style={{ color: trials.length ? "var(--sv-blue)" : undefined }}>{trials.length}</div>
          </div>
          <div>
            <div className="sv-caption">Idle ghosts</div>
            <div className="text-[18px] font-bold" style={{ color: ghosts.length ? "var(--sv-orange)" : undefined }}>{ghosts.length}</div>
          </div>
        </div>
        {ghosts.length > 0 && (
          <p className="sv-body mt-3 mb-0 flex items-center gap-1.5 font-medium" style={{ color: "var(--sv-orange)" }}>
            <Ghost size={14} aria-hidden /> ≈ {formatCurrency(wastedPerMonth)}/mo on services you haven't used in 30+ days
          </p>
        )}
      </GlassCard>

      <div role="tablist" className="sv-segmented mb-3">
        {([
          ["vault", `Vault (${paid.length})`],
          ["trials", `Trials (${trials.length})`],
          ["heatmap", "Heatmap"]
        ] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className="sv-segment" onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <GlassCard className="!p-3">
        {loading ? (
          <p className="sv-body sv-secondary m-0">Loading…</p>
        ) : tab === "heatmap" ? (
          <UsageHeatmap subscriptions={subs} activity={activity} compact />
        ) : list.length === 0 ? (
          <div className="text-center py-6">
            <p className="sv-headline m-0">{tab === "trials" ? "No active trials" : "Your vault is empty"}</p>
            <p className="sv-body sv-secondary mt-1 mb-3">
              {tab === "trials"
                ? "SubVault will offer a reminder when it spots a trial signup."
                : "Add the subscriptions you pay for. Nothing leaves this device."}
            </p>
            <ActionButton onClick={() => setAdding(true)} icon={<Plus size={14} />}>Add subscription</ActionButton>
          </div>
        ) : (
          <ul className="m-0 p-0 divide-y divide-black/5 dark:divide-white/10">
            {list.map((s) => (
              <SubscriptionRow key={s.id} subscription={s} activity={activity} onDelete={remove} onConvert={tab === "trials" ? keep : undefined} dense />
            ))}
          </ul>
        )}
      </GlassCard>

      <TrialModal
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={() => void chrome.runtime.sendMessage({ type: "SUBVAULT_REFRESH" }).catch(() => undefined)}
      />
    </main>
  );
}

export default Popup;
