// Draws the link-preview pictures (1200 × 630 PNG) shown when a page is shared on WhatsApp, X, Facebook, iMessage…
// Run on the Mac through scripts/og_images.py, which works out each page's wording. Uses macOS's own drawing (AppKit).
// The logo at the top is brand/png/lockup-horizontal-on-dark-2400.png (the receipt and the name), drawn from brand/make.html.
ObjC.import("AppKit");
function run(argv) {
  const items = JSON.parse(ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError($(argv[0]), $.NSUTF8StringEncoding, $())));
  const outDir = argv[1];
  const logo = $.NSImage.alloc.initWithContentsOfFile($(argv[2]));
  const W = 1200, H = 630;
  const rgb = (h, a) => $.NSColor.colorWithSRGBRedGreenBlueAlpha(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255, a == null ? 1 : a);
  const font = (names, size) => { for (const n of names) { const f = $.NSFont.fontWithNameSize(n, size); if (f && !f.isNil()) return f; } return $.NSFont.boldSystemFontOfSize(size); };
  const draw = (text, f, colour, x, yTop, w, h, kern) => {
    const attrs = $.NSMutableDictionary.dictionary;
    attrs.setObjectForKey(f, "NSFont"); attrs.setObjectForKey(colour, "NSColor"); attrs.setObjectForKey($.NSNumber.numberWithDouble(kern || 0), "NSKern");
    $.NSString.alloc.initWithUTF8String(text).drawInRectWithAttributes($.NSMakeRect(x, H - yTop - h, w, h), attrs);
  };
  items.forEach((it) => {
    const rep = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(null, W, H, 8, 4, true, false, $.NSDeviceRGBColorSpace, 0, 0);
    rep.size = $.NSMakeSize(W, H);
    $.NSGraphicsContext.saveGraphicsState;
    $.NSGraphicsContext.setCurrentContext($.NSGraphicsContext.graphicsContextWithBitmapImageRep(rep));
    rgb("10362A").setFill; $.NSRectFill($.NSMakeRect(0, 0, W, H));
    rgb("1E6142", 0.55).setFill; $.NSRectFill($.NSMakeRect(0, 0, W, 14));
    $.NSGraphicsContext.currentContext.imageInterpolation = $.NSImageInterpolationHigh;
    logo.drawInRectFromRectOperationFraction($.NSMakeRect(70, H - 70 - 78, 78 * 2400 / 520, 78), $.NSZeroRect, $.NSCompositingOperationSourceOver, 1);
    draw(it.title, font(["Georgia-Bold", "Times-Bold"], it.title.length > 44 ? 70 : 82), rgb("EAF4EC"), 70, 190, 1060, 290);
    draw(it.sub, font(["Helvetica"], 34), rgb("A9C8B4"), 70, 500, 1060, 50);
    draw("starredbill.com", font(["Helvetica-Bold"], 30), rgb("E0B85C"), 70, 556, 600, 44);
    $.NSGraphicsContext.restoreGraphicsState;
    rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $.NSDictionary.dictionary).writeToFileAtomically(outDir + "/" + it.id + ".png", true);
  });
  return items.length + " pictures";
}
