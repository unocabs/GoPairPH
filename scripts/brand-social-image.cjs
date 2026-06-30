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

function textLines(lines, x, startY, lineHeight, options = {}) {
  const {
    anchor = 'start',
    defaultFill = '#f8fafc',
    fills = [],
  } = options;

  return lines
    .map((line, index) => (
      `<tspan x="${x}" y="${startY + index * lineHeight}" text-anchor="${anchor}" fill="${fills[index] || defaultFill}">${escapeXml(line)}</tspan>`
    ))
    .join('');
}

function getCardContent(displayLink) {
  const pathValue = displayLink.toLowerCase();

  if (pathValue.includes('price-guide')) {
    return {
      eyebrow: 'Price Guide',
      title: 'Start with a fair asking price',
      body: 'Use condition, mileage, age, and demand as your baseline.',
    };
  }

  if (pathValue.includes('browse')) {
    return {
      eyebrow: 'Browse',
      title: 'Find shoes by what matters',
      body: 'Check model, size, condition, or location in one cleaner flow.',
    };
  }

  if (pathValue.includes('looking-for')) {
    return {
      eyebrow: 'Looking For',
      title: 'Post the shoe you need',
      body: 'Let sellers send matching links instead of random replies.',
    };
  }

  return {
    eyebrow: 'New Listing',
    title: 'Build one clean listing once',
    body: 'Then reuse the same link wherever you already post and share.',
  };
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
  const card = getCardContent(spec.displayLink);
  const cardTitleLines = wrapText(card.title, 22, 2);
  const cardBodyLines = wrapText(card.body, 30, 2);
  const headlineStart = 108;
  const supportingStart = headlineStart + headlineLines.length * 76 + 12;
  const safeLink = escapeXml(spec.displayLink);
  const headlineFills = headlineLines.length > 1
    ? ['#f8fafc', 'url(#headlineAccent)']
    : ['#f8fafc'];

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
        <linearGradient id="headlineAccent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#2dd4bf"/>
          <stop offset="1" stop-color="#7dd3fc"/>
        </linearGradient>
        <linearGradient id="cardStroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#67e8f9" stop-opacity="0.9"/>
          <stop offset="1" stop-color="#2dd4bf" stop-opacity="0.7"/>
        </linearGradient>
        <linearGradient id="cardFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0a2435" stop-opacity="0.94"/>
          <stop offset="1" stop-color="#0b1f2e" stop-opacity="0.88"/>
        </linearGradient>
        <linearGradient id="readability" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#061826" stop-opacity="0.92"/>
          <stop offset="0.72" stop-color="#061826" stop-opacity="0.42"/>
          <stop offset="1" stop-color="#061826" stop-opacity="0"/>
        </linearGradient>
        <filter id="cardGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="18" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect x="0" y="0" width="${canvasSize}" height="370" fill="url(#readability)"/>
      <text x="540" y="${headlineStart}" font-family="Helvetica Neue, Arial, sans-serif" font-size="58" font-weight="800" letter-spacing="-1.4">${textLines(headlineLines, 540, headlineStart, 76, { anchor: 'middle', fills: headlineFills })}</text>
      <text x="540" y="${supportingStart}" font-family="Helvetica Neue, Arial, sans-serif" font-size="28" font-weight="500">${textLines(supportingLines, 540, supportingStart, 38, { anchor: 'middle', defaultFill: '#d7e0ea' })}</text>
      <path d="M255 542 C290 510, 315 504, 348 504" fill="none" stroke="#8be4db" stroke-width="3" stroke-linecap="round" stroke-dasharray="8 10" opacity="0.5"/>
      <path d="M733 504 C780 504, 812 504, 848 524" fill="none" stroke="#8be4db" stroke-width="3" stroke-linecap="round" opacity="0.58"/>
      <path d="M836 513 L850 524 L836 536" fill="none" stroke="#8be4db" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.58"/>
      <rect x="350" y="430" width="380" height="150" rx="28" fill="#2dd4bf" opacity="0.12" filter="url(#cardGlow)"/>
      <rect x="350" y="430" width="380" height="150" rx="28" fill="url(#cardFill)" stroke="url(#cardStroke)" stroke-width="2.5"/>
      <circle cx="412" cy="505" r="38" fill="#0f766e" opacity="0.9"/>
      <circle cx="412" cy="505" r="32" fill="none" stroke="#ccfbf1" stroke-width="3"/>
      <path d="M399 494 C404 489, 411 489, 416 494 L421 499 C426 504, 426 511, 421 516 C416 521, 409 521, 404 516" fill="none" stroke="#ecfeff" stroke-width="4" stroke-linecap="round"/>
      <path d="M405 511 L419 497" fill="none" stroke="#ecfeff" stroke-width="4" stroke-linecap="round"/>
      <text x="468" y="472" font-family="Helvetica Neue, Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="1.8" fill="#8be4db">${escapeXml(card.eyebrow.toUpperCase())}</text>
      <text x="468" y="506" font-family="Helvetica Neue, Arial, sans-serif" font-size="24" font-weight="700" fill="#f8fafc">${textLines(cardTitleLines, 468, 506, 28, { defaultFill: '#f8fafc' })}</text>
      <text x="468" y="555" font-family="Helvetica Neue, Arial, sans-serif" font-size="18" font-weight="500" fill="#cbd5e1">${textLines(cardBodyLines, 468, 555, 24, { defaultFill: '#cbd5e1' })}</text>
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
