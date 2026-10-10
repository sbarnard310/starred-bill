// Draws restaurant pages' link-preview pictures (1200 × 630 PNG): name, stars and place on the left, the till receipt on
// the right. Run through scripts/restaurant_images.py, which works out each restaurant's lines. Uses macOS's AppKit.
// The logo at the top is brand/png/lockup-horizontal-on-dark-2400.png (the receipt and the name), drawn from brand/make.html.
ObjC.import("AppKit");
function run(argv) {
  const items = JSON.parse(ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError($(argv[0]), $.NSUTF8StringEncoding, $())));
  const outDir = argv[1];
  const logo = $.NSImage.alloc.initWithContentsOfFile($(argv[2]));
  const W = 1200, H = 630;
  const rgb = (h, a) => $.NSColor.colorWithSRGBRedGreenBlueAlpha(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255, a == null ? 1 : a);
  const font = (names, size) => { for (const n of names) { const f = $.NSFont.fontWithNameSize(n, size); if (f && !f.isNil()) return f; } return $.NSFont.boldSystemFontOfSize(size); };
  const attrs = (f, colour, kern, align) => {
    const a = $.NSMutableDictionary.dictionary;
    a.setObjectForKey(f, "NSFont"); a.setObjectForKey(colour, "NSColor"); a.setObjectForKey($.NSNumber.numberWithDouble(kern || 0), "NSKern");
    if (align != null) { const p = $.NSMutableParagraphStyle.alloc.init; p.alignment = align; a.setObjectForKey(p, "NSParagraphStyle"); }
    return a;
  };
  const draw = (text, f, colour, x, yTop, w, h, kern, align) =>
    $.NSString.alloc.initWithUTF8String(text).drawInRectWithAttributes($.NSMakeRect(x, H - yTop - h, w, h), attrs(f, colour, kern, align));
  const width = (text, f) => $.NSString.alloc.initWithUTF8String(text).sizeWithAttributes(attrs(f, rgb("000000"))).width;
  const star = (cx, cy, R, colour) => {
    const p = $.NSBezierPath.bezierPath;
    for (let i = 0; i < 10; i++) {
      const a = (-90 + i * 36) * Math.PI / 180, r = i % 2 ? R * 0.43 : R;
      const pt = $.NSMakePoint(cx + r * Math.cos(a), H - (cy + r * Math.sin(a)));
      i ? p.lineToPoint(pt) : p.moveToPoint(pt);
    }
    p.closePath; p.lineJoinStyle = $.NSLineJoinStyleRound; p.lineWidth = R * 0.2;
    colour.setFill; colour.setStroke; p.fill; p.stroke;
  };
  const line = (x1, y, x2, colour, dash) => {
    const p = $.NSBezierPath.bezierPath;
    p.moveToPoint($.NSMakePoint(x1, H - y)); p.lineToPoint($.NSMakePoint(x2, H - y));
    p.lineWidth = dash ? 2 : 1.5;
    if (dash) p.setLineDashCountPhase([dash, dash], 2, 0);
    colour.setStroke; p.stroke;
  };
  items.forEach((it) => {
    const rep = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(null, W, H, 8, 4, true, false, $.NSDeviceRGBColorSpace, 0, 0);
    rep.size = $.NSMakeSize(W, H);
    $.NSGraphicsContext.saveGraphicsState;
    $.NSGraphicsContext.setCurrentContext($.NSGraphicsContext.graphicsContextWithBitmapImageRep(rep));
    rgb("10362A").setFill; $.NSRectFill($.NSMakeRect(0, 0, W, H));
    // Left: the site, the restaurant, its stars and place.
    $.NSGraphicsContext.currentContext.imageInterpolation = $.NSImageInterpolationHigh;
    logo.drawInRectFromRectOperationFraction($.NSMakeRect(64, H - 56 - 64, 64 * 2400 / 520, 64), $.NSZeroRect, $.NSCompositingOperationSourceOver, 1);
    const nameSize = it.name.length > 22 ? 58 : it.name.length > 14 ? 70 : 82;
    draw(it.name, font(["Georgia-Bold", "Times-Bold"], nameSize), rgb("EAF4EC"), 64, 170, 560, 200);
    for (let i = 0; i < it.stars; i++) star(86 + i * 50, 420, 18, rgb("E0B85C"));
    draw(it.where, font(["Helvetica"], 30), rgb("A9C8B4"), 64, 452, 560, 44);
    draw("What it costs · starredbill.com", font(["Helvetica-Bold"], 26), rgb("E0B85C"), 64, 548, 560, 40);
    // Right: the receipt on cream paper with a torn bottom edge.
    const x = 690, y = 60, w = 450, rows = it.lines.length + (it.total ? 1 : 0);
    const h = 150 + rows * 62 + 70;
    rgb("F5F0E4").setFill;
    $.NSRectFill($.NSMakeRect(x, H - y - h, w, h));
    const tear = $.NSBezierPath.bezierPath;
    tear.moveToPoint($.NSMakePoint(x, H - y - h));
    for (let k = 0; k < w / 15; k++) { tear.lineToPoint($.NSMakePoint(x + k * 15 + 7.5, H - y - h - 10)); tear.lineToPoint($.NSMakePoint(x + (k + 1) * 15, H - y - h)); }
    tear.closePath; tear.fill;
    const mono = font(["Menlo-Regular", "Courier"], 30), monoB = font(["Menlo-Bold", "Courier-Bold"], 30), small = font(["Menlo-Regular", "Courier"], 17);
    const ink = rgb("1F2A22"), muted = rgb("6B6455"), dots = rgb("A39A86");
    draw("TABLE FOR 1", small, muted, x, y + 34, w, 26, 4, 1);
    line(x + 30, y + 80, x + w - 30, rgb("C9C0AC"), 6);
    let ty = y + 106;
    const row = (k, v, f) => {
      draw(k, f, ink, x + 34, ty, 260, 40);
      const vw = width(v, f);
      draw(v, f, ink, x + w - 34 - vw, ty, vw + 4, 40);
      line(x + 40 + width(k, f), ty + 30, x + w - 44 - vw, dots, 3);
      ty += 62;
    };
    it.lines.forEach(([k, v]) => row(k, v, mono));
    if (it.total) { line(x + 30, ty - 12, x + w - 30, rgb("C9C0AC"), 6); row("Dinner + wine", it.total, monoB); }
    draw(it.foot, small, muted, x, ty + 4, w, 26, 0, 1);
    draw(it.checked, small, muted, x, ty + 32, w, 26, 0, 1);
    $.NSGraphicsContext.restoreGraphicsState;
    rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $.NSDictionary.dictionary).writeToFileAtomically(outDir + "/" + it.id + ".png", true);
  });
  return items.length + " pictures";
}
