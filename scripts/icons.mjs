import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
const svg = ({ rounded = true, scale = 1 } = {}) => {
  const c = 92, g = 16, o = 102;
  let cells = '';
  for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) {
    const x = o + k * (c + g), y = o + r * (c + g);
    cells += r === 1 && k === 1
      ? `<rect x="${x - 8}" y="${y - 8}" width="${c + 16}" height="${c + 16}" rx="26" fill="#ffc94d" opacity=".8" filter="url(#glow)"/><rect x="${x}" y="${y}" width="${c}" height="${c}" rx="20" fill="#ffc94d"/>`
      : `<rect x="${x}" y="${y}" width="${c}" height="${c}" rx="20" fill="#c7cbff" opacity=".28"/>`;
  }
  const transform = scale === 1 ? '' : ` transform="translate(${256 * (1 - scale)} ${256 * (1 - scale)}) scale(${scale})"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs><linearGradient id="midnight" x2=".6" y2="1"><stop stop-color="#3b3f8f"/><stop offset=".6" stop-color="#232663"/><stop offset="1" stop-color="#15173d"/></linearGradient><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter></defs><rect width="512" height="512"${rounded ? ' rx="112"' : ''} fill="url(#midnight)"/><g${transform}>${cells}</g></svg>`;
};
const png = (source, size) => sharp(Buffer.from(source), { density: 72 * size / 512 }).resize(size, size);
await writeFile('public/icon.svg', svg());
await png(svg(), 192).png().toFile('public/icon-192.png');
await png(svg(), 512).png().toFile('public/icon-512.png');
await png(svg({ rounded: false, scale: .8 }), 512).png().toFile('public/icon-maskable.png');
// iOS rounds the corners itself and rejects transparency, so these are full-bleed and opaque.
await png(svg({ rounded: false }), 180).flatten().png().toFile('public/apple-touch-icon.png');
await png(svg({ rounded: false }), 1024).flatten().removeAlpha().png().toFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
const mark = await png(svg(), 300).png().toBuffer();
const splash = 'ios/App/App/Assets.xcassets/Splash.imageset';
for (const [name, background] of [['splash', { r: 242, g: 242, b: 247 }], ['splash-dark', { r: 11, g: 13, b: 17 }]]) {
  const image = await sharp({ create: { width: 2732, height: 2732, channels: 3, background } }).composite([{ input: mark, left: 1216, top: 1216 }]).png().toBuffer();
  for (const suffix of ['', '-1', '-2']) await writeFile(`${splash}/${name}-2732x2732${suffix}.png`, image);
}
