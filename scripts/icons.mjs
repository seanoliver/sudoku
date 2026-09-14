import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs><linearGradient id="blue" x2=".6" y2="1"><stop stop-color="#65acff"/><stop offset=".65" stop-color="#2878e8"/><stop offset="1" stop-color="#1d63d1"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#blue)"/><g fill="white"><rect x="136" y="136" width="106" height="106" rx="17"/><rect x="270" y="136" width="106" height="106" rx="17" opacity=".42"/><rect x="136" y="270" width="106" height="106" rx="17" opacity=".7"/><rect x="270" y="270" width="106" height="106" rx="17"/></g></svg>`;
for (const [name,size] of [['icon-192',192],['icon-512',512],['apple-touch-icon',180],['icon-maskable',512]]) {
  const source = name === 'icon-maskable' ? svg.replace('rx="112"', 'rx="0"') : svg;
  await sharp(Buffer.from(source)).resize(size,size).png().toFile(`public/${name}.png`);
}
await writeFile('public/icon.svg', svg);
