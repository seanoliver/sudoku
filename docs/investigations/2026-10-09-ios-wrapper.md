# Shipping Sudoku to the iOS App Store as a native wrapper

## Context

Sean asked whether the Sudoku web app can ship to the iOS App Store as a native wrapper, and whether the web app can stay at parity from one codebase. He also asked whether it can feel close to native. Haptics matter most to him.

The app today:

- Next.js 16.3.5, React 19.3.0, `motion` 13.4.6 (`package.json`).
- One route, `/`. Home, the game, Learn, lessons, History, and Replay are views inside `src/components/game.tsx`, switched by state; entering the game and opening Replay also push history entries (`docs/investigations/2026-09-27-back-button-history.md`).
- No server features. `src/app/` includes `layout.tsx`, `page.tsx`, `manifest.ts`, `globals.css`, and static `opengraph-image.png` and `twitter-image.png`. No `next/image`, no Server Actions, no cookies.
- Puzzle generation runs in a dedicated Web Worker (`new Worker(new URL('../lib/puzzle.worker.ts', import.meta.url))`, `game.tsx:173`).
- Offline comes from `scripts/build-sw.mjs`, which writes `public/sw.js` after `next build`. The app registers it at `game.tsx:248`.
- `next.config.ts` sets custom `headers()` for `/sw.js`.
- Haptics today: `const buzz = () => { try { navigator.vibrate?.(8); } catch {} }` (`game.tsx:71`), called on number entry and batch toggles. On iPhone this does nothing (see finding 1).
- Saved progress lives in `localStorage`. Vercel Web Analytics is loaded in `layout.tsx`.

Research date: 2026-10-09. Capacitor docs read at version v8 (current `latest` on npm is `@capacitor/core` 8.5.3, published 2026-10-07; `9.0.0-alpha.8` is on the `next` tag). `@capacitor/haptics` latest is 8.0.2.

## Key findings

1. **Yes, it is feasible from one codebase.** A Capacitor app loads a folder of static files. This Next.js version builds the app as a static export with two small changes. I proved this with a trial build in a scratch copy (see Verification). The Vercel build stays as it is.
2. **Haptics need a native bridge. The web cannot do them on iPhone.** WebKit's official position on the Vibration API is "oppose", and Safari does not implement `navigator.vibrate`. The `@capacitor/haptics` plugin calls the real UIKit feedback generators.
3. **The plugin covers most of UIKit, but not all.** It exposes impact Light, Medium, and Heavy, all three notification types, and selection. It does not expose impact `.soft` or `.rigid`, or the `intensity` parameter. A small local Swift plugin can add those.
4. **The service worker will not run inside the bundled app, and it does not need to.** WKWebView does not support service workers on custom schemes, and Capacitor serves bundled files from `capacitor://localhost`. The files are already on the device, so the app is offline by construction.
5. **App Review is the main risk, not the tech.** Guideline 4.2 asks for more than "a repackaged website". Guideline 4.3(b) warns about categories that are already widely available. Sudoku is a crowded category. The guidelines do not list features that guarantee approval.
6. **120Hz is likely unavailable to WKWebView content.** Users report a cap near 60fps and there is no public switch; the WebKit feature request (bug 294338) is open with no ruling. JavaScript-driven animation (`motion`, `requestAnimationFrame`) will likely run near 60fps in the app. CSS transitions are untested.
7. **Cost:** Apple Developer Program, $99 per year. TestFlight builds last 90 days.

## How it works

### 1. Haptics

**No web haptics API in iOS Safari.**

- WebKit's standards position on the Vibration API is labeled `position: oppose`, with concerns including integration, annoyance, and power. A WebKit commenter wrote that "it wouldn't even be possible to support this API on Apple's native platforms". Closed 2023-11-14. Source: https://github.com/WebKit/standards-positions/issues/267
- One narrow exception: Safari on iOS 18 "adds haptic feedback for `<input type=checkbox switch>`", where "a single tap is felt". This is a fixed system tick on a switch control. It is not a general API. Source: https://webkit.org/blog/15865/webkit-features-in-safari-18-0/ (2024-09-16).
- So `navigator.vibrate?.(8)` in `game.tsx:71` is a no-op on iPhone, in Safari and in a WKWebView.

**Capacitor plugin: `@capacitor/haptics` 8.0.2.**

Docs: https://capacitorjs.com/docs/apis/haptics (v8). Source: https://github.com/ionic-team/capacitor-haptics, `ios/Sources/HapticsPlugin/HapticsPlugin.swift` and `Haptics.swift` (HEAD `567eaf5`, 2026-06-16).

How each call maps to iOS, read from the Swift source:

