import { Ghost } from "lucide-react";
import React from "react";

import { SUBVAULT_CONFIG } from "../../plasmo.config";
import { getIdleInfo, type DomainActivity, type Subscription } from "../db";
import { cn, formatCurrency, monthlyCost } from "../lib/utils";

/** Orange "Ghost SaaS" status pill shown when a paid service has gone unused for 30+ days. */
export const GhostBadge: React.FC<{ daysIdle: number; className?: string }> = ({ daysIdle, className }) => (
  <span className={cn("sv-badge sv-badge-orange", className)} title={`No visits for ${daysIdle} days`}>
    <Ghost size={11} aria-hidden /> Idle Ghost · {daysIdle}d
  </span>
);

type Heat = "hot" | "warm" | "cool" | "ghost" | "new";

function heatFor(daysIdle: number, idle: boolean, visited: boolean): Heat {
  if (idle) return "ghost";
  if (!visited) return "new";
  if (daysIdle <= 7) return "hot";
  if (daysIdle <= 14) return "warm";
  return "cool";
}

const HEAT_STYLE: Record<Heat, { bg: string; label: string }> = {
  hot: { bg: "bg-[#30D158]", label: "Used this week" },
  warm: { bg: "bg-[#30D158]/55", label: "Used in the last 2 weeks" },
  cool: { bg: "bg-[#007AFF]/45", label: "Cooling off" },
  ghost: { bg: "bg-[#FF9500]", label: `Idle ${SUBVAULT_CONFIG.idleThresholdDays}+ days` },
  new: { bg: "bg-black/15 dark:bg-white/20", label: "No visits yet" }
};

interface UsageHeatmapProps {
  subscriptions: Subscription[];
  activity: Map<string, DomainActivity>;
  compact?: boolean;
}

/** One tile per tracked service, coloured by how recently you actually used it. */
export const UsageHeatmap: React.FC<UsageHeatmapProps> = ({ subscriptions, activity, compact }) => {
  const tracked = subscriptions.filter((s) => !s.isTrial && s.domain);
  if (tracked.length === 0) {
    return <p className="sv-body sv-secondary m-0">Add a paid subscription with its website to see how often you use it.</p>;
  }

  const rows = tracked
    .map((s) => ({ s, info: getIdleInfo(s, activity) }))
    .sort((a, b) => b.info.daysIdle - a.info.daysIdle);
  const wasted = rows.filter((r) => r.info.idle).reduce((n, r) => n + monthlyCost(r.s), 0);

  return (
    <div className="sv-fade-in">
      <div role="list" className={cn("grid gap-2", compact ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-6")}>
        {rows.map(({ s, info }) => {
          const heat = heatFor(info.daysIdle, info.idle, !!info.lastVisited);
          return (
            <div
              role="listitem"
              key={s.id}
              title={`${s.name}: ${HEAT_STYLE[heat].label}${info.lastVisited ? ` · ${info.daysIdle}d since last visit` : ""}`}
              className={cn("rounded-xl p-2 text-white min-h-[52px] flex flex-col justify-between", HEAT_STYLE[heat].bg, heat === "new" && "!text-black/70 dark:!text-white/80")}>
              <span className="text-[11px] font-semibold leading-tight line-clamp-2">{s.name}</span>
              <span className="text-[10px] opacity-90">{info.lastVisited ? `${info.daysIdle}d` : "—"}</span>
            </div>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-3 p-0 list-none">
        {(Object.keys(HEAT_STYLE) as Heat[]).map((h) => (
          <li key={h} className="sv-caption flex items-center gap-1">
            <span className={cn("inline-block w-2.5 h-2.5 rounded-sm", HEAT_STYLE[h].bg)} /> {HEAT_STYLE[h].label}
          </li>
        ))}
      </ul>
      {wasted > 0 && (
        <p className="sv-body mt-3 mb-0 text-[#c76e00] dark:text-[#ffb340] font-medium">
          ≈ {formatCurrency(wasted)}/month is going to services you haven't opened in {SUBVAULT_CONFIG.idleThresholdDays}+ days.
        </p>
      )}
    </div>
  );
};
