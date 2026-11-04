# SubVault → Safari (macOS) with the Xcode command line

Safari ships WebExtensions through a small native container app. Apple's
`safari-web-extension-converter` generates that app from the built extension.
Everything below is free: you need a Mac with Xcode (free from the Mac App Store)
and **no paid Apple Developer account** for local use.

## Prerequisites

| Requirement | Check |
| --- | --- |
| macOS 12+ and Xcode 14+ | `xcodebuild -version` |
| Xcode command-line tools selected | `xcode-select -p` (fix: `sudo xcode-select -s /Applications/Xcode.app`) |
| Node 18+ | `node -v` |

## 1. Build the extension for Safari

```bash
npm install
npx plasmo build --target=safari-mv3
```

Plasmo writes the production bundle to **`build/safari-mv3-prod`**
(it is `-prod`, not `-bundle`; `npm run build:safari` runs the same command).

## 2. Convert the bundle to an Xcode project

```bash
xcrun safari-web-extension-converter build/safari-mv3-prod \
  --project-location safari \
  --app-name "SubVault" \
  --bundle-identifier com.example.subvault \
  --macos-only \
  --no-open
```

* `--project-location safari` puts the generated project in `safari/SubVault/`
  (git-ignored). Use your own reverse-DNS `--bundle-identifier`.
* Drop `--macos-only` to also generate an iOS/iPadOS target.
* Re-run steps 1–2 whenever the extension code changes, or open the generated
  project and replace the files under `SubVault Extension/Resources/` with the new build.

## 3. Build and run locally, unsigned

```bash
xcodebuild \
  -project "safari/SubVault/SubVault.xcodeproj" \
  -scheme "SubVault" \
  -configuration Debug \
  -derivedDataPath safari/build \
  CODE_SIGN_IDENTITY="-" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO \
  build

open "safari/build/Build/Products/Debug/SubVault.app"
```

If `xcodebuild` reports a signing problem, open the project in Xcode instead
(`open safari/SubVault/SubVault.xcodeproj`), select both targets
(**SubVault** and **SubVault Extension**) → *Signing & Capabilities* →
set **Team** to your free personal team ("Sign to Run Locally" / Personal Team) and press ⌘R.
A free Apple ID is enough; no paid membership is needed to run on your own Mac.

## 4. Enable it in Safari

1. Safari → **Settings → Advanced** → tick **Show features for web developers**
   (Safari 17 and earlier: **Show Develop menu in menu bar**).
2. **Develop → Allow Unsigned Extensions** (re-enable each time Safari restarts).
   This step is required for builds that are not signed with a paid certificate.
3. Safari → **Settings → Extensions** → tick **SubVault**.
4. Click **Always Allow on Every Website** for SubVault. Content scripts and the
   checkout sheet need website access; without it the sheet cannot appear.

## Known Safari differences

* **Badge/idle monitor:** works through `chrome.action`/`browser.action` badges, but
  Safari may suspend the background service worker more aggressively than Chrome.
  SubVault re-computes the badge on every tracked-site visit and on its alarm, so it
  recovers on its own.
* **Unsigned extensions** are disabled again when Safari quits. Distributing to other
  people requires an Apple Developer account (paid) and notarization.
* **iOS:** the converter can generate an iOS target, but iOS builds must be signed
  with at least a free personal team and installed from Xcode onto your device.
* **Downloads:** the `.ics` calendar file is downloaded through a normal anchor click,
  which Safari may confirm with a "Do you want to allow downloads?" prompt the first time.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `xcrun: error: unable to find utility "safari-web-extension-converter"` | Install Xcode (not only CLT) and run `sudo xcode-select -s /Applications/Xcode.app`. |
| Extension missing in Safari → Extensions | Run the container app once (`open …/SubVault.app`) and enable *Allow Unsigned Extensions*. |
| Converter warns about unsupported keys | Safe to ignore; SubVault only uses `storage`, `tabs`, `alarms` and `webNavigation`. |