| JS call | iOS call in the plugin source |
| --- | --- |
| `Haptics.impact({ style: ImpactStyle.Light })` | `UIImpactFeedbackGenerator(style: .light).impactOccurred()` |
| `Haptics.impact({ style: ImpactStyle.Medium })` | `UIImpactFeedbackGenerator(style: .medium).impactOccurred()` |
| `Haptics.impact()` or `{ style: ImpactStyle.Heavy }` | `.heavy` (the default when no style is passed) |
| `Haptics.notification({ type: NotificationType.Success })` | `UINotificationFeedbackGenerator().notificationOccurred(.success)` (default) |
| `NotificationType.Warning` / `Error` | `.warning` / `.error` |
| `Haptics.selectionStart()` | creates a `UISelectionFeedbackGenerator` and calls `prepare()` |
| `Haptics.selectionChanged()` | `generator.selectionChanged()` then `prepare()`, but only if `selectionStart()` ran first. Otherwise it does nothing. |
| `Haptics.selectionEnd()` | releases the generator |
| `Haptics.vibrate({ duration })` | a Core Haptics continuous event at full intensity and sharpness, or `AudioServicesPlayAlertSound(kSystemSoundID_Vibrate)` as a fallback |

What UIKit offers that the plugin does not expose:

- `UIImpactFeedbackGenerator.FeedbackStyle` has five cases: `heavy`, `light`, `medium`, `rigid`, `soft`. Source: https://developer.apple.com/documentation/uikit/uiimpactfeedbackgenerator/feedbackstyle (iOS 10+).
- `impactOccurred(intensity:)` "Triggers impact feedback with a specific intensity" (iOS 13+). Source: https://developer.apple.com/documentation/uikit/uiimpactfeedbackgenerator/impactoccurred(intensity:)
- The plugin builds a new impact generator on every call and does not call `prepare()` first. Apple says `prepare()` "Prepares the generator to trigger feedback". Source: https://developer.apple.com/documentation/uikit/uifeedbackgenerator/prepare() . Whether this adds noticeable latency is UNVERIFIED. It needs a feel test on a phone. (Resolved on device: see Device spike results.)
- Every call crosses the async JS-to-native bridge, and the plugin then hops to the main queue (`DispatchQueue.main.async`). Latency is UNVERIFIED and needs a device test. (Resolved on device: see Device spike results.)

If Sean wants `.soft`, `.rigid`, intensity, or pre-warmed generators, Capacitor supports a local plugin in the app project: a Swift class that subclasses `CAPPlugin` and conforms to `CAPBridgedPlugin`, registered in `capacitorDidLoad()` with `bridge?.registerPluginInstance(...)`, and called from JS through `registerPlugin`. Source: https://capacitorjs.com/docs/ios/custom-code (v8). This is about 40 lines of Swift.

The plugin's web fallback throws when `navigator.vibrate` is missing (`src/web.ts`, `throw this.unavailable('Browser does not support the vibrate API')`). Because the plugin's methods are `async`, the caller gets a rejected promise, which a synchronous `try`/`catch` like `buzz()` does not catch. Call the plugin only in the native build (or when `Capacitor.isNativePlatform()` is true), or attach `.catch()`.

**Apple's guidance on using haptics** (HIG, Playing haptics, https://developer.apple.com/design/human-interface-guidelines/playing-haptics):

- "Use system-provided haptic patterns according to their documented meanings."
- "Use haptics consistently throughout your app or game."
- "Avoid overusing haptics."
- "Make haptics optional. Let people turn off or mute haptics, and make sure people can still enjoy your app or game without them."
- UIKit's own text: impact is for when "a user interface object collides with something or snaps into place"; selection is "to indicate a change in selection"; notification is "to indicate successes, failures, and warnings". Source: https://developer.apple.com/documentation/uikit/uifeedbackgenerator

A plausible mapping for this app (a design proposal, not a source claim): selection tick when the selected cell moves; light or soft impact on number entry; success notification on puzzle complete; error notification when Block incorrect answers refuses a number; a selection sequence while drag-selecting cells. Add a Haptics setting to meet "Make haptics optional".

### 2. App Store Review: 4.2 and related guidelines

Source: https://developer.apple.com/app-store/review/guidelines/ (read 2026-10-09; the page shows no last-updated date in the text I read).

Exact wording:

