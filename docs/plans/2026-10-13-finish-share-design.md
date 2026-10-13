# Finish card accomplishment and Share design

R7 (accomplishments and sharing), slice 1. On October 13, 2026, Sean chose direction A, image share, over B, plain text share, and C, share as the headline. Reference: `docs/designs/finish-share-approved.png` (with `-no-chip` and `-first-solve` for the other states). The renders show a portrait share image, and the regular solves show a date; slice 1 ships a square image, with a date only for a daily. Research: `docs/investigations/2026-10-13-accomplishments-sharing.md`.

## Decisions

- **One chip** joins the Best time chip on the finish card, for the best accomplishment the solve earned, in this order: streak milestone, first solve at a level, clean solve. Marks: a flame with the day count for a streak, a flag for a first solve, a gem for a clean solve, in the level's color. A solve that earns none shows no chip.
- **Clean solve:** no hint past level 1 of a technique hint, no applied hint, and no fixes. A solve with Block incorrect answers on, or after a Restart, is never clean.
- **Share** is an icon button after Replay and Play again. It sends the solve map image: every cell shaded by when the player filled it, starting numbers as plain dots, no digits, with the date for a daily, the time, the level, and `sudoclue.app`. It goes through the share sheet on both the website and the iOS app.
- **Image shape by destination** (Sean, October 13): square for messages and feeds, portrait (1080×1920) for Instagram Stories. The website hands one file to the share sheet before the player picks an app, so it cannot switch shapes. Sean chose square on both the website and the app for slice 1. Later, the iOS app's native share supplies portrait to Instagram, once a device test confirms the app can tell Instagram's Stories target apart.
- **No text share.** Sean found the Wordle-style emoji grid hard to read. A one-line caption can be added later if a tappable link is wanted.
- **Not in slice 1:** a hint limit per puzzle, direct Instagram Stories, and an accomplishments screen.

## Open before building

- Whether `navigator.share({ files })` works in the iOS app's web view, or the app needs `@capacitor/share`. Test on a device first.
- Drawing the image before the tap, so Safari still allows the share.
- The fallback when file sharing is unavailable, for example in desktop Firefox: save or copy the image.
- Whether level 1 of a mistake hint keeps a solve clean (investigation, decision 1).
- With Hide timer on, the image leaves out the time.
- One streak mark: Home and the daily show the streak with sparkles, and this chip uses a flame. Pick one. The flame, flag, gem, and Share icons are new.
