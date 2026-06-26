// Run once: node scripts/generate-assets.js
const path = require("path");
const sharp = require(path.join(__dirname, "../node_modules/sharp"));

const PUBLIC = path.join(__dirname, "../public");

/* ── OG Image 1200×630 ──────────────────────────────────────────────── */
const OG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="#3a2d6e"/>
      <stop offset="55%"  stop-color="#241a52"/>
      <stop offset="100%" stop-color="#160f33"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#f3d27a"/>
      <stop offset="100%" stop-color="#dca83f"/>
    </linearGradient>
    <mask id="crescent">
      <rect width="1200" height="630" fill="white"/>
      <circle cx="665" cy="172" r="62" fill="black"/>
    </mask>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#sky)"/>

  <!-- Stars -->
  <circle cx="110" cy="72"  r="2"   fill="white" opacity="0.7"/>
  <circle cx="970" cy="55"  r="1.5" fill="white" opacity="0.6"/>
  <circle cx="730" cy="115" r="1"   fill="white" opacity="0.5"/>
  <circle cx="190" cy="490" r="1.5" fill="white" opacity="0.45"/>
  <circle cx="1060" cy="390" r="2"  fill="white" opacity="0.55"/>
  <circle cx="430" cy="48"  r="1"   fill="white" opacity="0.4"/>
  <circle cx="870" cy="540" r="1.5" fill="white" opacity="0.35"/>
  <circle cx="55"  cy="310" r="1"   fill="white" opacity="0.5"/>
  <circle cx="1150" cy="185" r="1.5" fill="white" opacity="0.4"/>
  <circle cx="320" cy="560" r="1"   fill="white" opacity="0.35"/>
  <circle cx="1090" cy="560" r="1"  fill="white" opacity="0.5"/>
  <circle cx="580" cy="580" r="1.5" fill="white" opacity="0.3"/>

  <!-- Crescent moon (geometric, no emoji) -->
  <circle cx="600" cy="185" r="72" fill="url(#gold)" mask="url(#crescent)"/>

  <!-- Gold ring around moon area -->
  <circle cx="600" cy="185" r="95" fill="none" stroke="#dca83f" stroke-width="1" opacity="0.18"/>

  <!-- Sparkle ✦ left -->
  <text x="460" y="208" font-family="Arial,Helvetica,sans-serif" font-size="22"
        fill="#f3d27a" opacity="0.55" text-anchor="middle">&#x2726;</text>
  <!-- Sparkle ✦ right -->
  <text x="740" y="208" font-family="Arial,Helvetica,sans-serif" font-size="22"
        fill="#f3d27a" opacity="0.55" text-anchor="middle">&#x2726;</text>

  <!-- App name (Hebrew, RTL handled by text-anchor=middle) -->
  <text x="600" y="340"
        font-family="Arial,Helvetica,sans-serif"
        font-size="80" font-weight="bold"
        text-anchor="middle"
        fill="#fdf3df">&#x05D0;&#x05D1;&#x05D0; &#x05E1;&#x05D9;&#x05E4;&#x05D5;&#x05E8;</text>

  <!-- Tagline -->
  <text x="600" y="408"
        font-family="Arial,Helvetica,sans-serif"
        font-size="30" font-weight="normal"
        text-anchor="middle"
        fill="rgba(253,243,223,0.6)">&#x05E1;&#x05D9;&#x05E4;&#x05D5;&#x05E8;&#x05D9; &#x05D9;&#x05DC;&#x05D3;&#x05D9;&#x05DD; &#x05DE;&#x05D7;&#x05D5;&#x05E8;&#x05D6;&#x05D9;&#x05DD; &#x05D5;&#x05DE;&#x05D0;&#x05D5;&#x05D9;&#x05D9;&#x05E8;&#x05D9;&#x05DD; &#x05D1;&#x05E2;&#x05D1;&#x05E8;&#x05D9;&#x05EA;</text>

  <!-- Gold divider -->
  <rect x="510" y="438" width="180" height="2.5" rx="1.25" fill="url(#gold)" opacity="0.45"/>

  <!-- Free tier note -->
  <text x="600" y="490"
        font-family="Arial,Helvetica,sans-serif"
        font-size="22"
        text-anchor="middle"
        fill="rgba(253,243,223,0.35)">5 &#x05E1;&#x05D9;&#x05E4;&#x05D5;&#x05E8;&#x05D9;&#x05DD; &#x05D7;&#x05D9;&#x05E0;&#x05DD; &#x05DC;&#x05D0;&#x05D7;&#x05E8; &#x05D4;&#x05E8;&#x05E9;&#x05DE;&#x05D4;</text>
</svg>`;

/* ── Apple Touch Icon 180×180 ────────────────────────────────────────── */
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
  <defs>
    <linearGradient id="ibg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="#3a2d6e"/>
      <stop offset="100%" stop-color="#160f33"/>
    </linearGradient>
    <linearGradient id="igold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#f3d27a"/>
      <stop offset="100%" stop-color="#dca83f"/>
    </linearGradient>
    <mask id="ic">
      <rect width="180" height="180" fill="white"/>
      <circle cx="105" cy="65" r="50" fill="black"/>
    </mask>
    <clipPath id="round">
      <rect width="180" height="180" rx="40"/>
    </clipPath>
  </defs>

  <!-- Background (clipped to rounded rect) -->
  <rect width="180" height="180" rx="40" fill="url(#ibg)"/>

  <!-- Stars -->
  <g clip-path="url(#round)">
    <circle cx="28"  cy="24"  r="1.5" fill="white" opacity="0.6"/>
    <circle cx="155" cy="32"  r="1"   fill="white" opacity="0.5"/>
    <circle cx="162" cy="148" r="1.5" fill="white" opacity="0.4"/>
    <circle cx="18"  cy="158" r="1"   fill="white" opacity="0.5"/>
    <circle cx="148" cy="92"  r="1"   fill="white" opacity="0.35"/>
  </g>

  <!-- Crescent moon -->
  <circle cx="82" cy="72" r="50" fill="url(#igold)" mask="url(#ic)"/>

  <!-- App name (small) -->
  <text x="90" y="148"
        font-family="Arial,Helvetica,sans-serif"
        font-size="17" font-weight="bold"
        text-anchor="middle"
        fill="rgba(253,243,223,0.75)">&#x05D0;&#x05D1;&#x05D0; &#x05E1;&#x05D9;&#x05E4;&#x05D5;&#x05E8;</text>
</svg>`;

async function main() {
  console.log("Generating public assets…");

  await sharp(Buffer.from(OG_SVG))
    .png({ compressionLevel: 9 })
    .toFile(`${PUBLIC}/og-image.png`);
  console.log("✓  public/og-image.png  (1200×630)");

  await sharp(Buffer.from(ICON_SVG))
    .resize(180, 180)
    .png({ compressionLevel: 9 })
    .toFile(`${PUBLIC}/apple-touch-icon.png`);
  console.log("✓  public/apple-touch-icon.png  (180×180)");
}

main().catch((e) => { console.error(e); process.exit(1); });
