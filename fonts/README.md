# Thmanyah font installation

The four supplied `._thmanyahserifdisplay-*.otf` uploads are 221-byte AppleDouble metadata files, not font data. They cannot be loaded by a browser. Do not rename them or claim a fallback is Thmanyah.

Place the actual licensed OpenType files here with these exact names (no `._` prefix):

- thmanyahserifdisplay-Light.otf
- thmanyahserifdisplay-Regular.otf
- thmanyahserifdisplay-Medium.otf
- thmanyahserifdisplay-Bold.otf

Run `npm run build`. Font signatures and table bounds are validated before generating fonts.css. Valid faces apply to Arabic AND English, as requested. Source font files are served locally; no font CDN is needed for Thmanyah. Until originals are supplied, the existing IBM Plex Sans Arabic and Inter remain explicit fallbacks.
