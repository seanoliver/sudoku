# Finish card accomplishment and Share design

R7 (accomplishments and sharing), slice 1. On October 13, 2026, Sean chose direction A, image share, over B, plain text share, and C, share as the headline. Reference: `docs/designs/finish-share-approved.png` (with `-no-chip` and `-first-solve` for the other states). The renders show a portrait share image, and the regular solves show a date; slice 1 ships a square image, with a date only for a daily. Research: `docs/investigations/2026-10-13-accomplishments-sharing.md`.

## Decisions

- **One chip** joins the Best time chip on the finish card, for the best accomplishment the solve earned, in this order: streak milestone, first solve at a level, clean solve. Marks: a flame with the day count for a streak, a flag for a first solve, a gem for a clean solve, in the level's color. A solve that earns none shows no chip.
- **Clean solve:** no hint past level 1 of a technique hint, no applied hint, and no fixes. A solve with Block incorrect answers on, or after a Restart, is never clean.
- **Share** is an icon button after Replay and Play again. It sends the solve map image: every cell shaded by when the player filled it, starting numbers as plain dots, no digits, with the date for a daily, the time, the level, and `sudoclue.app`. It goes through the share sheet on both the website and the iOS app.
- **Image shape by destination** (Sean, October 13): square for messages and feeds, portrait (1080×1920) for Instagram Stories. The website hands one file to the share sheet before the player picks an app, so it cannot switch shapes. Sean chose square on both the website and the app for slice 1. Later, the iOS app's native share supplies portrait to Instagram, once a device test confirms the app can tell Instagram's Stories target apart.
- **No text share.** Sean found the Wordle-style emoji grid hard to read. A one-line caption can be added later if a tappable link is wanted.
- **Not in slice 1:** a hint limit per puzzle, direct Instagram Stories, and an accomplishments screen.

## Settled while building slice 1

- **iOS share path:** the app writes the PNG to its cache folder with `@capacitor/filesystem` and opens the native sheet with `@capacitor/share`, which documents file sharing on iOS. Whether `navigator.share({ files })` works in the web view was not needed. Still to confirm on a device: the sheet opens and offers Messages and Instagram.
- **Drawing before the tap:** the finish card draws the image as soon as it shows, and again when the theme changes. Share is disabled until the file exists, so Safari's share call runs inside the tap.
- **Fallback:** a browser that cannot share files downloads the image.
- **Mistake hints:** level 1 of a mistake hint keeps a solve clean, like level 1 of a technique hint. A wrong number on the board marks the solve as fixed in any case.
- **Hide timer:** the image leaves out the time, and the level moves to the center.
- **Streak mark:** the chip and image use the flame; Home and the daily keep sparkles for now. Unifying them is still open.
- **Theme:** the image follows the theme the player sees, light or dark.
- **Older games:** a game already in progress when this shipped cannot be clean, since what happened before is unknown. A first solve also checks the finished-game ids and Expert bank completions that predate History, so long-time players never see a false one.
