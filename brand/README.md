# The Starred Bill: logo

The mark is a till receipt with a gold star printed at the top, the same receipt visitors see on the site's price lists. It says "stars" and "the bill" in one shape. Our star is a plain five-pointed star, never the MICHELIN Guide's flower-shaped star, and the logo never contains the word "Michelin".

Every file here is drawn from one source, `make.html`. To change the logo, edit that file, run `python3 scripts/brand_images.py` (or start "brand" in the browser pane), open http://localhost:8797/make.html and press "Save all files". The text is turned into outlines, so the SVGs need no fonts installed.

## Which file to use

| Where | File |
|---|---|
| Profile picture: Instagram, X, TikTok, Threads, LinkedIn, YouTube, Facebook | `png/profile-green-1080.png` (main) or `png/profile-cream-1080.png` |
| X (Twitter) header | `png/banner-x-1500x500.png` |
| LinkedIn company page cover | `png/banner-linkedin-1128x191.png` |
| Facebook page cover | `png/banner-facebook-1640x624.png` |
| YouTube channel banner | `png/banner-youtube-2560x1440.png` |
| YouTube video watermark | `png/youtube-watermark-150.png` |
| Press, email signatures, slides (light background) | `png/lockup-horizontal-on-light-2400.png` |
| Same on dark or photo backgrounds | `png/lockup-horizontal-on-dark-2400.png` |
| Square spaces (posters, merch) | `png/lockup-stacked-on-light-2400.png` / `-on-dark-` |
| One colour (stamps, embossing, print) | `svg/mark-mono-green.svg`, `svg/mark-mono-white.svg` |
| Designers and printers | the matching file in `svg/` |
| The website's favicon and app icon (not used yet) | `site-icons/` |
| Emails' header (sign-in and star emails) | `src/img/email/receipt-mark.png`, a 81 × 120 copy of `png/mark-on-dark-1000.png` beside the name in live text |
| Link-preview pictures (`src/og/`) | `png/lockup-horizontal-on-dark-2400.png`, drawn in by `scripts/og_images.py` and `scripts/restaurant_images.py` |

Files ending `-boxed` have their own background colour; the others are see-through.

## Colours

| | Hex |
|---|---|
| Forest green | `#10362A` |
| Receipt cream | `#F5F0E4` |
| Gold (on cream) | `#B3862B` |
| Light gold (on green) | `#E0B85C` |
| Sage (tagline) | `#A9C8B4` |

Fonts: Gloock for the name, Figtree for the tagline (both free Google Fonts, the site's own).

## Rules
- Leave clear space around the logo at least half the receipt's width.
- Don't use the full receipt smaller than 24 pixels tall; the favicon has a simpler drawing for tiny sizes.
- Don't stretch, rotate, recolour, outline or add shadows to it, and don't put the light version on a light background.
- Tagline: "What the stars really cost".
