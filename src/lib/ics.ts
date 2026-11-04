import { createEvent, type EventAttributes } from "ics";

import type { Subscription } from "../db";
import { parseISODate, safeFileName } from "./utils";

export interface TrialIcsInput {
  name: string;
  /** `YYYY-MM-DD` — the day the trial ends / first charge happens. */
  endDate: string;
  cancellationUrl?: string;
  domain?: string;
}

/** Build the iCalendar text for a "cancel before you're charged" all-day event with alarms. */
export function buildTrialIcs(input: TrialIcsInput): string {
  const d = parseISODate(input.endDate);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  const lines = [
    `Your ${input.name} free trial ends today. Cancel now to avoid being charged.`,
    input.cancellationUrl ? `Cancel here: ${input.cancellationUrl}` : "",
    input.domain ? `Site: https://${input.domain}` : "",
    "— Added by SubVault (stored only on your device)"
  ].filter(Boolean);

  const event: EventAttributes = {
    title: `Cancel ${input.name} trial`,
    description: lines.join("\n"),
    start: [d.getFullYear(), d.getMonth() + 1, d.getDate()],
    end: [next.getFullYear(), next.getMonth() + 1, next.getDate()],
    url: input.cancellationUrl,
    status: "CONFIRMED",
    busyStatus: "FREE",
    productId: "subvault/ics",
    calName: "SubVault",
    // For all-day events offsets are measured from 00:00 of the event day: 63h before = 9am three days ahead, 15h before = 9am the day before, 9h after = 9am on the day.
    alarms: [
      { action: "display", description: `${input.name} trial ends in 3 days`, trigger: { hours: 63, minutes: 0, before: true } },
      { action: "display", description: `${input.name} trial ends tomorrow — cancel today`, trigger: { hours: 15, minutes: 0, before: true } },
      { action: "display", description: `${input.name} trial ends TODAY — cancel now`, trigger: { hours: 9, minutes: 0, before: false } }
    ]
  };

  const { error, value } = createEvent(event);
  if (error || !value) throw new Error(`Could not build calendar file: ${error?.message ?? "unknown error"}`);
  return value;
}

export function icsFileName(name: string): string {
  return `Cancel_${safeFileName(name)}_Trial.ics`;
}

/** Trigger a browser download of an .ics string. Works in pages, popups and content scripts. */
export function downloadIcs(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Convenience: generate + download the reminder for a stored trial. */
export function exportTrialReminder(sub: Pick<Subscription, "name" | "domain" | "cancellationUrl" | "trialEndDate" | "renewalDate">): void {
  const endDate = sub.trialEndDate ?? sub.renewalDate;
  downloadIcs(
    icsFileName(sub.name),
    buildTrialIcs({ name: sub.name, endDate, cancellationUrl: sub.cancellationUrl, domain: sub.domain })
  );
}
