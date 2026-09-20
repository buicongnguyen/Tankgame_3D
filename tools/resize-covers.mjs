import sharp from 'sharp';
import { mkdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: npm run covers:resize -- [input-folder] [output-folder]\nInput names: cover-landscape.png, cover-portrait.png, cover-square.png\nDefaults: marketing/crazygames → marketing/crazygames/upload\nImages are oriented, resized with Lanczos3, and center-cropped to exact dimensions. Originals are preserved.');
  process.exit(0);
}
if (args.length > 2) throw new Error('Expected at most input-folder and output-folder. Use --help.');
const input = path.resolve(args[0] || path.join(root, 'marketing/crazygames'));
const output = path.resolve(args[1] || path.join(input, 'upload'));
if (input.toLowerCase() === output.toLowerCase()) throw new Error('Choose a different output folder to preserve originals.');
const formats = [['landscape', 1920, 1080], ['portrait', 800, 1200], ['square', 800, 800]];
// Validate every source before creating any output.
for (const [name] of formats) await sharp(path.join(input, `cover-${name}.png`)).metadata();
await mkdir(output, { recursive: true });
for (const [name, width, height] of formats) {
  const source = path.join(input, `cover-${name}.png`);
  const destination = path.join(output, `cover-${name}.png`);
  const temporary = `${destination}.${process.pid}.tmp`;
  try {
    await sharp(source).rotate().resize(width, height, { fit: 'cover', position: 'centre', kernel: 'lanczos3' }).flatten({ background: '#101c24' }).png().toFile(temporary);
    const info = await sharp(temporary).metadata();
    if (info.width !== width || info.height !== height) throw new Error(`Incorrect dimensions for ${name}`);
    await rename(temporary, destination);
    console.log(`${name}: ${width} x ${height} → ${destination}`);
  } finally {
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}
