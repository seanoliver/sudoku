# Share image

Links to the site had no preview image, and posts now put the link in a reply, so X showed a bare link.

## Direction

Sean picked from three renders: A's layout (name and line on the left, a real board mid-explanation on the right) with B's line, "A calm Sudoku that teaches you every technique, one move at a time." The URL line was dropped because X already shows the domain under the card.

## Build

- `scripts/share-image/index.html` is the template, built from `public/icon.svg` and `docs/screenshots/hint-walkthrough-wrap.png`. `pnpm build:share-image` renders it to `src/app/opengraph-image.png` and `twitter-image.png` at 1200×630. Next.js adds the tags from those files and their `.alt.txt` files.
- `layout.tsx` sets `metadataBase`, so the image URLs are absolute, plus the Open Graph description and the large X card.
- `e2e/share-image.spec.ts` checks the tags and that the image serves as a 1200×630 PNG.
