/* تسعون — the notebook.
   Geometry in mm, Y up, resting on y = 0. Portrait: head of the book at -Z, foot at +Z.
   Arabic-first: the spine is on the right (+X) when the front cover faces up.
   Build: two cover boards and a soft leather spine form a small linkage, so the book sits the way a real
   slim notebook does: open on page 1 the front cover slopes down to the desk, open on page 90 the back cover does. */
(function () {
  var WRK = window.WRK;

  WRK.register({
    id: 'notebook', order: 3,
    name: { ar: 'تسعون', en: 'tis’oun' },
    kind: { ar: 'الدفتر', en: 'The notebook' },
    price: 119,
    line: { ar: 'دفتر أسود نحيف. تسعون صفحة.', en: 'A slim black notebook. Ninety pages.' },
    story: {
      ar: 'دفتر نحيف بغلاف جلد أسود، يفتح من اليمين ويستوي على المكتب. تسعون صفحة منقّطة ومرقّمة، حوافها سوداء وداخلها عاجي. اسمه مضغوط في زاوية الغلاف، وتاريخ أول يوم مطبوع في رأس الصفحة الأولى.',
      en: 'A slim notebook in black leather. It opens from the right and lies flat on the desk. Ninety numbered dot-grid pages, black at the edges and ivory inside. Their name is pressed into a corner of the cover, and the date of the first day is printed at the head of page one.'
    },
    specs: [
      [{ ar: 'المقاس', en: 'Size' }, { ar: '100 × 210 × 8 مم', en: '100 × 210 × 8 mm' }],
      [{ ar: 'الغلاف', en: 'Cover' }, { ar: 'جلد طبيعي أسود، حواف مدهونة', en: 'Black full-grain leather, painted edges' }],
      [{ ar: 'الورق', en: 'Paper' }, { ar: 'عاجي 100 غ، منقّط 5 مم', en: 'Ivory 100 gsm, 5 mm dot grid' }],
      [{ ar: 'الصفحات', en: 'Pages' }, { ar: '90 صفحة مرقّمة، حواف سوداء', en: '90 numbered pages, black edges' }],
      [{ ar: 'التجليد', en: 'Binding' }, { ar: 'مخيّط بالخيط، يفتح من اليمين، فاصل شريط', en: 'Thread-sewn, opens from the right, ribbon marker' }],
      [{ ar: 'الاسم', en: 'Name' }, { ar: 'مضغوط بدون لون على الغلاف', en: 'Blind-pressed into the cover' }]
    ],
    personal: { ar: 'الاسم مضغوط في زاوية الغلاف، والتاريخ في رأس الصفحة الأولى', en: 'Name pressed into the cover corner, date at the head of page one' },
    personalFields: ['name', 'date'],
    actions: [
      { id: 'open', label: { ar: 'افتح', en: 'Open' }, labelOn: { ar: 'أغلق', en: 'Close' } },
      { id: 'day90', label: { ar: 'الصفحة 90', en: 'Page 90' }, labelOn: { ar: 'الصفحة 1', en: 'Page 1' } }
    ],
    gallery: [
      { states: [], yaw: -.5, pitch: .74, zoom: 1, caption: { ar: 'أسود من كل جهة', en: 'Black on every side' } },
      { states: [], yaw: -.22, pitch: .62, target: [-22, 8, 84], radius: 40, caption: { ar: 'الاسم مضغوط في الجلد', en: 'The name, pressed into the leather' } },
      { states: ['open'], yaw: -.05, pitch: 1.02, target: [4, 7, -70], radius: 58, caption: { ar: 'الصفحة الأولى، بتاريخ أول يوم', en: 'Page one, with the date of the first day' } },
      { states: ['open', 'day90'], yaw: -.16, pitch: .92, zoom: 1, caption: { ar: 'تسعون صفحة', en: 'Ninety pages' } }
    ],

    build: function (ctx) {
      var T = ctx.THREE, M = ctx.mats, G = ctx.geo, tex = ctx.tex, mesh = ctx.mesh, F = ctx.FONT;
      var PI = Math.PI, clamp = WRK.clamp, lerp = WRK.lerp;
      var group = new T.Group();

      /* ----- sizes ----- */
      var CW = 98.5, CH = 210;          // one cover panel, hinge to fore-edge, and its height
      var TC = 1.4;                      // cover thickness (leather + board + lining)
      var HB = 5.2;                      // text block as drawn (5.4 nominal, minus the linings)
      var TT = 8.2;                      // closed thickness
      var X0 = 48.5;                     // hinge line of the back cover; the soft spine bulges to x = 50
      var XC = X0 - .25;                 // the gutter: where the leaves are sewn
      var PW = 96.5, PH = 207;           // page
      var RS = .9;                       // spine leather + lining
      var STOCK = '#FAF4E3';

      /* ----- shapes ----- */
      // a panel with round corners on the fore-edge side only (right = +x side)
      function tab(w, h, r, right) {
        var s = new T.Shape(), x = -w / 2, y = -h / 2;
        if (right) { s.moveTo(x, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -PI / 2, 0, false); s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, PI / 2, false); s.lineTo(x, y + h); s.lineTo(x, y); }
        else { s.moveTo(x + r, y); s.lineTo(x + w, y); s.lineTo(x + w, y + h); s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, PI / 2, PI, false); s.lineTo(x, y + r); s.absarc(x + r, y + r, r, PI, PI * 1.5, false); }
        return s;
      }

      /* ----- printed pages ----- */
      function dots(c, k, col, rad) {
        c.fillStyle = col;
        for (var j = 0; j < 37; j++) for (var i = 0; i < 18; i++) { c.beginPath(); c.arc((5.75 + i * 5) * k, (16 + j * 5) * k, rad, 0, 6.2832); c.fill(); }
      }
      function gutter(c, w, h, k, spineRight) {
        var g = spineRight ? c.createLinearGradient(w, 0, w - 9 * k, 0) : c.createLinearGradient(0, 0, 9 * k, 0);
        g.addColorStop(0, 'rgba(70,58,36,.22)'); g.addColorStop(.35, 'rgba(70,58,36,.07)'); g.addColorStop(1, 'rgba(70,58,36,0)');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
      }
      function dayLabel(c, k, n) { tex.text(c, 'اليوم ' + n, (PW - 5.6) * k, 8.6 * k, { font: F.ar, weight: 300, size: 2.9 * k, align: 'right', color: '#8d8777' }); }
      var page1 = tex.print(PW, PH, function (c, w, h, k) {
        dots(c, k, '#8f8979', .21 * k); gutter(c, w, h, k, true); dayLabel(c, k, 1);
        var p = ctx.personal || {}, ar = WRK.isArabic(p.name || 'ن');
        var d = WRK.formatDate(p.date, ar ? 'ar' : 'en');
        // the personal date: stamped in black, a touch uneven like a real stamp
        c.save(); c.globalAlpha = .86;
        tex.text(c, d, 5.6 * k, 8.7 * k, { font: ar ? F.ar : F.mark, weight: ar ? 300 : 400, size: 2.6 * k, align: 'left', color: '#1d1c1b', spacing: .12 * k });
        c.restore();
      }, { ppm: 9, stock: STOCK });
      var page90 = tex.print(PW, PH, function (c, w, h, k) {
        dots(c, k, '#8f8979', .21 * k); gutter(c, w, h, k, false); dayLabel(c, k, 90);
        tex.text(c, 'تسعون يومًا. صرت منهم.', (PW - 5.6) * k, 202.4 * k, { font: F.ar, weight: 300, size: 2.7 * k, align: 'right', color: '#6d6758' });
      }, { ppm: 9, stock: STOCK });
      var pageAny = tex.print(PW, PH, function (c, w, h, k) { dots(c, k, '#958f7f', Math.max(.9, .22 * k)); }, { ppm: 4.5, stock: STOCK });
      var page90flip = page90.clone(); page90flip.wrapS = T.RepeatWrapping; page90flip.repeat.x = -1; page90flip.offset.x = 1; page90flip.needsUpdate = true;

      /* ----- black sprayed page edges: satin black with the leaves just visible as lines ----- */
      var edgeLines = tex.data(32, 512, function (c, w, h) {
        c.fillStyle = '#6a6a6a'; c.fillRect(0, 0, w, h); var r = WRK.rng(31), n = 45, s = h / n;
        for (var i = 0; i < n; i++) { var v = 150 + r() * 90 | 0; c.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; c.fillRect(0, i * s + 2.2, w, s - 3.4); }
      });
      edgeLines.repeat.set(.02, 1);
      var blockEdge = new T.MeshPhysicalMaterial({ color: 0x0e0e0f, roughness: .5, metalness: 0, bumpMap: edgeLines, bumpScale: .55, roughnessMap: edgeLines, sheen: .25, sheenRoughness: .5, sheenColor: new T.Color(0x34343a) });

      var topL = M.paper({ map: page1 }), topR = M.paper({ map: pageAny });
      function stackGeo(right) {
        var g = new T.ExtrudeGeometry(tab(PW, PH, 3, right), { depth: 1, bevelEnabled: false, curveSegments: 8 });
        g.rotateX(-PI / 2); g.translate(right ? PW / 2 : -PW / 2, 0, 0);
        var p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
        for (var i = 0; i < p.count; i++) if (Math.abs(n.getY(i)) > .9) uv.setXY(i, right ? p.getX(i) / PW : (p.getX(i) + PW) / PW, (PH / 2 - p.getZ(i)) / PH);
        return g;
      }

      /* ----- back cover (stays on the desk), its lining, the pocket, the ribbon ----- */
      var backG = new T.Group(), frontG = new T.Group(); group.add(backG); group.add(frontG);
      var paint = M.edge();
      var gb = G.plate(CW, CH, TC, 4, { shape: tab(CW, CH, 4, false), bevel: .35 }); gb.translate(-CW / 2, 0, 0);
      backG.add(mesh(gb, [M.leather({ repeatX: CW / 18, repeatY: CH / 18, bumpScale: .85 }), paint]));
      var lineB = G.plate(CW - .9, CH - .9, .08, 3.6, { shape: tab(CW - .9, CH - .9, 3.6, false), bevel: 0 }); lineB.translate(-CW / 2 + .1, 0, 0);
      backG.add(mesh(lineB, M.blackPaper({ color: 0x0f0f10, repeat: 12 }), { pos: [0, TC, 0], cast: false }));
      // pocket: 97 wide inside the cover, 120 tall from the foot, thumb cut at the top. Sized for the 205 x 95 card.
      var ps = new T.Shape(), xa = -97.7, xb = -.75, ya = -103.7, yb = 16, xm = (xa + xb) / 2, nr = 11;
      ps.moveTo(xa + 3.6, ya); ps.lineTo(xb, ya); ps.lineTo(xb, yb); ps.lineTo(xm + nr, yb); ps.absarc(xm, yb, nr, 0, PI, true);
      ps.lineTo(xa, yb); ps.lineTo(xa, ya + 3.6); ps.absarc(xa + 3.6, ya + 3.6, 3.6, PI, PI * 1.5, false);
      backG.add(mesh(G.plate(97, 120, .3, 0, { shape: ps, bevel: .06 }), M.softTouch({ color: 0x18181a, roughness: .78, repeat: 5 }), { pos: [0, TC + .08, 0] }));
      // ribbon marker: glued at the spine head, stored after the last page, tail out at the foot
      var satin = new T.MeshPhysicalMaterial({ color: 0x0c0c0d, roughness: .42, metalness: 0, sheen: 1, sheenRoughness: .35, sheenColor: new T.Color(0x55555c), side: T.DoubleSide,
        bumpMap: tex.noiseBump(2, 60, .8), bumpScale: .08 });
      var RY = TC + .46, RX = -34;
      var rin = new T.CatmullRomCurve3([new T.Vector3(-4, RY, -103.3), new T.Vector3(-10, RY, -50), new T.Vector3(-25, RY, 40), new T.Vector3(RX, RY, CH / 2 - .1)]);
      backG.add(mesh(G.ribbon(rin, 5, 40), satin, { cast: false }));
      var rtail = new T.CatmullRomCurve3([new T.Vector3(0, 0, -.2), new T.Vector3(-.05, -.02, .55), new T.Vector3(-.2, -.6, 1.5), new T.Vector3(-.5, -.97, 3.4), new T.Vector3(-1.4, -1, 12), new T.Vector3(-3.2, -1, 24)]);
      var tail = mesh(G.ribbon(rtail, 5, 48), satin); group.add(tail);
      var stackL = mesh(stackGeo(false), [topL, blockEdge]); stackL.position.y = TC + .09; backG.add(stackL);

      /* ----- front cover: name blind-debossed at the lower fore-edge corner, wordmark hidden on the lining ----- */
      var deb = tex.debossedLeather(CW, CH, function (c, w, h, k) {
        // this face is seen from outside, so the artwork is mirrored onto the plate's underside
        c.translate(w, 0); c.scale(-1, 1);
        var n = (ctx.personal && ctx.personal.name) || 'نورة العتيبي', ar = WRK.isArabic(n);
        tex.text(c, n, 9 * k, (CH - 11.5) * k, { font: ar ? F.ar : F.mark, weight: 400, size: (ar ? 5 : 4.6) * k, align: 'left', maxWidth: 62 * k, spacing: ar ? 0 : .35 * k });
      }, { ppm: 9.5, depth: .95, polish: .68, shoulder: 1.6, grainMm: 18 });
      var gf = G.plate(CW, CH, TC, 4, { shape: tab(CW, CH, 4, true), bevel: .35 }); gf.translate(CW / 2, 0, 0);
      frontG.add(mesh(gf, [M.leather({ bumpMap: deb.bumpMap, roughnessMap: deb.roughnessMap, roughness: .6, bumpScale: .85 }), paint]));
      var lin = tex.foil(CW - .9, CH - .9, function (c, w, h, k) { tex.text(c, 'wrk.', w / 2, h - 16 * k, { weight: 300, size: 6.4 * k }); }, { ppm: 6, base: '#101011', foil: '#202023', baseRough: .95, foilRough: .2 });
      var linMat = M.blackPaper({ repeat: 12 }); linMat.map = lin.map; linMat.roughnessMap = lin.roughnessMap; linMat.roughness = 1; linMat.color.set(0xffffff);
      var lineF = G.plate(CW - .9, CH - .9, .08, 3.6, { shape: tab(CW - .9, CH - .9, 3.6, true), bevel: 0 }); lineF.translate(CW / 2 - .1, 0, 0);
      frontG.add(mesh(lineF, linMat, { pos: [0, TC, 0], cast: false }));
      var stackR = mesh(stackGeo(true), [topR, blockEdge]); stackR.position.y = TC + .09; frontG.add(stackR);

      /* ----- the soft spine: a strip of leather that bends between the two covers ----- */
      var NH = 20, NPT = NH + 5, spx = new Float32Array(NPT), spy = new Float32Array(NPT), sdx = new Float32Array(NPT), sdy = new Float32Array(NPT);
      var sg = new T.BufferGeometry(), sPos = new Float32Array(NPT * 8 * 3), sNor = new Float32Array(NPT * 8 * 3), sUv = new Float32Array(NPT * 8 * 2);
      (function () {
        var io = [], ii = [], ic = [], i, a, b;
        for (i = 0; i < NPT - 1; i++) {
          a = i * 8; b = a + 8;
          io.push(a, b, a + 1, a + 1, b, b + 1);
          ii.push(a + 2, a + 3, b + 2, a + 3, b + 3, b + 2);
          ic.push(a + 4, a + 5, b + 4, a + 5, b + 5, b + 4, a + 6, b + 6, a + 7, a + 7, b + 6, b + 7);
        }
        for (i = 0; i < NPT; i++) { var v = i / (NPT - 1); for (var q = 0; q < 8; q++) { sUv[(i * 8 + q) * 2] = (q % 2) ? 1 : 0; sUv[(i * 8 + q) * 2 + 1] = v; } }
        sg.setIndex(io.concat(ii, ic)); sg.addGroup(0, io.length, 0); sg.addGroup(io.length, ii.length, 1); sg.addGroup(io.length + ii.length, ic.length, 2);
        sg.setAttribute('position', new T.BufferAttribute(sPos, 3)); sg.setAttribute('normal', new T.BufferAttribute(sNor, 3)); sg.setAttribute('uv', new T.BufferAttribute(sUv, 2));
      })();
      var spine = mesh(sg, [M.leather({ repeatX: CH / 18, repeatY: .6, bumpScale: .85 }), M.blackPaper({ color: 0x0c0c0d }), paint]); spine.frustumCulled = false; group.add(spine);
      function setSp(i, x, y, dx, dy) { var l = Math.sqrt(dx * dx + dy * dy) || 1; spx[i] = x; spy[i] = y; sdx[i] = dx / l; sdy[i] = dy / l; }
      function updateSpine(bx, by, d0x, d0y, fx, fy, d1x, d1y) {
        var m = 6, i, t, t2, t3;
        setSp(0, bx - d0x * 1.3, by - d0y * 1.3, d0x, d0y); setSp(1, bx - d0x * .65, by - d0y * .65, d0x, d0y);
        for (i = 0; i <= NH; i++) {
          t = i / NH; t2 = t * t; t3 = t2 * t;
          var h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
          var g00 = 6 * t2 - 6 * t, g10 = 3 * t2 - 4 * t + 1, g01 = -g00, g11 = 3 * t2 - 2 * t;
          setSp(i + 2, h00 * bx + h10 * m * d0x + h01 * fx + h11 * m * d1x, h00 * by + h10 * m * d0y + h01 * fy + h11 * m * d1y,
            g00 * bx + g10 * m * d0x + g01 * fx + g11 * m * d1x, g00 * by + g10 * m * d0y + g01 * fy + g11 * m * d1y);
        }
        setSp(NH + 3, fx + d1x * .65, fy + d1y * .65, d1x, d1y); setSp(NH + 4, fx + d1x * 1.3, fy + d1y * 1.3, d1x, d1y);
        var z = CH / 2;
        for (i = 0; i < NPT; i++) {
          var nx = -sdy[i], ny = sdx[i], ox = spx[i] - nx * .04, oy = spy[i] - ny * .04, ix = spx[i] + nx * RS, iy = spy[i] + ny * RS, o = i * 24;
          // outer z-, outer z+, inner z-, inner z+, cap(z-) outer, cap(z-) inner, cap(z+) outer, cap(z+) inner
          sPos[o] = ox; sPos[o + 1] = oy; sPos[o + 2] = -z; sNor[o] = -nx; sNor[o + 1] = -ny; sNor[o + 2] = 0;
          sPos[o + 3] = ox; sPos[o + 4] = oy; sPos[o + 5] = z; sNor[o + 3] = -nx; sNor[o + 4] = -ny; sNor[o + 5] = 0;
          sPos[o + 6] = ix; sPos[o + 7] = iy; sPos[o + 8] = -z; sNor[o + 6] = nx; sNor[o + 7] = ny; sNor[o + 8] = 0;
          sPos[o + 9] = ix; sPos[o + 10] = iy; sPos[o + 11] = z; sNor[o + 9] = nx; sNor[o + 10] = ny; sNor[o + 11] = 0;
          sPos[o + 12] = ox; sPos[o + 13] = oy; sPos[o + 14] = -z; sNor[o + 12] = 0; sNor[o + 13] = 0; sNor[o + 14] = -1;
          sPos[o + 15] = ix; sPos[o + 16] = iy; sPos[o + 17] = -z; sNor[o + 15] = 0; sNor[o + 16] = 0; sNor[o + 17] = -1;
          sPos[o + 18] = ox; sPos[o + 19] = oy; sPos[o + 20] = z; sNor[o + 18] = 0; sNor[o + 19] = 0; sNor[o + 20] = 1;
          sPos[o + 21] = ix; sPos[o + 22] = iy; sPos[o + 23] = z; sNor[o + 21] = 0; sNor[o + 22] = 0; sNor[o + 23] = 1;
        }
        sg.attributes.position.needsUpdate = true; sg.attributes.normal.needsUpdate = true;
      }

      /* ----- leaves in the air during the turn to page 90 ----- */
      var NL = 10, NS = 18, NZ = 4, D = .36, leaves = [], rnd = WRK.rng(19);
      var anyF = M.paper({ map: pageAny }), anyB = M.paper({ map: pageAny, side: T.BackSide });
      var firstF = M.paper({ map: page1 }), lastB = M.paper({ map: page90flip, side: T.BackSide });
      // paper lets some light through: the shaded side of a lifted leaf is never as dark as an opaque sheet
      [anyF, anyB, firstF, lastB].forEach(function (m) { m.emissive = new T.Color(0x2b2924); m.emissiveMap = m.map; });
      (function () {
        var idx = [], uv = new Float32Array((NS + 1) * (NZ + 1) * 2), j, k;
        for (j = 0; j <= NZ; j++) for (k = 0; k <= NS; k++) { var q = j * (NS + 1) + k; uv[q * 2] = 1 - k / NS; uv[q * 2 + 1] = 1 - j / NZ; }
        for (j = 0; j < NZ; j++) for (k = 0; k < NS; k++) { var a = j * (NS + 1) + k, b = a + 1, c = a + NS + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
        for (var i = 0; i < NL; i++) {
          var g = new T.BufferGeometry();
          g.setAttribute('position', new T.BufferAttribute(new Float32Array((NS + 1) * (NZ + 1) * 3), 3));
          g.setAttribute('normal', new T.BufferAttribute(new Float32Array((NS + 1) * (NZ + 1) * 3), 3));
          g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(idx);
          var f = mesh(g, i === 0 ? firstF : anyF), bk = mesh(g, i === NL - 1 ? lastB : anyB);
          f.frustumCulled = bk.frustumCulled = false; f.visible = bk.visible = false; group.add(f); group.add(bk);
          leaves.push({ g: g, f: f, b: bk, lag: .5 + rnd() * .32, tw: (rnd() - .5) * .5 });
        }
      })();
      function updateLeaf(L, b, top, aB, aF, dir) {
        var P = L.g.attributes.position.array, N = L.g.attributes.normal.array, base = lerp(PI + aB, -aF, b), sw = Math.sin(PI * b) * L.lag * dir, ds = PW / NS, hi = PI + aB, lo = -aF;
        for (var j = 0; j <= NZ; j++) {
          var zn = j / NZ * 2 - 1, x = XC, y = top + .05, amp = sw * (1 + L.tw * zn);
          for (var k = 0; k <= NS; k++) {
            var o = (j * (NS + 1) + k) * 3, a = clamp(base + amp * Math.pow(k / NS, 1.6), lo, hi);
            P[o] = x; P[o + 1] = y; P[o + 2] = zn * PH / 2; N[o] = Math.sin(a); N[o + 1] = -Math.cos(a); N[o + 2] = 0;
            a = clamp(base + amp * Math.pow((k + .5) / NS, 1.6), lo, hi); x += Math.cos(a) * ds; y += Math.sin(a) * ds;
          }
        }
        L.g.attributes.position.needsUpdate = true; L.g.attributes.normal.needsUpdate = true;
      }

      /* ----- pose: c = cover (0 closed, 1 open on page 1), t = pages (0 page 1, 1 page 90) ----- */
      var view = { radius: 116, target: [0, 4, 0], yaw: -.5, pitch: .74, footprint: [100, 210], tile: { yaw: -.5, pitch: .78 } };
      var se = 0, sb = 0;
      // the cover is carried over the top, falls the last part of the way and gives once when it lands
      function fall(k) { var a = clamp(k / .84, 0, 1), u = clamp((k - .84) / .16, 0, 1); se = a * a * (1.6 - .6 * a); sb = Math.sin(PI * u) * (1 - u) * .03; }
      function pose(c, t, closing, dir) {
        var fL = clamp(t / (1 - D), 0, 1), fR = clamp((t - D) / (1 - D), 0, 1), hL = HB * (1 - fL), hR = HB * fR, f = (fL + fR) / 2, dy = hL - hR;
        // whichever side holds fewer pages is the side whose cover leaves the desk at the spine
        var By = dy < 0 ? -dy : 0, FyO = dy > 0 ? dy : 0, e = 1.5 * Math.sin(PI * f), Bx = X0 - e, FxO = X0 + .6 + e;
        var aB = Math.asin(By / CW), aF = Math.asin(FyO / CW);
        fall(closing ? 1 - c : c);
        var prog = closing ? 1 - se : se, phi = lerp(PI, -aF, prog) + (closing ? -sb : sb);
        var Fx = lerp(X0, FxO, prog), Fy = lerp(TT, FyO, prog);
        backG.position.set(Bx, By, 0); backG.rotation.z = aB;
        frontG.position.set(Fx, Fy, 0); frontG.rotation.z = phi;
        stackL.visible = hL > .02; stackL.scale.y = Math.max(hL, .02); stackL.position.x = XC - .15 - Bx;
        stackR.visible = hR > .02; stackR.scale.y = Math.max(hR, .02); stackR.position.x = XC + .15 - FxO;
        topL.map = t <= 0 ? page1 : pageAny; topR.map = t >= 1 ? page90 : pageAny;
        var top = By + TC + .09 + hL;
        for (var i = 0; i < NL; i++) {
          var L = leaves[i], u = (t - i * (1 - D) / (NL - 1)) / D, on = u > 0 && u < 1;
          L.f.visible = L.b.visible = on;
          if (on) updateLeaf(L, .5 - .5 * Math.cos(PI * u), top, aB, aF, dir || 1);
        }
        updateSpine(Bx, By, Math.cos(aB), Math.sin(aB), Fx, Fy, Math.cos(phi), Math.sin(phi));
        var ca = Math.cos(aB), sa = Math.sin(aB), ty = By + RX * sa + RY * ca;
        tail.position.set(Bx + RX * ca - RY * sa, ty, CH / 2 - .1); tail.scale.y = Math.max(.3, ty - .14);
        var cs = prog * prog * (3 - 2 * prog);
        view.target[0] = lerp(0, 49, cs); view.target[1] = lerp(4, 3, cs); view.radius = lerp(116, 142, cs); view.footprint[0] = lerp(100, 200, cs);
      }

      var st = { c: 0, t: 0 }, seq = 0, lin01 = ctx.ease.linear;
      pose(0, 0, false, 1);
      function soft(k) { return .65 * k + .35 * ctx.ease.inOut(k); }
      function runCover(to) {
        var from = st.c; if (from === to) return Promise.resolve();
        return ctx.run(to ? 1750 : 1500, function (k) { st.c = lerp(from, to, k); pose(st.c, st.t, !to, 1); }, lin01, 'nb');
      }
      function runPages(to, ms) {
        var from = st.t; if (from === to) return Promise.resolve();
        return ctx.run(ms * Math.abs(to - from), function (k) { st.t = lerp(from, to, soft(k)); pose(st.c, st.t, false, to > from ? 1 : -1); }, lin01, 'nb');
      }
      function setState(id, on, animate) {
        if (id !== 'open' && id !== 'day90') return;
        var my = ++seq;
        if (animate === false) {
          if (id === 'open') { st.c = on ? 1 : 0; if (!on) st.t = 0; } else { if (on) st.c = 1; st.t = on ? 1 : 0; }
          pose(st.c, st.t, false, 1); ctx.invalidate(); return;
        }
        if (id === 'open') {
          if (on) { ctx.look(-.1, .96, 1500); return runCover(1); }
          ctx.look(view.yaw, view.pitch, 1500);
          return runPages(0, 1500).then(function () { if (my === seq) return runCover(0); });
        }
        if (on) {
          ctx.look(-.16, .92, 1300);
          return runCover(1).then(function () { if (my === seq) return runPages(1, 2700); });
        }
        if (st.c < 1) return;
        ctx.look(-.1, .96, 1300);
        return runPages(0, 2300);
      }
      function setPersonal(p) { ctx.personal = p; deb.repaint(); page1.repaint(); ctx.invalidate(); }

      return { group: group, view: view, setState: setState, setPersonal: setPersonal };
    }
  });
})();
