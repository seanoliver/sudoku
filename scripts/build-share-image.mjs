// Renders scripts/share-image/index.html to the site's 1200×630 share images.
// Run after the template, the app icon, or docs/screenshots/hint-walkthrough-wrap.png changes: pnpm build:share-image
import { copyFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const template = new URL('./share-image/index.html', import.meta.url);
const openGraph = new URL('../src/app/opengraph-image.png', import.meta.url);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(template.href);
await page.waitForLoadState('networkidle');
await page.screenshot({ path: openGraph.pathname });
await browser.close();
copyFileSync(openGraph, new URL('../src/app/twitter-image.png', import.meta.url));
console.log('wrote src/app/opengraph-image.png and twitter-image.png');
