# The Starred Bill: image style

Every featured image on the site follows a house style, so the pages read as one publication: guides use the gouache style below, news stories their own linocut style (see "News stories" at the end), so a reader can tell an explainer from a news story at a glance. Images are AI-generated with Canva's image tool, then sized by `scripts/guide_images.py`.

## The look
- **Medium:** editorial illustration, gouache and risograph feel, fine paper grain, flat shapes with soft hand-drawn edges. Not photographic, not 3D, not glossy.
- **Palette (the site's own):** deep forest green `#10362A`, soft sage green, warm cream paper `#F3ECDD`, muted antique gold `#B8902F`. One small extra accent is allowed when the subject needs it (saffron for India, sea blue for a harbour), used sparingly.
- **Composition:** usually an overhead (flat-lay) table, or a table by a window when a place matters. One clear subject, calm and uncluttered, with empty space at the top so the picture crops well to the 1200×630 link-preview size.
- **Recurring motifs:** a plated tasting-menu course; a long paper till receipt (the site's price receipts); simple five-pointed gold stars (one, two or three, matching the subject).
- **Place:** shown through food, produce and a simple flat skyline or landscape through a window, never through flags or recognisable signage.

## Never
- Text, letters, numbers or handwriting of any kind (they come out garbled and can't be translated).
- Logos or brand marks, the MICHELIN Guide's star symbol or its mascot. Our stars are plain five-pointed stars. The site is independent of Michelin.
- People or faces (hands are fine if a scene needs them).
- Real restaurants' dishes or interiors presented as if they were the real thing.

## Prompt template
Start every prompt with this, then describe the scene:

> Editorial illustration, gouache and risograph style with fine paper grain, flat shapes and soft hand-drawn edges. Strict limited palette: deep forest green (#10362A), soft sage green, warm cream paper (#F3ECDD) and muted antique gold (#B8902F) accents.

…and end it with:

> Calm, uncluttered, generous empty space at the top. No text, no letters, no numbers, no logos, no brand marks, no people, no faces.

Generate at 16:9 (Canva's `LANDSCAPE_16_9`, about 1680×944).

## Files
For a guide `content/guides/<id>.json`, put the full-size image at `src/img/guides/<id>-src.jpg` (or .png) and run `python3 scripts/guide_images.py <id>`. It writes, with the Mac's `sips`:
- `src/img/guides/<id>.jpg`: 1600×900, shown at the top of the guide;
- `src/img/guides/<id>-card.jpg`: 800×450, on the /guides/ list;
- `src/img/guides/<id>-og.jpg`: 1200×630, the link-preview picture.

Give the guide an `imageAlt` describing the picture in one plain sentence. A guide without an image still works; it just shows no picture.

## News stories (from 14 Oct 2026)
News stories (`content/news/`) get a picture in a different style from the guides, so news reads as news: bold and graphic where the guides are calm and painterly. Same palette, same rules under "Never".

- **Medium:** bold linocut and screen-print poster, high-contrast carved shapes, visible halftone dots, slight print misregistration, like the cover of a vintage newspaper supplement. Flat colour, no gradients.
- **Palette:** forest green `#10362A`, antique gold `#B8902F` and cream paper `#F3ECDD` only (no sage, no extra accents).
- **Composition:** dynamic, with strong diagonals and radiating lines; the place as a landscape or skyline silhouette (never a recognisable landmark), one food or dining motif in front, and plain five-pointed gold stars rising with rays, as many as the story's headline star level (three for a new three-star, two for a promotion to two). For stories without a star level (closures, ceremonies, chef moves) use a fitting object instead: a closed door, sealed envelopes on a stage, an empty chair.

Start every news prompt with:

> Bold linocut and screen-print poster illustration, high-contrast carved shapes, visible halftone dot texture and slight print misregistration, printed on warm cream paper (#F3ECDD). Strict limited palette: deep forest green (#10362A), muted antique gold (#B8902F) and cream only, flat colour, no gradients. Dynamic graphic composition with strong diagonals, like the cover of a vintage newspaper weekend supplement.

…describe the scene, and end with the same closing line as the guides. Generate at 16:9.

Files: put each picture on its own page of the Canva design "Starred Bill guide images" (1920×1080, page titled "News: <id>"), export that page as a JPG to `src/img/news/<id>-src.jpg`, and run `python3 scripts/guide_images.py --news <id>`. It writes `<id>.jpg` (top of the story), `<id>-card.jpg` (the /news/ list and the RSS feed) and `<id>-og.jpg` (link previews). Give the story an `imageAlt`. The build names any story still without a picture.
