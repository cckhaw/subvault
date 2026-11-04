import { CalendarPlus, ExternalLink, Trash2 } from "lucide-react";
import React from "react";

import { getIdleInfo, type DomainActivity, type Subscription } from "../db";
import { exportTrialReminder } from "../lib/ics";
import { cn, daysUntil, formatCurrency, formatDate, nextRenewal, openExternal, relativeDays } from "../lib/utils";
import { ActionButton } from "./ActionButton";
import { GhostBadge } from "./UsageHeatmap";

interface SubscriptionRowProps {
  subscription: Subscription;
  activity: Map<string, DomainActivity>;
  onDelete?: (sub: Subscription) => void;
  onConvert?: (sub: Subscription) => void;
  dense?: boolean;
}

export const SubscriptionRow: React.FC<SubscriptionRowProps> = ({ subscription: s, activity, onDelete, onConvert, dense }) => {
  const idle = getIdleInfo(s, activity);
  const trialDays = s.isTrial && s.trialEndDate ? daysUntil(s.trialEndDate) : null;
  const urgent = trialDays !== null && trialDays <= 3;

  return (
    <li className={cn("list-none flex items-center gap-3", dense ? "py-2" : "py-3")}>
      <div
        aria-hidden
        className="shrink-0 w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white grid place-items-center font-bold text-base">
        {s.name.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="sv-headline truncate">{s.name}</span>
          {s.isTrial ? (
            <span className={cn("sv-badge", urgent ? "sv-badge-red" : "sv-badge-blue")}>
              Trial{trialDays !== null && ` · ${trialDays < 0 ? "ended" : trialDays === 0 ? "ends today" : `${trialDays}d left`}`}
            </span>
          ) : idle.idle ? (
            <GhostBadge daysIdle={idle.daysIdle} />
          ) : (
            <span className="sv-badge sv-badge-green">Active</span>
          )}
        </div>
        <div className="sv-caption mt-0.5 truncate">
          {s.isTrial && s.trialEndDate
            ? `Charges ${relativeDays(s.trialEndDate)} (${formatDate(s.trialEndDate)})`
            : `Renews ${formatDate(nextRenewal(s))}`}
          {s.cost > 0 && ` · ${formatCurrency(s.cost)}/${s.billingCycle === "yearly" ? "yr" : "mo"}`}
          {s.domain && ` · ${s.domain}`}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {s.isTrial && onConvert && (
          <ActionButton size="sm" variant="plain" onClick={() => onConvert(s)} title="I kept it — mark as paid">
            Keep
          </ActionButton>
        )}
        {s.isTrial && (
          <ActionButton size="sm" variant="tinted" aria-label={`Download calendar reminder for ${s.name}`} title="Download .ics reminder" onClick={() => exportTrialReminder(s)}>
            <CalendarPlus size={14} />
          </ActionButton>
        )}
        {s.cancellationUrl ? (
          <ActionButton size="sm" variant="destructive" icon={<ExternalLink size={13} />} onClick={() => openExternal(s.cancellationUrl!)} title={`Open ${s.name} cancellation page`}>
            Cancel
          </ActionButton>
        ) : null}
        {onDelete && (
          <ActionButton size="sm" variant="plain" aria-label={`Remove ${s.name}`} title="Remove from SubVault" onClick={() => onDelete(s)}>
            <Trash2 size={14} className="text-[#FF3B30]" />
          </ActionButton>
        )}
      </div>
    </li>
  );
};