- **4.2 Minimum Functionality:** "Your app should include features, content, and UI that elevate it beyond a repackaged website. If your app is not particularly useful, unique, or "app-like," it doesn't belong on the App Store. If your App doesn't provide some sort of lasting entertainment value or adequate utility, it may not be accepted."
- **4.2.2:** "Other than catalogs, apps shouldn't primarily be marketing materials, advertisements, web clippings, content aggregators, or a collection of links."
- **4.2.3 (ii):** "If your app needs to download additional resources in order to function on initial launch, disclose the size of the download and prompt users before doing so."
- **4.3(b):** "Don't submit apps that are indistinguishable from what's already widely available. ... Certain kinds of apps, such as dating, flashlight, sound effects, wallpaper, simple timers, and fortune telling, are well established on the App Store and we will not accept new submissions unless they offer a meaningfully different or improved experience." Sudoku is not on that named list. It is still a crowded category, so the "meaningfully different" bar is worth planning for.
- **2.5.2:** "Apps should be self-contained in their bundles, ... nor may they download, install, or execute code which introduces or changes features or functionality of the app".
- **2.5.6:** "Apps that browse the web must use the appropriate WebKit framework and WebKit JavaScript." A Capacitor app uses WKWebView, which meets this.
- **5.1.1(i):** "All apps must include a link to their privacy policy in the App Store Connect metadata field and within the app in an easily accessible manner." The app has no privacy policy page today.

Apple's App Review page, "Avoiding common issues": "Websites served in an iOS app, web content that is not formatted for iOS, and limited web interactions do not make a quality app." Source: https://developer.apple.com/distribute/app-review/

What the text does and does not say:

