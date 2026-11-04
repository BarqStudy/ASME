# Thmanyah Serif Display

The site uses the original Thmanyah Serif Display family for Arabic and English, in Light (300), Regular (400), Medium (500), Bold (700), and Black (900). These are real OpenType fonts, not the unusable AppleDouble `._` metadata companions from the uploads.

The current Next.js platform loads compact WOFF2 files from `platform/public/fonts` through `next/font/local`. The preserved legacy app loads the matching OTF files in this directory; `node scripts/prepare-fonts.mjs` validates the fonts and generates `fonts.css`.

Source revision and SHA-256 checksums are recorded in `platform/public/fonts/SOURCE.json`. Typeface rights remain with Thmanyah; these unmodified website assets are not relicensed under the application license.
