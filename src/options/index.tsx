import { Download, Ghost, Plus, Trash2, Upload } from "lucide-react";
import React, { useMemo, useRef, useState } from "react";

import "~styles/globals.css";

import { ActionButton } from "~components/ActionButton";
import { GlassCard } from "~components/GlassCard";
import { SubscriptionRow } from "~components/SubscriptionRow";
import { TrialModal } from "~components/TrialModal";
import { UsageHeatmap } from "~components/UsageHeatmap";
import { convertTrialToPaid, db, type DomainActivity, type Subscription } from "~db";
import { useVault } from "~lib/useVault";
import { formatCurrency, monthlyCost } from "~lib/utils";

type Filter = "all" | "paid" | "trials" | "ghosts";

const refreshBadge = () => void chrome.runtime.sendMessage({ type: "SUBVAULT_REFRESH" }).catch(() => undefined);

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <GlassCard>
      <div className="sv-caption">{label}</div>
      <div className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: tone }}>{value}</div>
    </GlassCard>
  );
}

function Options() {
  const { loading, subs, paid, trials, ghosts, activity, monthly, wastedPerMonth } = useVault();
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    paid.forEach((s) => m.set(s.category, (m.get(s.category) ?? 0) + monthlyCost(s)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [paid]);
  const maxCat = byCategory[0]?.[1] ?? 1;

  const visible = subs.filter((s) =>
    filter === "all" ? true : filter === "paid" ? !s.isTrial : filter === "trials" ? s.isTrial : ghosts.some((g) => g.id === s.id)
  );

  const remove = async (s: Subscription) => {
    if (s.id !== undefined && window.confirm(`Remove ${s.name}?`)) {
      await db.subscriptions.delete(s.id);
      refreshBadge();
    }
  };
  const keep = async (s: Subscription) => {
    if (s.id !== undefined) {
      await convertTrialToPaid(s.id);
      refreshBadge();
    }
  };

  const exportJson = async () => {
    const data = {
      app: "SubVault",
      version: 1,
      exportedAt: new Date().toISOString(),
      subscriptions: await db.subscriptions.toArray(),
      domainActivity: await db.domainActivity.toArray()
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "subvault-backup.json" });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as { app?: string; subscriptions?: Subscription[]; domainActivity?: DomainActivity[] };
      if (data.app !== "SubVault" || !Array.isArray(data.subscriptions)) throw new Error("Not a SubVault backup file.");
      await db.transaction("rw", db.subscriptions, db.domainActivity, async () => {
        await db.subscriptions.bulkAdd(data.subscriptions!.map(({ id: _id, ...rest }) => rest as Subscription));
        await db.domainActivity.bulkPut(data.domainActivity ?? []);
      });
      setNote(`Imported ${data.subscriptions.length} subscriptions.`);
      refreshBadge();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Import failed.");
    }
  };

  const wipe = async () => {
    if (window.confirm("Delete ALL SubVault data on this device? This cannot be undone.")) {
      await db.transaction("rw", db.subscriptions, db.domainActivity, async () => {
        await db.subscriptions.clear();
        await db.domainActivity.clear();
      });
      refreshBadge();
    }
  };

  return (
    <main className="sv-root min-h-screen bg-[var(--sv-bg)] px-6 py-8">
      <div className="max-w-[960px] mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="sv-title !text-[34px] m-0">SubVault</h1>
            <p className="sv-body sv-secondary mt-1 mb-0">Everything is stored locally in your browser. No bank access, no account, no servers.</p>
          </div>
          <ActionButton icon={<Plus size={15} />} onClick={() => setAdding(true)}>Add subscription</ActionButton>
        </header>

        <section aria-label="Summary" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Monthly spend" value={formatCurrency(monthly)} />
          <Stat label="Yearly projection" value={formatCurrency(monthly * 12)} />
          <Stat label="Active trials" value={String(trials.length)} tone={trials.length ? "var(--sv-blue)" : undefined} />
          <Stat label="Wasted on idle / month" value={formatCurrency(wastedPerMonth)} tone={wastedPerMonth ? "var(--sv-orange)" : undefined} />
        </section>

        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <GlassCard>
            <h2 className="sv-headline mt-0 mb-3 flex items-center gap-1.5"><Ghost size={16} /> Usage heatmap</h2>
            <UsageHeatmap subscriptions={subs} activity={activity} />
          </GlassCard>
          <GlassCard>
            <h2 className="sv-headline mt-0 mb-3">Spend by category</h2>
            {byCategory.length === 0 ? (
              <p className="sv-body sv-secondary m-0">No paid subscriptions yet.</p>
            ) : (
              <ul className="m-0 p-0 list-none grid gap-2.5">
                {byCategory.map(([cat, amount]) => (
                  <li key={cat}>
                    <div className="flex justify-between sv-body"><span>{cat}</span><span className="sv-secondary">{formatCurrency(amount)}/mo</span></div>
                    <div className="h-2 rounded-full mt-1 overflow-hidden" style={{ background: "var(--sv-fill)" }}>
                      <div className="h-full rounded-full bg-[#007AFF]" style={{ width: `${Math.max(4, (amount / maxCat) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </div>

        <GlassCard>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="sv-headline m-0">All subscriptions</h2>
            <div role="tablist" className="sv-segmented min-w-[300px]">
              {([
                ["all", `All (${subs.length})`],
                ["paid", `Paid (${paid.length})`],
                ["trials", `Trials (${trials.length})`],
                ["ghosts", `Ghosts (${ghosts.length})`]
              ] as const).map(([id, label]) => (
                <button key={id} role="tab" aria-selected={filter === id} className="sv-segment" onClick={() => setFilter(id)}>{label}</button>
              ))}
            </div>
          </div>
          {loading ? (
            <p className="sv-body sv-secondary">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="sv-body sv-secondary py-6 text-center m-0">Nothing here yet.</p>
          ) : (
            <ul className="m-0 p-0 divide-y divide-black/5 dark:divide-white/10">
              {visible.map((s) => (
                <SubscriptionRow key={s.id} subscription={s} activity={activity} onDelete={remove} onConvert={s.isTrial ? keep : undefined} />
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="mt-6">
          <h2 className="sv-headline mt-0 mb-1">Your data</h2>
          <p className="sv-body sv-secondary mt-0 mb-3">
            SubVault only records visit times for websites of subscriptions you added. Nothing is uploaded. Back up or move it as a JSON file.
          </p>
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="tinted" icon={<Download size={14} />} onClick={exportJson}>Export backup</ActionButton>
            <ActionButton variant="tinted" icon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>Import backup</ActionButton>
            <ActionButton variant="destructive" icon={<Trash2 size={14} />} onClick={wipe}>Delete all data</ActionButton>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ""; }} />
          </div>
          {note && <p role="status" className="sv-body mt-3 mb-0">{note}</p>}
        </GlassCard>
      </div>

      <TrialModal open={adding} onClose={() => setAdding(false)} onSaved={refreshBadge} />
    </main>
  );
}

export default Options;
