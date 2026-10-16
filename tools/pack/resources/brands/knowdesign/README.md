# KnowDesign brand resources

Icons for the KnowDesign build, selected by the brand descriptor (`packages/release/src/brand.ts`);
Open Design builds keep using `tools/pack/resources/{mac,win,linux}`.

Source: the KnowDesign "Family Letter" D mark — a rounded-bar D in the KnowMe stroke vocabulary with the
ember node on its stem, on the KnowMe `#0B0F14` tile (1024 px, rx 225). It replaced the borrowed KnowMe "K"
on 2026-10-16. The master SVG lives at `apps/web/public/brands/knowdesign/app-icon.svg`.

Generated from that SVG:

- `mac/icon.png`, `linux/icon.png`, `apps/web/public/brands/knowdesign/app-icon.png` — 1024 px (`rsvg-convert`).
- `mac/icon.icns` — `iconutil` from an iconset of 16–512 px at 1x and 2x.
- `win/icon.ico` — `magick` from 16, 24, 32, 48, 64, 128 and 256 px renders.

The desktop dock/window icon resolves through `brandAppIconPublicPath()` in `apps/desktop/src/main/brand.ts`,
so a KnowDesign run shows `apps/web/public/brands/knowdesign/app-icon.png` instead of the upstream icon.

Regenerate after changing the master:

```sh
SRC=apps/web/public/brands/knowdesign/app-icon.svg; OUT=tools/pack/resources/brands/knowdesign; T=$(mktemp -d)
rsvg-convert -w 1024 -h 1024 "$SRC" -o "$OUT/mac/icon.png"; cp "$OUT/mac/icon.png" "$OUT/linux/icon.png"
cp "$OUT/mac/icon.png" apps/web/public/brands/knowdesign/app-icon.png
mkdir "$T/i.iconset"; for s in 16 32 128 256 512; do
  rsvg-convert -w $s -h $s "$SRC" -o "$T/i.iconset/icon_${s}x${s}.png"
  rsvg-convert -w $((s*2)) -h $((s*2)) "$SRC" -o "$T/i.iconset/icon_${s}x${s}@2x.png"; done
iconutil -c icns "$T/i.iconset" -o "$OUT/mac/icon.icns"
for s in 16 24 32 48 64 128 256; do rsvg-convert -w $s -h $s "$SRC" -o "$T/$s.png"; done
magick "$T"/{16,24,32,48,64,128,256}.png "$OUT/win/icon.ico"
```

The full brand kit (guide, tokens, mood board, construction diagram) is kept in the KnowDesign OpenDesign
project that produced this mark.
