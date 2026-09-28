# Focus lost after leaving Learn or History

## Symptom

About 1 run in 50, Escape from the Learn page or History returned to Home with focus on the page body instead of the button that opened the page. Keyboard users lost their place. The browser tests for both pages failed intermittently on this.

## Root cause

Screen changes in `game.tsx` put a CSS selector in `focusAfterRender`, and an effect focuses it after the next render. That effect cleared the selector even when the element wasn't in the page yet. If an unrelated render committed first, the selector was used up while the old page was still showing, and the render that showed Home had nothing to focus. A likely source of that render is the service worker becoming ready (`setOfflineReady`), which lands in the first second after load, when the tests press Escape.

## Reproduction

A probe opened History from Home, pressed Escape, and read `document.activeElement`. Over 50 runs with 8 workers across Chromium and WebKit, one ended on `BODY` with the chip present.

## Fix

The effect keeps the selector pending until the element exists, then focuses it and clears it. A later screen change replaces a pending selector.

## Verification

- The same probe: 200 of 200 runs ended on the chip.
- The full browser suite passed twice in a row (114 tests).

## Recurrence guardrail

- New focus targets must name an element the next screen always renders. A selector that never appears stays pending until the next screen change replaces it.
- A flaky focus test is worth reproducing under load (`--repeat-each` with several workers) before retrying it.
