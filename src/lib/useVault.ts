import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";

import { db, getIdleInfo, type DomainActivity, type Subscription } from "../db";
import { monthlyCost } from "./utils";

/** Live view of the local vault; re-renders whenever IndexedDB changes (including from the background worker). */
export function useVault() {
  const subscriptions = useLiveQuery(() => db.subscriptions.orderBy("renewalDate").toArray(), []);
  const activityRows = useLiveQuery(() => db.domainActivity.toArray(), []);

  return useMemo(() => {
    const loading = subscriptions === undefined || activityRows === undefined;
    const subs: Subscription[] = subscriptions ?? [];
    const activity = new Map<string, DomainActivity>((activityRows ?? []).map((r) => [r.domain, r]));
    const paid = subs.filter((s) => !s.isTrial);
    const trials = subs.filter((s) => s.isTrial);
    const ghosts = paid.filter((s) => getIdleInfo(s, activity).idle);
    const monthly = paid.reduce((n, s) => n + monthlyCost(s), 0);
    const wastedPerMonth = ghosts.reduce((n, s) => n + monthlyCost(s), 0);
    return { loading, subs, paid, trials, ghosts, activity, monthly, wastedPerMonth };
  }, [subscriptions, activityRows]);
}
