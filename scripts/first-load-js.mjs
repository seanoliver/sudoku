import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 3410;
const inUse = await fetch(`http://localhost:${PORT}`).then(() => true, () => false);
if (inUse) throw new Error(`Port ${PORT} is already in use; stop that server first.`);
const server = spawn('pnpm', ['start', '--port', String(PORT)], { stdio: 'ignore' });
try {
  for (let i = 0; i < 60; i++) { try { await fetch(`http://localhost:${PORT}`); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const response = await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  // Classify against the HTML the server sent: webpack removes script tags from the live page once they load.
  const html = await response.text();
  const { first, deferred } = await page.evaluate(html => {
    const sent = new DOMParser().parseFromString(html, 'text/html');
    const inHtml = new Set([...sent.querySelectorAll('script[src], link[rel="preload"][as="script"], link[rel="modulepreload"]')]
      .map(element => new URL(element.getAttribute('src') ?? element.getAttribute('href'), location.href).href));
    const scripts = performance.getEntriesByType('resource').filter(entry => new URL(entry.name).pathname.endsWith('.js'));
    const sum = list => list.reduce((total, entry) => total + entry.encodedBodySize, 0);
    return { first: sum(scripts.filter(entry => inHtml.has(entry.name))), deferred: sum(scripts.filter(entry => !inHtml.has(entry.name))) };
  }, html);
  console.log(`First-load JS: ${(first / 1024).toFixed(1)} kB compressed`);
  console.log(`Deferred JS: ${(deferred / 1024).toFixed(1)} kB compressed`);
  await browser.close();
} finally {
  server.kill();
}
