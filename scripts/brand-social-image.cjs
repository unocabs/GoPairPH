#!/usr/bin/env node

const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');

function loadSharp() {
  try {
    return require('sharp');
  } catch {
    const bundledModules = path.join(
      os.homedir(),
      '.cache',
      'codex-runtimes',
      'codex-primary-runtime',
      'dependencies',
      'node',
      'node_modules',
      'package.json',
    );
    return createRequire(bundledModules)('sharp');
  }
}

const sharp = loadSharp();

const fs = require('node:fs');
const [inputPath, outputPath, specPath] = process.argv.slice(2);

if (!inputPath || !outputPath || !specPath) {
  console.error('Usage: node scripts/brand-social-image.cjs <input> <output> <spec.json>');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const logoPath = path.join(root, 'public', 'brand', 'gopairph-logo-mark-1024.png');

function escapeXml(value) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character]);
}

function wrapText(value, maxCharacters, maxLines) {
  const words = value.trim().split(/\s+/);
  const lines = [];
  let current = '';

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharacters || !current) {
      current = candidate;
      continue;
    }

    if (lines.length === maxLines - 1) {
      current = `${current} ${words.slice(index).join(' ')}`;
      break;
    }

    lines.push(current);
    current = word;
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function textLines(lines, x, startY, lineHeight) {
  return lines
    .map((line, index) => `<tspan x="${x}" y="${startY + index * lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');
}

async function main() {
  const canvasSize = 1080;
  const footerTop = 930;
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

  if (!spec.headline || !spec.supportingLine || !spec.displayLink) {
    throw new Error('Spec must include headline, supportingLine, and displayLink.');
  }

  const headlineLines = wrapText(spec.headline, 28, 2);
  const supportingLines = wrapText(spec.supportingLine, 52, 2);
  const supportingStart = 108 + headlineLines.length * 68;
  const safeLink = escapeXml(spec.displayLink);

  const base = await sharp(inputPath)
    .resize(canvasSize, canvasSize, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  const logo = await sharp(logoPath)
    .resize(76, 76, { fit: 'contain' })
    .png()
    .toBuffer();

  const footer = Buffer.from(`
    <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="footer" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#061826" stop-opacity="0.98"/>
          <stop offset="1" stop-color="#092333" stop-opacity="0.98"/>
        </linearGradient>
        <linearGradient id="readability" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#061826" stop-opacity="0.92"/>
          <stop offset="0.72" stop-color="#061826" stop-opacity="0.42"/>
          <stop offset="1" stop-color="#061826" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${canvasSize}" height="370" fill="url(#readability)"/>
      <text x="64" y="108" font-family="Helvetica Neue, Arial, sans-serif" font-size="58" font-weight="800" letter-spacing="-1.4" fill="#f8fafc">${textLines(headlineLines, 64, 108, 68)}</text>
      <text x="66" y="${supportingStart}" font-family="Helvetica Neue, Arial, sans-serif" font-size="28" font-weight="500" fill="#cbd5e1">${textLines(supportingLines, 66, supportingStart, 38)}</text>
      <rect x="0" y="${footerTop}" width="${canvasSize}" height="150" fill="url(#footer)"/>
      <rect x="0" y="${footerTop}" width="${canvasSize}" height="2" fill="#2dd4bf" opacity="0.65"/>
      <text x="142" y="1018" font-family="Helvetica Neue, Arial, sans-serif" font-size="34" font-weight="700" fill="#f8fafc">Go Pair</text>
      <text x="262" y="1018" font-family="Helvetica Neue, Arial, sans-serif" font-size="34" font-weight="700" fill="#2dd4bf">PH</text>
      <text x="650" y="1015" text-anchor="middle" font-family="Helvetica Neue, Arial, sans-serif" font-size="25" font-weight="600" fill="#cbd5e1">${safeLink}</text>
    </svg>
  `);

  await sharp(base)
    .composite([
      { input: footer, top: 0, left: 0 },
      { input: logo, top: 967, left: 48 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