- The guidelines name no feature list that proves an app is "more than a website". Nothing in the text says haptics, offline play, widgets, or Game Center earn approval. Any claim that a given feature is enough is UNVERIFIED.
- Features that plausibly speak to the guideline's own words ("app-like", "lasting entertainment value", not "a repackaged website", not "web content that is not formatted for iOS"):
  - It is a full game with a solver, graded puzzles, hints, and lessons. This is the strongest case for "lasting entertainment value".
  - Bundled assets, so it works fully offline on first launch with no network. This also avoids 4.2.3(ii).
  - Native haptics through UIKit generators.
  - No browser chrome, correct safe areas, status bar, launch screen, no text-selection or link-preview leaks.
  - Optional later: a WidgetKit widget (https://developer.apple.com/documentation/widgetkit) or Game Center through GameKit (https://developer.apple.com/documentation/gamekit). Both need native Swift. There is no official Capacitor plugin for either (UNVERIFIED; I checked the Capacitor docs plugin list only for the plugins named in this file).
- Remote-URL loading (`server.url`) is the shape 4.2 and the "Websites served in an iOS app" line describe most closely. Avoid it.

### 3. Native feel in WKWebView

Capacitor core source read: `ios/Capacitor/Capacitor/CAPBridgeViewController.swift` on `main` (HEAD `eb06606`, 2026-10-09). Config docs: https://capacitorjs.com/docs/config (v8).

**Edge swipe-back.**

- `WKWebView.allowsBackForwardNavigationGestures`: "A Boolean value that indicates whether horizontal swipe gestures trigger backward and forward page navigation. The default value is false." Source: https://developer.apple.com/documentation/webkit/wkwebview/allowsbackforwardnavigationgestures
- Capacitor has no config key for it (not in the v8 config page) and the core source never sets it (code search for the name in `ionic-team/capacitor` returned nothing).
- To turn it on, subclass `CAPBridgeViewController`. Its open hooks include `capacitorDidLoad()`, `webViewConfiguration(for:)`, and `webView(with:configuration:)`. Source: the Swift file above, and https://capacitorjs.com/docs/ios/viewcontroller (v8), which gives "changing the properties of the WKWebViewConfiguration, substituting a custom subclass of WKWebView for Capacitor to use" among the reasons to subclass. (On device this gesture proved the wrong tool; see Device spike results.)
- The app's back navigation is same-document `pushState` entries. Whether the WKWebView swipe gesture walks those entries, and how its page snapshot looks during the swipe, is UNVERIFIED. It must be tested on a phone. If it looks wrong, a native `UIScreenEdgePanGestureRecognizer` that calls `history.back()` through the bridge is the fallback. (Resolved on device: see Device spike results.)

**Safe areas.**

- `layout.tsx` already sets `viewportFit: 'cover'`.
- Capacitor sets `scrollView.contentInsetAdjustmentBehavior` from `ios.contentInset`, and its default is `UIScrollViewContentInsetAdjustmentNever` (`CAPInstanceDescriptor.m`). With that default, the page draws edge to edge and CSS `env(safe-area-inset-*)` handles the insets. I expect current CSS to work as is (UNVERIFIED until run on a device). (Resolved on device: see Device spike results.)
- The v8 SystemBars plugin injects `--safe-area-inset-*` variables on Android only. Its page says nothing about iOS insets. Source: https://capacitorjs.com/docs/apis/system-bars

**Status bar.**

- `@capacitor/status-bar`: `Style.Default`: "The style is based on the device appearance." It requires `UIViewControllerBasedStatusBarAppearance` = `YES` in Info.plist. `overlaysWebView` defaults to `true`. Source: https://capacitorjs.com/docs/apis/status-bar (v8) (Resolved on device: see Device spike results.)
- The app has an in-app light, dark, and system theme. When the user forces a theme against the system, call `StatusBar.setStyle` to match.

**Splash screen.**

- `@capacitor/splash-screen`: set `launchAutoHide: false` and call `SplashScreen.hide()` when the app is ready. `hide()` takes `fadeOutDuration` (default 200 ms). Source: https://capacitorjs.com/docs/apis/splash-screen (v8)
- The page does not cover dark mode or the LaunchScreen storyboard. Dark-mode launch art is UNVERIFIED and needs a check in the Xcode template.
- Background colour: if `ios.backgroundColor` is unset, Capacitor uses `UIColor.systemBackground` for the web view, which follows light and dark (`CAPBridgeViewController.swift`). That avoids a white flash in dark mode before the page paints.

**Overscroll bounce.**

- Capacitor sets `aWebView.scrollView.bounces = false` unconditionally (`CAPBridgeViewController.swift`, `prepareWebView`). So rubber-banding of the whole page is off by default.
- `ios.scrollEnabled` can turn off scrolling of the outer scroll view entirely. Source: config page above. Inner scrolling containers (sheets, Learn) still use CSS `overflow` and `overscroll-behavior` (already used on `.sheet` in `globals.css:117`).

**Text selection and long-press callouts.**

- `globals.css` already sets `user-select: none` on the board and number pad, and `-webkit-touch-callout: none` on cells.
- Apple's archived Safari CSS reference documents `-webkit-touch-callout` with values `none` and `inherit`. Source: https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariCSSRef/Articles/StandardCSSProperties.html . One developer forum thread reports `-webkit-touch-callout: none` not working on iOS 26.1 (https://developer.apple.com/forums/thread/808606). Test on device.
- `ios.allowsLinkPreview` ("Allow destination previews when pressing on links") maps to `WKWebView.allowsLinkPreview`. Set it to `false`.
- A native-only CSS class (for example `html.native { -webkit-user-select: none }` with opt-in for text that should be selectable) is cheap and keeps the web build unchanged.

**ProMotion and 120Hz.**

- Apple: `CADisableMinimumFrameDurationOnPhone` "allows your app to access frame rates higher than the system's default". Source: https://developer.apple.com/documentation/bundleresources/information-property-list/cadisableminimumframedurationonphone
- WebKit bug 294338, "Feature Request: Allow WKWebView to Support 120Hz Refresh Rate on ProMotion Devices", status NEW, unresolved, last modified 2026-09-17. One commenter reports WKWebView stays near 60fps even with that Info.plist key set, and that the only switch is an internal WebKit preference, `PreferPageRenderingUpdatesNear60FPSEnabled`, with no public API. Source: https://bugs.webkit.org/show_bug.cgi?id=294338 . These are user reports, not a WebKit statement.
- Native scrolling of the outer view is a UIKit scroll view, so it is not bound by the page's frame rate. Whether compositor-driven CSS transitions (transform, opacity) run at 120Hz inside WKWebView is UNVERIFIED. `motion` springs that run on `requestAnimationFrame` will likely run near 60fps.
- Do not use private WebKit API to unlock 120Hz. Guideline 2.5.1 says "Apps may only use public APIs and must run on the currently shipping OS." It can also break on any iOS update.

### 4. Offline: bundled assets versus `server.url`

**Bundled (recommended).**

- `npx cap sync` copies the built web bundle from `webDir` into the native project. `webDir` must contain an `index.html` with a `<head>` tag. Source: https://capacitorjs.com/docs/getting-started (v8)
- Capacitor serves those files through a `WKURLSchemeHandler` (`webConfig.setURLSchemeHandler(assetHandler, ...)` in `CAPBridgeViewController.swift`). Apple: a `WKURLSchemeHandler` is "A protocol for loading resources with URL schemes that WebKit doesn't handle." Source: https://developer.apple.com/documentation/webkit/wkurlschemehandler
- Service workers: Capacitor maintainers state "Service workers are not supported on custom schemes" and call it "a limitation on the `WKWebView`, not a Capacitor bug". Sources: https://github.com/ionic-team/capacitor/issues/7858 , https://github.com/ionic-team/capacitor/issues/7069 . The register call fails with "serviceWorker.register() must be called with a script URL whose protocol is either HTTP or HTTPS" (issue 7069).
- Consequence: skip `navigator.serviceWorker.register` when `Capacitor.isNativePlatform()` is true. Also hide the install card and the "offline ready" state in the native build. `isNativePlatform()`: "Check whether the currently running platform is native (`ios`, `android`)." Source: https://capacitorjs.com/docs/core-apis/web
- Updates ship as new App Store builds. That fits 2.5.2.
- The puzzle Web Worker is a separate chunk under `/_next/static/chunks/` in the export. That a dedicated worker loads from `capacitor://localhost` is UNVERIFIED. Test it first in the prototype, since puzzle generation depends on it. (Resolved on device: see Device spike results.)

**Remote URL (`server.url`).**

- The v8 config docs: `server.url`, "Load an external URL in the Web View. This is intended for use with live-reload servers." and "This is not intended for use in production." Source: https://capacitorjs.com/docs/config .
- Review: it is the closest match to "Websites served in an iOS app" (App Review page) and to "repackaged website" (4.2).
- Offline: a service worker on the remote https origin in WKWebView reportedly needs App-Bound Domains (UNVERIFIED, see below) (`WKAppBoundDomains`, up to 10 domains). WebKit's post says that with App-Bound Domains, outside those domains "JavaScript injection, custom style sheets, cookie manipulation, and message handler use is denied". Source: https://webkit.org/blog/10882/app-bound-domains/ (2020-06-26). That post does not mention service workers. The claim that App-Bound Domains enable service workers in WKWebView comes from a user comment in https://github.com/ionic-team/capacitor/issues/1270 , so treat it as UNVERIFIED. Capacitor's plugin bridge depends on message handlers, so this path is fragile.
- Updates would be instant, which is the only advantage. It is not worth the review and offline risk for this app.

**Storage.** Progress lives in `localStorage`. Safari's 7-day cap on script-writable storage is described for Safari, with home screen web apps on their own counter. Source: https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ (2020-03-24). That post does not mention WKWebView apps. Whether WKWebView storage in an app can be evicted under storage pressure is UNVERIFIED. If the owner wants stronger guarantees, `@capacitor/preferences` (native UserDefaults) is an option to evaluate later.

### 5. Build pipeline for parity

**Static export in this Next.js version (16.3.5).** Source: `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`.

- Enable with `output: 'export'`. "After running `next build`, Next.js will create an `out` folder with the HTML/CSS/JS assets".
- Unsupported features include Route Handlers that rely on Request, cookies, rewrites, redirects, **headers**, proxy, ISR, image optimization with the default loader, Server Actions, and intercepting routes.
- Route Handlers must be marked `export const dynamic = 'force-static'` "when a static export is enabled".

What this app uses, checked against that list:

| Feature | In this app | Static export |
| --- | --- | --- |
| Routes | one route, `/` | Fine |
| `next/image` | not used | Fine |
| Server Actions, cookies, proxy | not used | Fine |
| `headers()` in `next.config.ts` (for `/sw.js`) | used | Not applied. Build warns: "Specified "headers" will not automatically work with "output: export"". |
| `manifest.ts` | used | Build **fails** without `export const dynamic = 'force-static'` |
| Static `opengraph-image.png`, `twitter-image.png` | used | Fine |
| `@vercel/analytics` | used | Builds, but the export still references `_vercel/insights/script.js`, which does not exist in the app bundle |

**One repo, two builds.** Proposal:

- Keep `pnpm build` as the Vercel build, unchanged.
- Add `pnpm build:ios`: set an env var (for example `BUILD_TARGET=ios`), and in `next.config.ts` add `output: 'export'` and drop `headers()` only when that var is set. Then run `npx cap sync ios`. Skip `build-sw.mjs` in this path. `webDir: 'out'` in `capacitor.config.ts`.
- Add `export const dynamic = 'force-static'` to `src/app/manifest.ts`. This is harmless for Vercel, since the docs say `manifest.js` is "cached by default" anyway (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md`).
- Render `<Analytics />` only on web. Load `@capacitor/haptics` and the other plugins only on native, or call them behind `Capacitor.isNativePlatform()`. Keep `navigator.vibrate` as the web fallback.
- Commit the `ios/` Xcode project to the repo. CI keeps building the web. iOS builds run locally in Xcode at first.

**Toolchain.** Capacitor v8 iOS: "Xcode 26.0+ is required" and "iOS 15+ is supported". Source: https://capacitorjs.com/docs/ios . Apple: since 2026-04-28, uploads "must be built with Xcode 26 or later using an SDK for iOS 26". Source: https://developer.apple.com/news/upcoming-requirements/ . A Mac with Xcode is needed (inferred: Xcode runs only on macOS).

### 6. Signing, TestFlight, and cost

- Apple Developer Program: "$99 annual membership". Source: https://developer.apple.com/programs/
- A free Apple account can install on a personal device from Xcode, with limits: up to 3 devices, provisioning profiles that expire after 7 days, and up to 3 apps per device. TestFlight and App Store Connect need the paid membership. Source: https://developer.apple.com/support/compare-memberships/
- TestFlight: up to 100 internal testers and up to 10,000 external testers. Source: https://developer.apple.com/testflight/
- "You can test a build for up to 90 days." The first build sent to an external group goes to App Review; "A review is required only for the first build." Prerequisites include test information (beta description, what to test, feedback email), provisioning profiles with application identifiers, and export compliance answers. Source: https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview
- App Review timing: "typically reviewing at least 50% of submissions in less than 24 hours and 90% in less than 48 hours." Source: https://developer.apple.com/distribute/app-review/
- A fast path to a real phone: Xcode and a personal team, run on device. (The device spike used Sean's existing paid team.)

### Alternatives, briefly

**SwiftUI rewrite.** A native app in Swift with SwiftUI, sharing no code with the web app. It gives the most native feel (UIKit haptics directly, native navigation and gestures, 120Hz), but it means two codebases: the solver, hints, lessons, and every screen would be ported or bridged, and the two would drift. Its main advantage is App Review: a native app is far less exposed to guideline 4.2's "repackaged website" concern than a wrapper. That does not outweigh porting the solver, hints, and lessons and keeping two apps in step, which fails the parity goal, so it is not recommended for this app.

**Hand-written WKWebView shell.** A Swift app with one `WKWebView`, a `WKURLSchemeHandler` to serve the export (https://developer.apple.com/documentation/webkit/wkurlschemehandler), and a `WKScriptMessageHandler` for JS-to-native calls ("An interface for receiving messages from JavaScript code running in a webpage", https://developer.apple.com/documentation/webkit/wkscriptmessagehandler). Haptics would be a few lines calling UIKit generators directly, with `.soft`, `.rigid`, intensity, and `prepare()`. Pros: no dependency, full control, slightly less bridge overhead. Cons: you rebuild what Capacitor already gives (scheme handler, status bar, splash, plugin bridge, CLI sync). Web rendering, 120Hz limits, and service worker limits are the same, because it is still WKWebView. A reasonable choice if Capacitor gets in the way, but not the place to start.

**React Native / Expo.** `expo-haptics` (SDK 57) exposes impact `Light`, `Medium`, `Heavy`, `Rigid`, `Soft`, plus notification and selection, mapped to UIKit generators. Source: https://docs.expo.dev/versions/latest/sdk/haptics/ . A true native UI would mean rewriting the board, keypad, sheets, and animations in React Native, which breaks single-codebase parity with the web app. Expo DOM components (`'use dom'`) can host web React code inside a web view and call native functions as async props, but are limited to single-page apps with no server rendering, static rendering, or React Server Components and an async JSON bridge. Source: https://docs.expo.dev/guides/dom-components/ (modified 2026-09-29). That is a web view again, with a heavier toolchain than Capacitor for this app. Not worth it unless the app moves to native UI later.

## Gotchas

- `manifest.ts` breaks `output: 'export'` until it has `export const dynamic = 'force-static'`.
- `headers()` is ignored by static export. Make it conditional so the Vercel build keeps it.
- The SW must not register in the native app. Register only when not native.
- The install card and `display-mode: standalone` logic (`game.tsx:225`, `globals.css:144`) assume a browser. Whether `display-mode: standalone` matches inside WKWebView is UNVERIFIED. Use a `native` class or `Capacitor.isNativePlatform()` instead.
- `@vercel/analytics` would try to load `/_vercel/insights/script.js` from the bundle. Skip it on native, and answer App Privacy questions to match.
- `Haptics.selectionChanged()` does nothing unless `selectionStart()` ran first.
- On the web without `navigator.vibrate`, the haptics plugin's `impact`, `notification`, `vibrate`, and `selectionChanged` reject (`selectionStart` and `selectionEnd` resolve). Call them only in the native build, or attach `.catch()`.
- Swipe-back: WKWebView's built-in back gesture does not suit this app; see the device results below for the gesture that works.
- Saved progress does not carry over. The app runs at `capacitor://localhost`, a different origin from sudoku.seanoliver.dev, so games, history, learned lessons, and preferences saved in the website's `localStorage` start fresh in the app unless an export and import, or a sync, is built.
- Capacitor 8's iOS template sets `window?.rootViewController = CAPBridgeViewController()` in `SceneDelegate.swift`, so a custom controller named only in `Main.storyboard` never loads. Change that line too.
- iOS can clear web view storage when the phone runs low on space (Capacitor's storage guide: https://capacitorjs.com/docs/guides/storage). `ProgressStore` (#74) keeps a native copy. Its script must be added in `webView(with:configuration:)`: `prepareWebView` assigns its own `userContentController` after calling `webViewConfiguration(for:)`, and a script added through `webView.configuration` in `capacitorDidLoad` also never ran. Verified in the simulator: with the web storage folder deleted, a saved dark theme came back on launch; with both copies deleted, it did not.
- Expect about 60fps for JS-driven animation inside the app. Do not reach for private API.
- A privacy policy link is required in the app and in App Store Connect (5.1.1(i)).
- Sudoku is a crowded category. Lead the submission notes and screenshots with what is different: graded techniques, hints that explain, lessons.

## Verification

- Read `package.json`, `next.config.ts`, `src/app/*`, `scripts/build-sw.mjs`, the README, AGENTS.md, and the back-button investigation in the main checkout.
- Trial static export in a scratch copy (not the repo), with `node_modules` linked:
  - `output: 'export'` alone: build failed with `export const dynamic = "force-static"/export const revalidate not configured on route "/manifest.webmanifest" with "output: export"`.
  - Adding `force-static` to the scratch `manifest.ts`: build passed. All routes static (`/`, `/_not-found`, `/manifest.webmanifest`, `/opengraph-image.png`, `/twitter-image.png`). `out/` is 1.9 MB with `index.html`, `_next/static/...`, icons, and the worker chunk.
  - With the original `headers()` kept: build passed with the warning "Specified "headers" will not automatically work with "output: export"".
  - The exported layout chunk still references `_vercel/insights/script.js`.
- Read the Capacitor haptics Swift and web source and the `CAPBridgeViewController.swift` source directly on GitHub.
- Checked npm dist-tags for `@capacitor/core` and `@capacitor/haptics` on 2026-10-09.
- Not verified on a device by the research itself (the worker, safe areas, haptics, and swipe-back were later checked on a phone; see Device spike results): haptic latency, swipe-back with `pushState`, Web Worker under `capacitor://`, safe areas, callouts, 120Hz for CSS transitions, `display-mode` in WKWebView (moot: the native build uses its own flag), WKWebView storage eviction.

## Device spike results (October 9)

Scope steps 1 to 3 ran on Sean's iPhone 16 Pro Max from a local, unpushed branch, Capacitor 8.5.2 (the newest release at least two weeks old; 8.5.3 was the latest) and `@capacitor/haptics` 8.0.2, signed with his existing paid developer team.

- **Runs:** the bundled static export loads, puzzles generate (the Web Worker works under `capacitor://`), and safe areas and the status bar are right. Sean: "the layout is perfect".
- **Haptics:** the stock plugin works and feels right: selection on a move, light impact on an entry, medium on a finished unit, success on a solve, error on a refused number. A local plugin with `.soft`, `.rigid`, and intensity was dropped; stock was enough.
- **Swipe-back:** `allowsBackForwardNavigationGestures` is the wrong tool for this app. It slides a snapshot taken when the page was left, so stale UI showed during the swipe, and Learn, History, and lessons opened from Home add no history entries. A `UIScreenEdgePanGestureRecognizer` that streams the finger position to the web app works on every screen: the current screen follows the finger over its real destination (Home or Learn rendered live, or a copy of the game screen taken when a lesson or replay covered it), then finishes by pressing that screen's back control or springs back. A swipe that only switched screens after the gesture ended felt worse than no gesture.
- **Gotcha:** Capacitor 8's `SceneDelegate` sets `rootViewController = CAPBridgeViewController()` in code, so a custom controller named in `Main.storyboard` never loads. Change the `SceneDelegate` line.
- **Web parity:** the web bundle is essentially unchanged (185.3 kB first load against 185.2 kB on `main`, from `pnpm size:first-load`) because the iOS code is behind a build-time flag.

## Recommendation

Use Capacitor with bundled assets from a static export. Do not use `server.url`. It is the smallest change that keeps one codebase. The web build on Vercel stays the same, and the iOS build is a second build target of the same app. Haptics are the main reason to do this, and they need a native bridge, since iPhone browsers give the web no haptics at all. Use `@capacitor/haptics`; on the device it felt right, and a local plugin with more styles was not needed.

The device spike answered the open questions about haptics, the worker, safe areas, and swipe-back: haptics through the bridge feel right, the puzzle Web Worker runs under `capacitor://`, the layout fits, and swipe-back works with an interactive edge-pan gesture of our own (the built-in back gesture does not).

Still open:

- Dark-mode launch: the launch screen and the web view's background before the page paints were not checked in dark mode.
- Long-press callouts and text selection inside the app.
- 120Hz for CSS transitions in WKWebView.
- Whether iOS can evict the app's WKWebView storage.
- Saved progress from the website: accept a fresh start in the app, or build export and import.

Treat App Review as the main risk. Guideline 4.2's text gives no checklist. The best case is the app's real depth: graded puzzles, explained hints, and lessons, plus full offline play and native haptics. Widgets or Game Center can come later if review pushes back.

## Scope proposal

For Sean to approve, in order:

1. **Done, except the dark launch check: local device spike.** In a branch: add Capacitor and the iOS platform, make the static export work (`force-static` on `manifest.ts`, conditional `output: 'export'` and `headers()`), skip SW and analytics on native, wire `buzz()` to `@capacitor/haptics` on native. Run on Sean's iPhone from Xcode. Check the puzzle worker, safe areas, status bar, and dark launch.
2. **Done: haptics feel test.** The stock plugin was tested on the board and felt right; the local plugin with more styles was not needed.
3. **Done: swipe-back.** A `UIScreenEdgePanGestureRecognizer` streams the finger position to the web app, which slides the screen over its real destination and finishes by pressing the screen's back control (see Device spike results).
4. **Membership.** The spike was signed with an existing paid developer team; check its renewal date before TestFlight.
5. **Parity PR.** Land the build split (`pnpm build` unchanged, new `pnpm build:ios`), the native guards, a Haptics on/off setting, and a privacy policy page. Follow the three-directions rule for any visible setting. Check the dark launch. Decide whether the app starts fresh or imports progress from the website; starting fresh is the smaller first release.
6. **TestFlight.** Archive in Xcode, upload, test internally first, then one external group (first build gets reviewed).
7. **App Store submission.** Write review notes and screenshots that lead with techniques, hints, lessons, offline play, and haptics. Hold widgets and Game Center as follow-ups if 4.2 comes up.

## References

Apple
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- App Review, Avoiding common issues: https://developer.apple.com/distribute/app-review/
- HIG, Playing haptics: https://developer.apple.com/design/human-interface-guidelines/playing-haptics
- UIFeedbackGenerator: https://developer.apple.com/documentation/uikit/uifeedbackgenerator
- UIImpactFeedbackGenerator.FeedbackStyle: https://developer.apple.com/documentation/uikit/uiimpactfeedbackgenerator/feedbackstyle
- impactOccurred(intensity:): https://developer.apple.com/documentation/uikit/uiimpactfeedbackgenerator/impactoccurred(intensity:)
- UISelectionFeedbackGenerator: https://developer.apple.com/documentation/uikit/uiselectionfeedbackgenerator
- UINotificationFeedbackGenerator.FeedbackType: https://developer.apple.com/documentation/uikit/uinotificationfeedbackgenerator/feedbacktype
- WKWebView.allowsBackForwardNavigationGestures: https://developer.apple.com/documentation/webkit/wkwebview/allowsbackforwardnavigationgestures
- WKURLSchemeHandler: https://developer.apple.com/documentation/webkit/wkurlschemehandler
- WKScriptMessageHandler: https://developer.apple.com/documentation/webkit/wkscriptmessagehandler
- CADisableMinimumFrameDurationOnPhone: https://developer.apple.com/documentation/bundleresources/information-property-list/cadisableminimumframedurationonphone
- Safari CSS reference (archived): https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariCSSRef/Articles/StandardCSSProperties.html
- Apple Developer Program: https://developer.apple.com/programs/
- Compare memberships: https://developer.apple.com/support/compare-memberships/
- TestFlight: https://developer.apple.com/testflight/ and https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview
- Upcoming requirements: https://developer.apple.com/news/upcoming-requirements/
- WidgetKit: https://developer.apple.com/documentation/widgetkit ; GameKit: https://developer.apple.com/documentation/gamekit

WebKit
- Vibration API position: https://github.com/WebKit/standards-positions/issues/267
- Safari 18 features (switch haptics): https://webkit.org/blog/15865/webkit-features-in-safari-18-0/
- App-Bound Domains: https://webkit.org/blog/10882/app-bound-domains/
- Storage cap: https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
- 120Hz in WKWebView: https://bugs.webkit.org/show_bug.cgi?id=294338

Capacitor (docs v8; core 8.5.3; haptics 8.0.2)
- Haptics: https://capacitorjs.com/docs/apis/haptics ; source https://github.com/ionic-team/capacitor-haptics
- Config: https://capacitorjs.com/docs/config
- iOS: https://capacitorjs.com/docs/ios ; custom view controller https://capacitorjs.com/docs/ios/viewcontroller ; custom code https://capacitorjs.com/docs/ios/custom-code
- Status bar: https://capacitorjs.com/docs/apis/status-bar ; Splash screen: https://capacitorjs.com/docs/apis/splash-screen ; System bars: https://capacitorjs.com/docs/apis/system-bars
- Getting started: https://capacitorjs.com/docs/getting-started ; Web core APIs: https://capacitorjs.com/docs/core-apis/web
- Core source: https://github.com/ionic-team/capacitor/blob/main/ios/Capacitor/Capacitor/CAPBridgeViewController.swift
- Service worker issues: https://github.com/ionic-team/capacitor/issues/7858 , https://github.com/ionic-team/capacitor/issues/7069 , https://github.com/ionic-team/capacitor/issues/1270

Next.js 16.3.5 (installed docs)
- `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md`

Expo
- Haptics (SDK 57): https://docs.expo.dev/versions/latest/sdk/haptics/
- DOM components: https://docs.expo.dev/guides/dom-components/
