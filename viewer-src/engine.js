/* wrk. product engine
   One small studio for every product: paper ground, one soft light from the top-left,
   black objects that show their finish when light crosses them.
   Units are millimetres. Y is up. Products sit on y = 0, centred on the origin.

   Product modules call WRK.register({...}) and build their object with the helpers here.
   See products/kit.js for the reference module. */
(function () {
  'use strict';
  var T = window.THREE;
  var WRK = window.WRK = window.WRK || {};
  WRK.products = [];
  WRK.register = function (p) {
    WRK.products = WRK.products.filter(function (x) { return x.id !== p.id; });
    WRK.products.push(p);
    WRK.products.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  };

  /* ---------- fonts ---------- */
  WRK.FONT = {
    mark: '"Jost","Futura","Century Gothic",sans-serif',      // wrk. wordmark and Latin
    ar: '"Alexandria","Readex Pro","Noto Sans Arabic",sans-serif', // Arabic display
    arBody: '"Readex Pro","Alexandria",sans-serif'
  };
  WRK.fontsReady = (function () {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var want = ['200 40px Jost', '300 40px Jost', '400 40px Jost', '200 40px Alexandria', '300 40px Alexandria', '400 40px Alexandria', '300 40px "Readex Pro"'];
    var all = Promise.all(want.map(function (f) { return document.fonts.load(f, 'wrk. نورة').catch(function () {}); }));
    var cap = new Promise(function (r) { setTimeout(r, 3500); });
    return Promise.race([all, cap]);
  })();

  /* ---------- small utils ---------- */
  var ease = WRK.ease = {
    inOut: function (k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    out: function (k) { return 1 - Math.pow(1 - k, 3); },
    in: function (k) { return k * k * k; },
    // settles with a little weight, like putting a lid down
    settle: function (k) { var c = 1.35; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
    linear: function (k) { return k; }
  };
  var lerp = WRK.lerp = function (a, b, k) { return a + (b - a) * k; };
  var clamp = WRK.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  WRK.rng = rng;
  WRK.reducedMotion = function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; };

  /* ---------- textures ---------- */
  var tex = WRK.tex = {};
  var MAX_ANISO = 8;
  function finish(t, color) {
    t.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace;
    t.anisotropy = MAX_ANISO;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.needsUpdate = true;
    return t;
  }
  /* A colour texture drawn with the 2D canvas API. draw(ctx, w, h). */
  tex.color = function (w, h, draw) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d'); draw(ctx, w, h);
    return finish(new T.CanvasTexture(c), true);
  };
  /* A data texture (bump, roughness, alpha) drawn with the 2D canvas API. */
  tex.data = function (w, h, draw) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d'); draw(ctx, w, h);
    return finish(new T.CanvasTexture(c), false);
  };
  /* Redraw an existing canvas texture in place (for live names). */
  tex.redraw = function (t, draw) {
    var c = t.image, ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
    draw(ctx, c.width, c.height); t.needsUpdate = true;
  };

  var cache = {};
  function cached(key, make) { return cache[key] || (cache[key] = make()); }

  /* Tileable leather grain as a height canvas: raised pebbles, fine creases between them. */
  tex.leatherCanvas = function (size, cell) {
    size = size || 512; cell = cell || 14;
    return cached('leather' + size + '_' + cell, function () {
      var n = Math.round(size / cell), cs = size / n, r = rng(77);
      var px = new Float32Array(n * n), py = new Float32Array(n * n);
      for (var i = 0; i < n * n; i++) { px[i] = r(); py[i] = r(); }
      var c = document.createElement('canvas'); c.width = c.height = size;
      var ctx = c.getContext('2d'), img = ctx.createImageData(size, size), d = img.data;
      var r2 = rng(5);
      for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
        var cx = Math.floor(x / cs), cy = Math.floor(y / cs), f1 = 1e9, f2 = 1e9;
        for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
          var gx = cx + ox, gy = cy + oy, wi = ((gy + n) % n) * n + ((gx + n) % n);
          var dx = (gx + px[wi]) * cs - x, dy = (gy + py[wi]) * cs - y, dd = Math.sqrt(dx * dx + dy * dy);
          if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
        }
        var e = clamp((f2 - f1) / (cs * .42), 0, 1); e = e * e * (3 - 2 * e);
        var dome = 1 - clamp(f1 / (cs * .9), 0, 1) * .25;
        var v = (.25 + .75 * e) * dome + (r2() - .5) * .06;
        var g = clamp(v, 0, 1) * 255 | 0, o = (y * size + x) * 4;
        d[o] = d[o + 1] = d[o + 2] = g; d[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      return c;
    });
  };
  /* Fine tileable noise canvas, for soft-touch paper, anodised metal and cotton stock. */
  tex.noiseCanvas = function (size, contrast, seed) {
    size = size || 256; contrast = contrast == null ? .5 : contrast;
    return cached('noise' + size + '_' + contrast + '_' + (seed || 1), function () {
      var c = document.createElement('canvas'); c.width = c.height = size;
      var ctx = c.getContext('2d'), img = ctx.createImageData(size, size), d = img.data, r = rng(seed || 9);
      for (var i = 0; i < size * size; i++) { var g = clamp(.5 + (r() - .5) * contrast, 0, 1) * 255 | 0; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = g; d[i * 4 + 3] = 255; }
      ctx.putImageData(img, 0, 0); return c;
    });
  };
  tex.leatherBump = function (repeatX, repeatY) {
    var t = finish(new T.CanvasTexture(tex.leatherCanvas()), false);
    t.repeat.set(repeatX || 1, repeatY || 1); return t;
  };
  tex.noiseBump = function (repeatX, repeatY, contrast) {
    var t = finish(new T.CanvasTexture(tex.noiseCanvas(256, contrast)), false);
    t.repeat.set(repeatX || 1, repeatY || 1); return t;
  };

  /* A leather panel with something pressed into it (a name, the wordmark).
     wmm x hmm is the panel in millimetres. draw(ctx, w, h, pxPerMm) paints the mark in WHITE on transparent.
     Returns { bumpMap, roughnessMap } sized to the panel (do not tile). depth 0..1. */
  tex.debossedLeather = function (wmm, hmm, draw, opts) {
    opts = opts || {};
    var ppm = opts.ppm || 10, w = Math.round(wmm * ppm), h = Math.round(hmm * ppm);
    var grainMm = opts.grainMm || 26;             // one grain tile covers this many mm
    var mark = document.createElement('canvas'); mark.width = w; mark.height = h;
    var bump = tex.data(w, h, function () {}), rough = tex.data(w, h, function () {});
    function paint() {
      var mctx = mark.getContext('2d'); mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.clearRect(0, 0, w, h);
      mctx.fillStyle = '#fff'; mctx.strokeStyle = '#fff'; draw(mctx, w, h, ppm);
      var g = tex.leatherCanvas(), gs = grainMm * ppm;
      tex.redraw(bump, function (ctx) {
        ctx.fillStyle = ctx.createPattern(g, 'repeat'); ctx.save(); ctx.scale(gs / g.width, gs / g.height); ctx.fillRect(0, 0, w * g.width / gs, h * g.height / gs); ctx.restore();
        ctx.save(); ctx.globalCompositeOperation = 'multiply';
        // pressed area: darker (lower) with a soft shoulder
        var tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; var tc = tmp.getContext('2d');
        tc.fillStyle = '#fff'; tc.fillRect(0, 0, w, h); tc.globalCompositeOperation = 'difference';
        tc.filter = 'blur(' + (opts.shoulder == null ? 1.2 : opts.shoulder) + 'px)'; tc.drawImage(mark, 0, 0);
        ctx.globalAlpha = opts.depth == null ? .85 : opts.depth; ctx.drawImage(tmp, 0, 0); ctx.restore();
      });
      tex.redraw(rough, function (ctx) {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);          // 1.0 x material roughness
        ctx.globalCompositeOperation = 'multiply';
        var tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; var tc = tmp.getContext('2d');
        tc.fillStyle = '#fff'; tc.fillRect(0, 0, w, h); tc.globalCompositeOperation = 'source-over';
        tc.globalAlpha = opts.polish == null ? .45 : opts.polish; tc.globalCompositeOperation = 'difference'; tc.drawImage(mark, 0, 0);
        ctx.drawImage(tmp, 0, 0);
      });
    }
    paint();
    bump.wrapS = bump.wrapT = rough.wrapS = rough.wrapT = T.ClampToEdgeWrapping;
    return { bumpMap: bump, roughnessMap: rough, repaint: paint };
  };

  /* Gloss foil on a matte surface (the box lid). draw paints the mark in WHITE on transparent.
     Returns { map, roughnessMap, repaint }. Use with roughness: 1 on the material. */
  tex.foil = function (wmm, hmm, draw, opts) {
    opts = opts || {};
    var ppm = opts.ppm || 8, w = Math.round(wmm * ppm), h = Math.round(hmm * ppm);
    var base = opts.base || '#0f0f10', foil = opts.foil || '#161618';
    var baseRough = opts.baseRough == null ? .86 : opts.baseRough, foilRough = opts.foilRough == null ? .12 : opts.foilRough;
    var mark = document.createElement('canvas'); mark.width = w; mark.height = h;
    var map = tex.color(w, h, function () {}), rough = tex.data(w, h, function () {});
    function tint(col) { var t = document.createElement('canvas'); t.width = w; t.height = h; var c = t.getContext('2d'); c.drawImage(mark, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = col; c.fillRect(0, 0, w, h); return t; }
    function grey(v) { var g = Math.round(v * 255); return 'rgb(' + g + ',' + g + ',' + g + ')'; }
    function paint() {
      var mctx = mark.getContext('2d'); mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.clearRect(0, 0, w, h);
      mctx.fillStyle = '#fff'; mctx.strokeStyle = '#fff'; draw(mctx, w, h, ppm);
      tex.redraw(map, function (ctx) { ctx.fillStyle = base; ctx.fillRect(0, 0, w, h); ctx.drawImage(tint(foil), 0, 0); });
      tex.redraw(rough, function (ctx) {
        ctx.fillStyle = grey(baseRough); ctx.fillRect(0, 0, w, h);
        var n = tex.noiseCanvas(256, .12); ctx.globalAlpha = .5; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = ctx.createPattern(n, 'repeat'); ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(tint(grey(foilRough)), 0, 0);
      });
    }
    paint();
    map.wrapS = map.wrapT = rough.wrapS = rough.wrapT = T.ClampToEdgeWrapping;
    return { map: map, roughnessMap: rough, repaint: paint };
  };

  /* Printed paper (cards, pages). draw(ctx, w, h, pxPerMm) paints ink on an already-filled stock colour. */
  tex.print = function (wmm, hmm, draw, opts) {
    opts = opts || {};
    var ppm = opts.ppm || 8, w = Math.round(wmm * ppm), h = Math.round(hmm * ppm), stock = opts.stock || '#F4F2EC';
    var t = tex.color(w, h, function () {});
    function paint() {
      tex.redraw(t, function (ctx) {
        ctx.fillStyle = stock; ctx.fillRect(0, 0, w, h);
        if (opts.fibre !== false) { ctx.save(); ctx.globalAlpha = .05; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = ctx.createPattern(tex.noiseCanvas(256, 1, 3), 'repeat'); ctx.fillRect(0, 0, w, h); ctx.restore(); }
        draw(ctx, w, h, ppm);
      });
    }
    paint(); t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
    t.repaint = paint; return t;
  };

  /* Text helper for canvases. Handles Arabic (rtl) and Latin. Returns measured width in px. */
  tex.text = function (ctx, str, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.font = (o.weight || 300) + ' ' + (o.size || 40) + 'px ' + (o.font || WRK.FONT.mark);
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.baseline || 'middle';
    var arabic = /[؀-ۿ]/.test(str);
    ctx.direction = arabic ? 'rtl' : 'ltr';
    if (o.spacing && 'letterSpacing' in ctx && !arabic) ctx.letterSpacing = o.spacing + 'px';
    if (o.color) ctx.fillStyle = o.color;
    var w = ctx.measureText(str).width;
    if (o.maxWidth && w > o.maxWidth) { var k = o.maxWidth / w; ctx.translate(x, y); ctx.scale(k, k); ctx.fillText(str, 0, 0); w = o.maxWidth; }
    else ctx.fillText(str, x, y);
    ctx.restore(); return w;
  };
  /* First-day date helpers. date is 'YYYY-MM-DD'. style: 'ar' (٦ ديسمبر ٢٠٢٦ style, Latin digits), 'en' (6 December 2026), 'num' (06.12.26). */
  WRK.formatDate = function (date, style) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '') || [0, '2026', '12', '06'], y = +m[1], mo = +m[2], d = +m[3];
    var AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    var EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (style === 'ar') return d + ' ' + AR[mo - 1] + ' ' + y;
    if (style === 'en') return d + ' ' + EN[mo - 1] + ' ' + y;
    return ('0' + d).slice(-2) + '.' + ('0' + mo).slice(-2) + '.' + String(y).slice(-2);
  };
  WRK.isArabic = function (s) { return /[؀-ۿ]/.test(s || ''); };

  /* ---------- materials ---------- */
  var M = WRK.mats = {};
  function phys(o) { return new T.MeshPhysicalMaterial(o); }
  /* Full-grain black leather. repeat = how many grain tiles across the UV square. */
  M.leather = function (o) {
    o = o || {};
    return phys({ color: o.color || 0x0d0d0e, roughness: o.roughness == null ? .58 : o.roughness, metalness: 0,
      bumpMap: o.bumpMap || tex.leatherBump(o.repeatX || 3, o.repeatY || 3), bumpScale: o.bumpScale == null ? 1.1 : o.bumpScale,
      roughnessMap: o.roughnessMap || null, sheen: .2, sheenRoughness: .5, sheenColor: new T.Color(0x2e2d2c), clearcoat: .08, clearcoatRoughness: .5 });
  };
  /* The raw, sueded back of the leather (inside pockets, undersides). */
  M.suede = function (o) {
    o = o || {};
    return phys({ color: o.color || 0x1b1a1a, roughness: 1, metalness: 0, bumpMap: tex.noiseBump(o.repeat || 6, o.repeat || 6, .9), bumpScale: .6, sheen: 1, sheenRoughness: .9, sheenColor: new T.Color(0x4a4744) });
  };
  /* Painted and burnished leather edge. */
  M.edge = function () { return phys({ color: 0x0b0b0c, roughness: .34, metalness: 0, clearcoat: .5, clearcoatRoughness: .3 }); };
  /* Soft-touch laminated black paper wrap (the box). */
  M.softTouch = function (o) {
    o = o || {};
    return phys({ color: o.color || 0x0f0f10, roughness: o.roughness == null ? .86 : o.roughness, metalness: 0, map: o.map || null, roughnessMap: o.roughnessMap || null,
      bumpMap: o.bumpMap || tex.noiseBump(o.repeat || 8, o.repeat || 8, .25), bumpScale: .12, sheen: .22, sheenRoughness: .7, sheenColor: new T.Color(0x2c2c30) });
  };
  /* Uncoated black paper (tray lining, envelopes). */
  M.blackPaper = function (o) {
    o = o || {};
    return phys({ color: o.color || 0x121213, roughness: .96, metalness: 0, bumpMap: tex.noiseBump(o.repeat || 10, o.repeat || 10, .5), bumpScale: .18 });
  };
  /* Matte black metal: PVD or bead-blasted anodise. */
  M.blackMetal = function (o) {
    o = o || {};
    return phys({ color: o.color || 0x141416, metalness: 1, roughness: o.roughness == null ? .44 : o.roughness, map: o.map || null, roughnessMap: o.roughnessMap || null,
      bumpMap: o.bumpMap || tex.noiseBump(o.repeat || 12, o.repeat || 12, .35), bumpScale: o.bumpScale == null ? .05 : o.bumpScale });
  };
  /* Polished black metal (pen tip ring, chamfers). */
  M.blackGloss = function () { return phys({ color: 0x0e0e10, metalness: 1, roughness: .16 }); };
  /* Gunmetal hardware: swivel hooks, studs. */
  M.gunmetal = function (o) { o = o || {}; return phys({ color: 0x55565b, metalness: 1, roughness: o.roughness == null ? .32 : o.roughness }); };
  /* Bare engraved metal showing through black: brass or aluminium. */
  M.brass = function () { return phys({ color: 0xb08d57, metalness: 1, roughness: .35 }); };
  M.aluminium = function () { return phys({ color: 0xc9cacd, metalness: 1, roughness: .38 }); };
  /* Cotton card stock and book paper. */
  M.cotton = function (o) {
    o = o || {};
    return phys({ color: o.map ? 0xffffff : (o.color || 0xf4f2ec), map: o.map || null, roughness: .93, metalness: 0, bumpMap: tex.noiseBump(o.repeat || 6, o.repeat || 6, .6), bumpScale: .1, sheen: .2, sheenRoughness: .9, sheenColor: new T.Color(0xffffff) });
  };
  M.paper = function (o) { o = o || {}; return phys({ color: o.map ? 0xffffff : (o.color || 0xefece4), map: o.map || null, roughness: .9, metalness: 0, side: o.side || T.FrontSide }); };
  /* Woven lanyard webbing, black thread. */
  M.webbing = function (o) {
    o = o || {};
    var t = cached('weave', function () {
      return tex.leatherCanvas && (function () {
        var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d');
        x.fillStyle = '#777'; x.fillRect(0, 0, 64, 64);
        for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) { var v = ((i + j) % 2) ? 205 : 110; x.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; x.fillRect(i * 8 + 1, j * 8 + ((i % 2) ? 0 : 4) - 4, 6, 7); }
        return c;
      })();
    });
    var b = finish(new T.CanvasTexture(t), false); b.repeat.set(o.repeatX || 3, o.repeatY || 80);
    return phys({ color: o.color || 0x151516, roughness: .9, metalness: 0, bumpMap: b, bumpScale: .5, sheen: .6, sheenRoughness: .6, sheenColor: new T.Color(0x404044), side: T.DoubleSide });
  };
  /* Clear window film (badge holders). */
  M.film = function () { return phys({ color: 0xffffff, roughness: .08, metalness: 0, transparent: true, opacity: .16, clearcoat: 1, clearcoatRoughness: .05, depthWrite: false }); };
  /* Plain ink-black plastic or rubber. */
  M.matteBlack = function (o) { o = o || {}; return phys({ color: o.color || 0x101011, roughness: o.roughness == null ? .7 : o.roughness, metalness: 0 }); };

  /* ---------- geometry ---------- */
  var G = WRK.geo = {};
  /* Box with rounded edges and corners, centred on the origin. */
  G.roundedBox = function (w, h, d, r, seg) {
    seg = (seg || 3) * 2 + 1; r = Math.min(w / 2, h / 2, d / 2, r);
    var g = new T.BoxGeometry(1, 1, 1, seg, seg, seg).toNonIndexed();
    var pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    var box = new T.Vector3(w, h, d).divideScalar(2).subScalar(r), p = new T.Vector3(), n = new T.Vector3(), hs = .5 / seg;
    for (var i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i); n.copy(p);
      n.x -= Math.sign(n.x) * hs; n.y -= Math.sign(n.y) * hs; n.z -= Math.sign(n.z) * hs; n.normalize();
      var x = box.x * Math.sign(p.x) + n.x * r, y = box.y * Math.sign(p.y) + n.y * r, z = box.z * Math.sign(p.z) + n.z * r;
      pos.setXYZ(i, x, y, z); nor.setXYZ(i, n.x, n.y, n.z);
      // planar UVs per dominant face so labels map 0..1 across the whole face
      var ax = Math.abs(p.x), ay = Math.abs(p.y), az = Math.abs(p.z);
      if (ay >= ax && ay >= az) uv.setXY(i, x / w + .5, p.y > 0 ? (-z / d + .5) : (z / d + .5));
      else if (az >= ax) uv.setXY(i, p.z > 0 ? (x / w + .5) : (-x / w + .5), y / h + .5);
      else uv.setXY(i, p.x > 0 ? (-z / d + .5) : (z / d + .5), y / h + .5);
    }
    return g;
  };
  G.roundedRectShape = function (w, h, r) {
    r = Math.min(r, w / 2, h / 2); var s = new T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
    s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  };
  /* A flat plate with rounded corners, lying on the XZ plane (thickness along Y), bottom at y = 0.
     w along X, h along Z. UVs run 0..1 across the plate so a label texture fits the top face.
     holes: optional array of THREE.Path in plate coordinates (x right, y = -z). bevel softens the edge. */
  G.plate = function (w, h, thick, r, o) {
    o = o || {};
    var s = o.shape || G.roundedRectShape(w, h, r || 0);
    if (o.holes) o.holes.forEach(function (hh) { s.holes.push(hh); });
    var b = o.bevel == null ? Math.min(.4, thick / 3) : o.bevel;
    var g = new T.ExtrudeGeometry(s, { depth: Math.max(.01, thick - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: o.bevelSegments || 3, curveSegments: o.curveSegments || 16 });
    g.translate(0, 0, b); g.rotateX(-Math.PI / 2);
    var pos = g.attributes.position, uv = g.attributes.uv;
    for (var i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + .5, -pos.getZ(i) / h + .5);
    g.computeVertexNormals();
    return g;
  };
  /* A flat ribbon following a 3D curve (lanyards, ribbons). width across, thickness tiny. */
  G.ribbon = function (curve, width, segments, upFn) {
    segments = segments || 120;
    var pos = [], uv = [], idx = [], p = new T.Vector3(), t = new T.Vector3(), side = new T.Vector3(), up = new T.Vector3(0, 1, 0), prevSide = null;
    for (var i = 0; i <= segments; i++) {
      var k = i / segments; curve.getPointAt(k, p); curve.getTangentAt(k, t);
      var u = upFn ? upFn(k, p, t) : up; side.crossVectors(t, u);
      if (side.lengthSq() < 1e-6) side.copy(prevSide || new T.Vector3(1, 0, 0)); side.normalize();
      if (prevSide && side.dot(prevSide) < 0) side.negate();
      prevSide = side.clone();
      pos.push(p.x - side.x * width / 2, p.y - side.y * width / 2, p.z - side.z * width / 2, p.x + side.x * width / 2, p.y + side.y * width / 2, p.z + side.z * width / 2);
      uv.push(0, k, 1, k);
      if (i < segments) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  /* Turned profile (pens, studs): points are [radius, y] pairs, bottom to top. */
  G.lathe = function (pts, seg) { return new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0], p[1]); }), seg || 64); };
  /* Convenience mesh maker: casts and receives shadow. */
  WRK.mesh = function (geometry, material, o) {
    o = o || {}; var m = new T.Mesh(geometry, material);
    m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
    if (o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]);
    if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    if (o.name) m.name = o.name;
    return m;
  };
  /* A flat label quad lying on a surface: a thin decal, 0.02 mm above y. w along X, h along Z. */
  WRK.decal = function (w, h, material, o) {
    o = o || {}; var g = new T.PlaneGeometry(w, h); g.rotateX(-Math.PI / 2);
    var m = new T.Mesh(g, material); m.receiveShadow = true; m.castShadow = false;
    if (o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]); return m;
  };

  /* ---------- studio environment ---------- */
  function studioScene() {
    var s = new T.Scene(), box = new T.BoxGeometry(1, 1, 1);
    var room = new T.Mesh(box, new T.MeshStandardMaterial({ color: 0xcfcdc8, side: T.BackSide, roughness: 1 }));
    room.scale.set(30, 22, 30); room.position.y = 9; s.add(room);
    var pl = new T.PointLight(0xfffaf4, 300, 0, 2); pl.position.set(-4, 16, 5); s.add(pl);
    function panel(x, y, z, sx, sy, sz, i, c) { var m = new T.Mesh(box, new T.MeshBasicMaterial({ color: new T.Color(c || 0xffffff).multiplyScalar(i) })); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.lookAt(0, 0, 0); s.add(m); }
    panel(-11, 13, 7, 10, 7, .1, 14, 0xfffaf2);    // key softbox, top-left-front
    panel(12, 7, -4, .1, 9, 2.2, 9);                // right strip, rim on edges
    panel(0, 9, -14, 12, 1.6, .1, 8);               // back strip, the line that crosses foil
    panel(4, 3, 14, 7, 3, .1, 1.6, 0xf2efe8);       // low front fill
    return s;
  }

  /* ---------- stage ---------- */
  function Stage(container, opts) {
    opts = opts || {};
    var self = this;
    this.el = container; this.opts = opts;
    var canvas = this.canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;outline:none';
    container.appendChild(canvas);
    var r;
    try { r = this.renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!opts.snapshot, powerPreference: 'high-performance' }); }
    catch (e) { this.failed = true; canvas.remove(); return; }
    r.setClearColor(0x000000, 0);
    r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = .92;
    r.shadowMap.enabled = true; r.shadowMap.type = T.VSMShadowMap;
    MAX_ANISO = Math.min(8, r.capabilities.getMaxAnisotropy());
    var scene = this.scene = new T.Scene();
    var pm = new T.PMREMGenerator(r); var st = studioScene();
    this.envRT = pm.fromScene(st, .035); scene.environment = this.envRT.texture; pm.dispose();
    st.traverse(function (o) { if (o.isMesh) { o.material.dispose(); } });

    this.camera = new T.PerspectiveCamera(24, 1, 10, 6000);
    // key light, top-left-front. Shadow falls to the bottom-right.
    var key = this.key = new T.DirectionalLight(0xfff8ee, 1.25); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.blurSamples = 16; key.shadow.bias = -0.0006; key.shadow.normalBias = .6;
    scene.add(key); scene.add(key.target);
    var fill = this.fill = new T.DirectionalLight(0xeef1fb, .18); scene.add(fill); scene.add(fill.target);
    // ground only shows shadow; the paper is the page itself
    var ground = this.ground = new T.Mesh(new T.PlaneGeometry(1, 1), new T.ShadowMaterial({ opacity: .42, color: 0x1a1612 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    // soft contact shadow blob right under the object (ambient occlusion on the paper)
    var blob = this.blob = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: .5, map: tex.color(128, 128, function (c) {
      var g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(20,16,12,.55)'); g.addColorStop(.55, 'rgba(20,16,12,.2)'); g.addColorStop(1, 'rgba(20,16,12,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); }) }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = .05; blob.renderOrder = -1; scene.add(blob);

    this.turn = new T.Group(); scene.add(this.turn);     // the turntable
    this.yaw = 0; this.pitch = .5; this.yawV = 0; this.pitchV = 0;
    this.limits = { pitchMin: .12, pitchMax: 1.45 };
    this.anims = []; this.dirty = true; this.inst = null; this.visible = true; this.t0 = performance.now();

    if (!opts.snapshot) {
      var drag = null;
      canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, yaw: self.yaw, pitch: self.pitch, t: performance.now() }; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} self.yawV = self.pitchV = 0; self.userMoved = true; container.classList.add('is-dragging'); });
      canvas.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y, ny = drag.yaw + dx * .0085, np = clamp(drag.pitch + dy * .006, self.limits.pitchMin, self.limits.pitchMax);
        self.yawV = ny - self.yaw; self.pitchV = np - self.pitch; self.yaw = ny; self.pitch = np; self.dirty = true;
      });
      var up = function () { if (drag) { drag = null; container.classList.remove('is-dragging'); if (WRK.reducedMotion()) self.yawV = self.pitchV = 0; self.dirty = true; } };
      canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
      canvas.tabIndex = 0;
      canvas.addEventListener('keydown', function (e) {
        var k = e.key; if (k === 'ArrowLeft') self.yaw -= .15; else if (k === 'ArrowRight') self.yaw += .15; else if (k === 'ArrowUp') self.pitch = clamp(self.pitch - .08, self.limits.pitchMin, self.limits.pitchMax); else if (k === 'ArrowDown') self.pitch = clamp(self.pitch + .08, self.limits.pitchMin, self.limits.pitchMax); else return;
        e.preventDefault(); self.dirty = true;
      });
      if (window.ResizeObserver) { this.ro = new ResizeObserver(function () { self.resize(); }); this.ro.observe(container); }
      if (window.IntersectionObserver) { this.io = new IntersectionObserver(function (en) { self.visible = en[0].isIntersecting; if (self.visible) self.dirty = true; }); this.io.observe(container); }
      canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); });
      canvas.addEventListener('webglcontextrestored', function () { self.dirty = true; });
      this.resize();
      var loop = function () { if (self.dead) return; self.raf = requestAnimationFrame(loop); self.frame(); }; loop();
    }
  }
  Stage.prototype.resize = function (w, h) {
    if (this.failed) return;
    w = w || this.el.clientWidth || 600; h = h || this.el.clientHeight || 400;
    var dpr = this.opts.snapshot ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr); this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.w = w; this.h = h; this.place(); this.dirty = true;
  };
  /* Furthest the piece gets from the view target at any turntable angle. Cached until the piece changes shape. */
  Stage.prototype.reach = function (v) {
    var fp = v.footprint || [0, 0], key = v.radius + '|' + fp[0] + '|' + fp[1] + '|' + v.target.join(',');
    if (this._reachKey === key && this._reachFor === this.inst) return this._reach;
    var r = v.radius;
    try {
      var yaw = this.turn.rotation.y; this.turn.rotation.y = 0; this.turn.updateMatrixWorld(true);
      var b = new T.Box3().setFromObject(this.inst.group);
      this.turn.rotation.y = yaw; this.turn.updateMatrixWorld(true);
      if (!b.isEmpty()) {
        var rx = Math.max(Math.abs(b.min.x), Math.abs(b.max.x)), rz = Math.max(Math.abs(b.min.z), Math.abs(b.max.z));
        var side = Math.sqrt(rx * rx + rz * rz) + Math.sqrt(v.target[0] * v.target[0] + v.target[2] * v.target[2]);
        var up = Math.max(Math.abs(b.max.y - v.target[1]), Math.abs(b.min.y - v.target[1]));
        r = Math.sqrt(side * side + up * up);
      }
    } catch (e) {}
    this._reachKey = key; this._reachFor = this.inst; this._reach = r; return r;
  };
  /* Camera sits on a sphere around the view target; the product turns on the turntable. */
  Stage.prototype.place = function () {
    var v = this.view || { radius: 100, target: [0, 20, 0] }, cam = this.camera;
    var vfov = cam.fov * Math.PI / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * cam.aspect), f = Math.min(vfov, hfov);
    var dist = (v.radius * (this.zoom || 1)) / Math.sin(f / 2) * 1.04;
    /* Tall, narrow stage (an unfolded phone, a split pane): the authored radius is tuned for a wide stage,
       so a long piece ran off the sides. Fit the width to the piece's real reach around the turntable. */
    if (hfov < vfov && this.inst && v === this.inst.view) {
      var reach = this.reach(v);
      if (reach > v.radius) dist = Math.max(dist, (reach * (this.zoom || 1)) / Math.sin(hfov / 2) * 1.04);
    }
    var tx = v.target[0], ty = v.target[1], tz = v.target[2], p = this.pitch;
    cam.position.set(tx, ty + Math.sin(p) * dist, tz + Math.cos(p) * dist); cam.lookAt(tx, ty + (v.lift || 0), tz);
    cam.near = Math.max(1, dist - v.radius * 4); cam.far = dist + v.radius * 6; cam.updateProjectionMatrix();
    var R = v.radius;
    this.key.position.set(tx - R * 1.5, ty + R * 3.2, tz + R * 1.35); this.key.target.position.set(tx, 0, tz);
    var sc = this.key.shadow.camera; sc.left = -R * 2.2; sc.right = R * 2.2; sc.top = R * 2.2; sc.bottom = -R * 2.2; sc.near = R * .2; sc.far = R * 9; sc.updateProjectionMatrix();
    this.fill.position.set(tx + R * 2, ty + R * 1.2, tz + R * 2); this.fill.target.position.set(tx, ty, tz);
    this.ground.scale.set(R * 14, R * 14, 1); this.ground.position.set(tx, 0, tz);
    var fp = v.footprint || [R * 1.5, R * 1.1];
    this.blob.scale.set(fp[0] * 1.5, fp[1] * 1.5, 1);
    this.turn.rotation.y = this.yaw;
    this.blob.rotation.z = this.yaw; this.blob.position.set(0, .05, 0);
  };
  Stage.prototype.ctx = function (personal) {
    var self = this;
    return {
      THREE: T, mats: M, tex: tex, geo: G, mesh: WRK.mesh, decal: WRK.decal, ease: ease, FONT: WRK.FONT, personal: personal || {},
      invalidate: function () { self.dirty = true; },
      /* look(yaw, pitch, ms, zoom): ease the camera. Pass null to keep a value. zoom > 1 pulls back. */
      look: function (yaw, pitch, ms, zoom) { return self.lookFrom(yaw, pitch, ms, zoom); },
      snapshot: !!self.opts.snapshot,
      /* run(ms, fn(k), easing, key): animate k from 0 to 1. A new run with the same key replaces the old one. Returns a promise. */
      run: function (ms, fn, easing, key) {
        return new Promise(function (res) {
          if (key) self.anims = self.anims.filter(function (a) { if (a.key === key) { a.res(); return false; } return true; });
          if (WRK.reducedMotion() || self.opts.snapshot || ms <= 0) { fn(1); self.dirty = true; res(); return; }
          self.anims.push({ t: performance.now(), ms: ms, fn: fn, e: easing || ease.inOut, key: key, res: res });
        });
      }
    };
  };
  /* Show a product. personal = { name, latin, date }. Returns the built instance. */
  Stage.prototype.show = function (product, personal) {
    if (this.failed) return null;
    this.clear();
    var inst = product.build(this.ctx(personal));
    this.inst = inst; this.product = product; this.turn.add(inst.group);
    var v = this.view = inst.view || { radius: 120, target: [0, 20, 0] };
    this.yaw = v.yaw == null ? -.5 : v.yaw; this.pitch = v.pitch == null ? .5 : v.pitch; this.yawV = this.pitchV = 0; this.zoom = 1;
    this.limits.pitchMin = v.pitchMin == null ? .1 : v.pitchMin; this.limits.pitchMax = v.pitchMax == null ? 1.5 : v.pitchMax;
    this.userMoved = false;
    this.place(); this.dirty = true; return inst;
  };
  Stage.prototype.clear = function () {
    if (this.inst) {
      this.turn.remove(this.inst.group);
      this.inst.group.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        ms.forEach(function (m) { ['map', 'bumpMap', 'roughnessMap', 'alphaMap', 'normalMap', 'metalnessMap', 'emissiveMap'].forEach(function (k) { if (m[k] && m[k].dispose) m[k].dispose(); }); m.dispose(); });
      });
      if (this.inst.dispose) this.inst.dispose();
    }
    this.anims.forEach(function (a) { a.res(); }); this.anims = []; this.inst = null;
  };
  /* Ease the view to a pose (used by product actions that need a better angle). */
  Stage.prototype.lookFrom = function (yaw, pitch, ms, zoom) {
    var self = this, y0 = this.yaw, p0 = this.pitch, z0 = this.zoom || 1;
    // unwind extra turns so the move is short
    var dy = yaw == null ? 0 : yaw - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    return this.ctx().run(ms == null ? 900 : ms, function (k) { self.yaw = y0 + dy * k; if (pitch != null) self.pitch = lerp(p0, pitch, k); if (zoom != null) self.zoom = lerp(z0, zoom, k); self.dirty = true; }, ease.inOut, '__view');
  };
  Stage.prototype.frame = function () {
    if (this.failed || !this.visible || document.hidden) return;
    var now = performance.now(), self = this;
    if (this.anims.length) {
      this.anims = this.anims.filter(function (a) { var k = clamp((now - a.t) / a.ms, 0, 1); a.fn(a.e(k)); if (k >= 1) { a.res(); return false; } return true; });
      this.dirty = true;
    }
    if (!this.el.classList.contains('is-dragging') && (Math.abs(this.yawV) > .0004 || Math.abs(this.pitchV) > .0004)) {
      this.yaw += this.yawV; this.pitch = clamp(this.pitch + this.pitchV, this.limits.pitchMin, this.limits.pitchMax); this.yawV *= .93; this.pitchV *= .9; this.dirty = true;
    }
    if (this.inst && this.inst.update) { if (this.inst.update((now - this.t0) / 1000) === true) this.dirty = true; }
    if (!this.dirty) return;
    this.dirty = false; this.place(); this.renderer.render(this.scene, this.camera);
  };
  /* Render one still of a product and return a PNG data URL (used for the index tiles). */
  Stage.prototype.still = function (product, personal, w, h, pose) {
    if (this.failed) return null;
    var inst = this.show(product, personal); pose = pose || {};
    var v = this.view; if (v.tile) { if (v.tile.yaw != null) this.yaw = v.tile.yaw; if (v.tile.pitch != null) this.pitch = v.tile.pitch; if (v.tile.zoom) this.zoom = v.tile.zoom; }
    if (pose.states && inst.setState) pose.states.forEach(function (s) { inst.setState(s, true, false); });
    v = this.view = Object.assign({}, inst.view, { target: (pose.target || inst.view.target).slice() }); if (pose.radius) v.radius = pose.radius;
    if (pose.yaw != null) this.yaw = pose.yaw; if (pose.pitch != null) this.pitch = pose.pitch; if (pose.zoom) this.zoom = pose.zoom;
    this.resize(w, h); this.place(); this.renderer.render(this.scene, this.camera);
    var url = this.canvas.toDataURL('image/png'); return url;
  };
  Stage.prototype.destroy = function () {
    this.dead = true; if (this.failed) return; cancelAnimationFrame(this.raf); this.clear();
    if (this.ro) this.ro.disconnect(); if (this.io) this.io.disconnect();
    this.envRT.dispose(); this.renderer.dispose(); try { this.renderer.forceContextLoss(); } catch (e) {} this.canvas.remove();
  };
  WRK.Stage = Stage;
})();
