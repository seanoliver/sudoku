# iOS app: haptics setting and privacy

Roadmap item: R9, native iOS app, scope step 5 (the parity PR). On October 9 Sean chose direction C, grouped list, for the Haptics setting and the privacy policy, from three options rendered in the app (switch row, feel section, grouped list), with B's in-app sheet for Privacy. Reference: ../designs/settings-about-approved.png, with dark and the privacy sheet beside it. All options: ../designs/settings-about-options.png. The spike that led here: ../investigations/2026-10-09-ios-wrapper.md.

## Settings

- Settings ends in rounded groups, as iOS Settings does.
- In the iPhone app, a Haptics group holds one switch, on by default. The website has no haptics on iPhone, so the group is not shown there.
- An About group holds How to play and Privacy rows with chevrons. Each opens in the sheet, which scrolls to its top and puts focus on the close button.
- The line "Your puzzles and preferences stay on this device." is removed; the Privacy page says it. The version line in the render is left out until the app has a release version.

## Privacy

- The same text appears in the in-app sheet and on a public page at `/privacy`, which App Store Connect needs.
- It states that progress stays on the device, that the app collects nothing, that the website counts page views with Vercel Web Analytics without cookies, and where to ask questions (the repo's GitHub issues).

## Haptics

- Stock `@capacitor/haptics`, chosen on device: a selection tick when the selection moves, a light tap on an entry, a medium tap on a finished row, column, or box, success on a solved puzzle, and error on a refused number.
- The website keeps its short vibration on number entry where the browser supports it.

## Swipe back

- A left-edge swipe in the app follows the finger: the screen slides over the screen it returns to and finishes by pressing that screen's back control, or springs back. Home and Learn are drawn live underneath; the game is a copy taken when a lesson or replay covered it.
