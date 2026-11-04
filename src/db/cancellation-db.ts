/**
 * Curated, local cancellation deep-link database.
 *
 * `kind`:
 *   "cancel"  – the URL opens the cancellation flow (or the page that holds the cancel button) directly.
 *   "billing" – the URL opens the account / billing / membership page where cancelling lives.
 *
 * Providers move these pages around. Treat every entry as a best-effort starting
 * point: SubVault always lets the user edit a subscription's cancellation URL.
 */
import { baseDomain } from "../lib/utils";

export type CancellationKind = "cancel" | "billing";

export interface CancellationEntry {
  domain: string;
  name: string;
  category: string;
  url: string;
  kind: CancellationKind;
}

type Row = [domain: string, name: string, category: string, url: string, kind?: "c" | "b"];

const ROWS: Row[] = [
  // ── Streaming & video ──────────────────────────────────────────────
  ["netflix.com", "Netflix", "Streaming", "https://www.netflix.com/cancelplan", "c"],
  ["hulu.com", "Hulu", "Streaming", "https://secure.hulu.com/account"],
  ["disneyplus.com", "Disney+", "Streaming", "https://www.disneyplus.com/account/subscription"],
  ["max.com", "Max", "Streaming", "https://www.max.com/account"],
  ["youtube.com", "YouTube Premium", "Streaming", "https://www.youtube.com/paid_memberships"],
  ["primevideo.com", "Prime Video", "Streaming", "https://www.primevideo.com/settings"],
  ["paramountplus.com", "Paramount+", "Streaming", "https://www.paramountplus.com/account/"],
  ["peacocktv.com", "Peacock", "Streaming", "https://www.peacocktv.com/account"],
  ["crunchyroll.com", "Crunchyroll", "Streaming", "https://www.crunchyroll.com/account/membership"],
  ["tv.apple.com", "Apple TV+", "Streaming", "https://apps.apple.com/account/subscriptions"],
  ["twitch.tv", "Twitch", "Streaming", "https://www.twitch.tv/subscriptions"],
  ["dazn.com", "DAZN", "Streaming", "https://www.dazn.com/account"],
  ["espn.com", "ESPN+", "Streaming", "https://www.espn.com/espnplus/account"],
  ["curiositystream.com", "CuriosityStream", "Streaming", "https://curiositystream.com/account"],

  // ── Music & audio ──────────────────────────────────────────────────
  ["spotify.com", "Spotify", "Music", "https://www.spotify.com/account/subscription/"],
  ["music.apple.com", "Apple Music", "Music", "https://apps.apple.com/account/subscriptions"],
  ["tidal.com", "TIDAL", "Music", "https://account.tidal.com/subscription"],
  ["deezer.com", "Deezer", "Music", "https://www.deezer.com/account/subscription"],
  ["audible.com", "Audible", "Music", "https://www.audible.com/account/overview"],
  ["siriusxm.com", "SiriusXM", "Music", "https://www.siriusxm.com/player/account"],
  ["soundcloud.com", "SoundCloud Go", "Music", "https://soundcloud.com/settings/subscriptions"],

  // ── News & reading ────────────────────────────────────────────────
  ["nytimes.com", "The New York Times", "News", "https://myaccount.nytimes.com/seg/subscription"],
  ["wsj.com", "The Wall Street Journal", "News", "https://customercenter.wsj.com/"],
  ["washingtonpost.com", "The Washington Post", "News", "https://www.washingtonpost.com/my-post/"],
  ["economist.com", "The Economist", "News", "https://myaccount.economist.com/"],
  ["ft.com", "Financial Times", "News", "https://myaccount.ft.com/"],
  ["bloomberg.com", "Bloomberg", "News", "https://www.bloomberg.com/account/settings"],
  ["medium.com", "Medium", "News", "https://medium.com/me/membership"],
  ["substack.com", "Substack", "News", "https://substack.com/settings"],
  ["patreon.com", "Patreon", "News", "https://www.patreon.com/settings/memberships"],
  ["kindle.amazon.com", "Kindle Unlimited", "News", "https://www.amazon.com/kindle-dbs/hz/subscribe/ku"],
  ["scribd.com", "Everand (Scribd)", "News", "https://www.everand.com/account-settings"],

  // ── AI ─────────────────────────────────────────────────────────────
  ["claude.ai", "Claude Pro", "AI", "https://claude.ai/settings/billing", "c"],
  ["chatgpt.com", "ChatGPT Plus", "AI", "https://chatgpt.com/#settings/Account"],
  ["midjourney.com", "Midjourney", "AI", "https://www.midjourney.com/account"],
  ["perplexity.ai", "Perplexity Pro", "AI", "https://www.perplexity.ai/settings/subscription"],
  ["cursor.com", "Cursor", "AI", "https://www.cursor.com/dashboard"],
  ["runwayml.com", "Runway", "AI", "https://app.runwayml.com/account/billing"],
  ["elevenlabs.io", "ElevenLabs", "AI", "https://elevenlabs.io/app/subscription"],
  ["jasper.ai", "Jasper", "AI", "https://app.jasper.ai/settings/billing"],
  ["copy.ai", "Copy.ai", "AI", "https://app.copy.ai/settings/billing"],
  ["suno.com", "Suno", "AI", "https://suno.com/account"],
  ["poe.com", "Poe", "AI", "https://poe.com/settings"],
  ["gemini.google.com", "Google AI Pro", "AI", "https://one.google.com/settings"],
  ["grammarly.com", "Grammarly", "AI", "https://account.grammarly.com/subscription"],
  ["quillbot.com", "QuillBot", "AI", "https://quillbot.com/account"],
  ["otter.ai", "Otter.ai", "AI", "https://otter.ai/account"],

  // ── Design & creative ─────────────────────────────────────────────
  ["adobe.com", "Adobe Creative Cloud", "Design", "https://account.adobe.com/plans"],
  ["figma.com", "Figma", "Design", "https://www.figma.com/settings"],
  ["canva.com", "Canva", "Design", "https://www.canva.com/settings/billing-and-teams"],
  ["framer.com", "Framer", "Design", "https://framer.com/projects"],
  ["sketch.com", "Sketch", "Design", "https://www.sketch.com/account/"],
  ["envato.com", "Envato Elements", "Design", "https://elements.envato.com/user/subscription"],
  ["shutterstock.com", "Shutterstock", "Design", "https://www.shutterstock.com/account/subscriptions"],
  ["miro.com", "Miro", "Design", "https://miro.com/app/settings/user-profile/"],
  ["loom.com", "Loom", "Design", "https://www.loom.com/settings/billing"],

  // ── Productivity & work ───────────────────────────────────────────
  ["notion.so", "Notion", "Productivity", "https://www.notion.so/my-account"],
  ["evernote.com", "Evernote", "Productivity", "https://www.evernote.com/Settings.action"],
  ["todoist.com", "Todoist", "Productivity", "https://app.todoist.com/app/settings/subscription"],
  ["asana.com", "Asana", "Productivity", "https://app.asana.com/-/admin"],
  ["monday.com", "monday.com", "Productivity", "https://monday.com/account"],
  ["clickup.com", "ClickUp", "Productivity", "https://app.clickup.com/settings/billing"],
  ["airtable.com", "Airtable", "Productivity", "https://airtable.com/account"],
  ["atlassian.com", "Atlassian (Jira, Trello, Confluence)", "Productivity", "https://admin.atlassian.com/"],
  ["linear.app", "Linear", "Productivity", "https://linear.app/settings/billing"],
  ["slack.com", "Slack", "Productivity", "https://slack.com/account/settings"],
  ["zoom.us", "Zoom", "Productivity", "https://zoom.us/billing"],
  ["calendly.com", "Calendly", "Productivity", "https://calendly.com/app/billing"],
  ["zapier.com", "Zapier", "Productivity", "https://zapier.com/app/settings/billing"],
  ["typeform.com", "Typeform", "Productivity", "https://admin.typeform.com/account#/section/plan"],
  ["docusign.com", "DocuSign", "Productivity", "https://account.docusign.com/"],
  ["microsoft.com", "Microsoft 365", "Productivity", "https://account.microsoft.com/services"],
  ["office.com", "Microsoft 365 (Office)", "Productivity", "https://account.microsoft.com/services"],
  ["google.com", "Google Workspace / One", "Productivity", "https://one.google.com/settings"],
  ["superhuman.com", "Superhuman", "Productivity", "https://mail.superhuman.com/~/settings"],
  ["raycast.com", "Raycast Pro", "Productivity", "https://www.raycast.com/account"],

  // ── Storage & cloud ───────────────────────────────────────────────
  ["dropbox.com", "Dropbox", "Cloud", "https://www.dropbox.com/account/plan"],
  ["box.com", "Box", "Cloud", "https://app.box.com/account"],
  ["icloud.com", "iCloud+", "Cloud", "https://apps.apple.com/account/subscriptions"],
  ["apple.com", "Apple subscriptions", "Cloud", "https://apps.apple.com/account/subscriptions"],
  ["one.google.com", "Google One", "Cloud", "https://one.google.com/settings"],
  ["backblaze.com", "Backblaze", "Cloud", "https://secure.backblaze.com/account_settings.htm"],

  // ── Developer & hosting ───────────────────────────────────────────
  ["github.com", "GitHub / Copilot", "Developer", "https://github.com/settings/billing/summary"],
  ["gitlab.com", "GitLab", "Developer", "https://gitlab.com/-/profile/billings"],
  ["vercel.com", "Vercel", "Developer", "https://vercel.com/account"],
  ["netlify.com", "Netlify", "Developer", "https://app.netlify.com/teams"],
  ["heroku.com", "Heroku", "Developer", "https://dashboard.heroku.com/account/billing"],
  ["digitalocean.com", "DigitalOcean", "Developer", "https://cloud.digitalocean.com/account/billing"],
  ["cloudflare.com", "Cloudflare", "Developer", "https://dash.cloudflare.com/?to=/:account/billing/subscriptions"],
  ["supabase.com", "Supabase", "Developer", "https://supabase.com/dashboard/org/_/billing"],
  ["render.com", "Render", "Developer", "https://dashboard.render.com/billing"],
  ["railway.app", "Railway", "Developer", "https://railway.app/account/billing"],
  ["jetbrains.com", "JetBrains", "Developer", "https://account.jetbrains.com/licenses"],
  ["postman.com", "Postman", "Developer", "https://go.postman.co/billing"],
  ["sentry.io", "Sentry", "Developer", "https://sentry.io/settings/billing/"],
  ["openai.com", "OpenAI API", "Developer", "https://platform.openai.com/settings/organization/billing/overview"],
  ["anthropic.com", "Anthropic API", "Developer", "https://console.anthropic.com/settings/billing"],

  // ── Web & marketing ───────────────────────────────────────────────
  ["squarespace.com", "Squarespace", "Web", "https://account.squarespace.com/"],
  ["wix.com", "Wix", "Web", "https://manage.wix.com/account/billing"],
  ["webflow.com", "Webflow", "Web", "https://webflow.com/dashboard/account/billing"],
  ["shopify.com", "Shopify", "Web", "https://admin.shopify.com/settings/billing"],
  ["godaddy.com", "GoDaddy", "Web", "https://account.godaddy.com/subscriptions"],
  ["namecheap.com", "Namecheap", "Web", "https://ap.www.namecheap.com/Profile/Billing"],
  ["mailchimp.com", "Mailchimp", "Web", "https://admin.mailchimp.com/account/billing/"],
  ["hubspot.com", "HubSpot", "Web", "https://app.hubspot.com/account-and-billing"],
  ["semrush.com", "Semrush", "Web", "https://www.semrush.com/billing-admin/profile/subscription/"],
  ["ahrefs.com", "Ahrefs", "Web", "https://app.ahrefs.com/account/billing"],

  // ── Security & privacy ────────────────────────────────────────────
  ["1password.com", "1Password", "Security", "https://my.1password.com/profile"],
  ["lastpass.com", "LastPass", "Security", "https://lastpass.com/account.php"],
  ["bitwarden.com", "Bitwarden", "Security", "https://vault.bitwarden.com/#/settings/subscription/premium"],
  ["nordvpn.com", "NordVPN", "Security", "https://my.nordaccount.com/billing/my-subscriptions/"],
  ["expressvpn.com", "ExpressVPN", "Security", "https://www.expressvpn.com/subscriptions"],
  ["surfshark.com", "Surfshark", "Security", "https://my.surfshark.com/account/subscription"],
  ["proton.me", "Proton", "Security", "https://account.proton.me/u/0/dashboard"],
  ["norton.com", "Norton", "Security", "https://my.norton.com/home/subscription"],
  ["mcafee.com", "McAfee", "Security", "https://home.mcafee.com/Secure/MyAccount.aspx"],

  // ── Learning ──────────────────────────────────────────────────────
  ["duolingo.com", "Duolingo Super", "Learning", "https://www.duolingo.com/settings/super"],
  ["coursera.org", "Coursera", "Learning", "https://www.coursera.org/account-settings"],
  ["masterclass.com", "MasterClass", "Learning", "https://www.masterclass.com/account"],
  ["skillshare.com", "Skillshare", "Learning", "https://www.skillshare.com/settings/payments"],
  ["linkedin.com", "LinkedIn Premium", "Learning", "https://www.linkedin.com/premium/cancel", "c"],
  ["brilliant.org", "Brilliant", "Learning", "https://brilliant.org/account/settings/"],
  ["babbel.com", "Babbel", "Learning", "https://my.babbel.com/en/accounts/subscription"],
  ["chegg.com", "Chegg", "Learning", "https://www.chegg.com/my/settings"],

  // ── Health & fitness ──────────────────────────────────────────────
  ["strava.com", "Strava", "Fitness", "https://www.strava.com/settings/subscription"],
  ["onepeloton.com", "Peloton", "Fitness", "https://members.onepeloton.com/preferences/subscriptions"],
  ["headspace.com", "Headspace", "Fitness", "https://www.headspace.com/settings/subscription"],
  ["calm.com", "Calm", "Fitness", "https://www.calm.com/account"],
  ["myfitnesspal.com", "MyFitnessPal", "Fitness", "https://www.myfitnesspal.com/account/premium"],
  ["whoop.com", "WHOOP", "Fitness", "https://app.whoop.com/membership"],

  // ── Gaming ────────────────────────────────────────────────────────
  ["xbox.com", "Xbox Game Pass", "Gaming", "https://account.microsoft.com/services"],
  ["playstation.com", "PlayStation Plus", "Gaming", "https://www.playstation.com/acct/management"],
  ["nintendo.com", "Nintendo Switch Online", "Gaming", "https://accounts.nintendo.com/shop/subscriptions"],
  ["ea.com", "EA Play", "Gaming", "https://www.ea.com/ea-play/account"],

  // ── Shopping & lifestyle ──────────────────────────────────────────
  ["amazon.com", "Amazon Prime", "Shopping", "https://www.amazon.com/gp/primecentral"],
  ["walmart.com", "Walmart+", "Shopping", "https://www.walmart.com/plus/account"],
  ["doordash.com", "DoorDash DashPass", "Shopping", "https://www.doordash.com/consumer/membership/"],
  ["instacart.com", "Instacart+", "Shopping", "https://www.instacart.com/store/account/instacart-plus"],
  ["uber.com", "Uber One", "Shopping", "https://account.uber.com/"],
  ["hellofresh.com", "HelloFresh", "Shopping", "https://www.hellofresh.com/my-account/deliveries/menu"],
  ["tinder.com", "Tinder", "Lifestyle", "https://tinder.com/app/settings"],
  ["bumble.com", "Bumble", "Lifestyle", "https://bumble.com/get-started"]
];

