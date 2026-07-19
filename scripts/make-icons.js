// Generates the DayFeed app icon set (v1.4): an open book + quill, cream ink on
// dark coffee-brown leather — the bookbinding identity at launcher size.
//
//   node scripts/make-icons.js
//
// Outputs (1024×1024): assets/icon.png, assets/android-icon-foreground.png,
// assets/android-icon-background.png, assets/android-icon-monochrome.png.
const sharp = require('sharp');
const path = require('path');

const BG = '#26190F'; // dark leather
const CREAM = '#EDE4D3';
const BRONZE = '#C89B66';

// The mark on a 24-unit grid (same pen as src/components/Icons.tsx).
// `ink`/`accent` let the monochrome variant force everything to one color.
function mark(ink, accent, strokeW = 1.35) {
  // Rib carves the feather out of the blade; on monochrome it disappears into the art.
  const BG_RIB = accent === '#FFFFFF' ? '#FFFFFF' : BG;
  return `
    <g fill="none" stroke-linejoin="round" stroke-linecap="round">
      <!-- open book -->
      <path d="M12 9.5C10.5 8 8.5 7.5 5.5 7.5c-.8 0-1.5.7-1.5 1.5v9c0 .8.7 1.5 1.5 1.5 3 0 5 .5 6.5 2 1.5-1.5 3.5-2 6.5-2 .8 0 1.5-.7 1.5-1.5V9c0-.8-.7-1.5-1.5-1.5-3 0-5 .5-6.5 2Z"
            stroke="${ink}" stroke-width="${strokeW}"/>
      <line x1="12" y1="9.5" x2="12" y2="21.5" stroke="${ink}" stroke-width="${strokeW}"/>
      <!-- page lines -->
      <path d="M6.7 11.2c1.6.1 2.9.5 3.9 1.1M6.7 14c1.6.1 2.9.5 3.9 1.1"
            stroke="${ink}" stroke-width="${strokeW * 0.7}" opacity="0.75"/>
      <path d="M17.3 11.2c-1.6.1-2.9.5-3.9 1.1M17.3 14c-1.6.1-2.9.5-3.9 1.1"
            stroke="${ink}" stroke-width="${strokeW * 0.7}" opacity="0.75"/>
      <!-- quill: blade + shaft, writing onto the right page -->
      <path d="M20.8 1.6c-2.9.6-5.2 2.7-6.2 6.2l1.7.6c2.6-1.3 4.2-4 4.5-6.8Z"
            fill="${accent}" stroke="${accent}" stroke-width="0.5"/>
      <path d="M15.2 8.1 13.4 12" stroke="${accent}" stroke-width="${strokeW}"/>
      <!-- feather rib -->
      <path d="M20.3 2.2c-2.2 1-4 2.9-5 5.6" stroke="${BG_RIB}" stroke-width="0.45" opacity="0.85"/>
      <circle cx="13.2" cy="12.5" r="0.55" fill="${accent}"/>
    </g>`;
}

// Wrap the 24-grid mark into a 1024 canvas: scale s, centered.
function svg({ background, ink, accent, artScale }) {
  const s = (1024 * artScale) / 24;
  const off = (1024 - 24 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    ${background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''}
    <g transform="translate(${off},${off}) scale(${s})">${mark(ink, accent)}</g>
  </svg>`;
}

async function write(name, svgStr) {
  const out = path.join(__dirname, '..', 'assets', name);
  await sharp(Buffer.from(svgStr)).png().toFile(out);
  console.log('wrote', out);
}

(async () => {
  // Main icon: full-bleed leather + art at ~72%.
  await write('icon.png', svg({ background: BG, ink: CREAM, accent: BRONZE, artScale: 0.72 }));
  // Adaptive foreground: transparent, art shrunk to the ~66% safe circle.
  await write(
    'android-icon-foreground.png',
    svg({ background: null, ink: CREAM, accent: BRONZE, artScale: 0.52 }),
  );
  // Adaptive background: solid leather.
  await write('android-icon-background.png', svg({ background: BG, ink: 'none', accent: 'none', artScale: 0 }));
  // Monochrome (themed icons): single-color art on transparent.
  await write(
    'android-icon-monochrome.png',
    svg({ background: null, ink: '#FFFFFF', accent: '#FFFFFF', artScale: 0.52 }),
  );
})();
