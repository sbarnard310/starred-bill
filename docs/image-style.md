# The Starred Bill: image style

Every featured image on the site (guides first, and later any other page that needs one) follows one house style, so the pages read as one publication. Images are AI-generated with Canva's image tool, then sized by `scripts/guide_images.py`.

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