export const CANCELLATION_DB: CancellationEntry[] = ROWS.map(
  ([domain, name, category, url, kind]) => ({
    domain,
    name,
    category,
    url,
    kind: kind === "c" ? "cancel" : "billing"
  })
);

const BY_DOMAIN = new Map<string, CancellationEntry>(
  CANCELLATION_DB.map((e) => [e.domain, e])
);

/** Look up by host or domain; falls back from `app.figma.com` → `figma.com`. */
export function findCancellation(hostOrDomain: string): CancellationEntry | undefined {
  const host = hostOrDomain.toLowerCase().replace(/^www\./, "");
  if (BY_DOMAIN.has(host)) return BY_DOMAIN.get(host);
  // Walk up the labels so `music.apple.com` finds its own row before `apple.com`.
  const labels = host.split(".");
  for (let i = 1; i < labels.length - 1; i++) {
    const hit = BY_DOMAIN.get(labels.slice(i).join("."));
    if (hit) return hit;
  }
  return BY_DOMAIN.get(baseDomain(host));
}

/** Case-insensitive name/domain search used by the "add subscription" autocomplete. */
export function searchCancellationDb(query: string, limit = 6): CancellationEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return CANCELLATION_DB.filter(
    (e) => e.name.toLowerCase().includes(q) || e.domain.includes(q)
  ).slice(0, limit);
}
