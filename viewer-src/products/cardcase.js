/* تعارف — the card case.
   A bifold business-card case in the line's black full-grain leather. Closed 102 x 68 x 9 mm.
   Spine on the right, so it opens the way an Arabic book opens: the cover lifts at the left edge and swings to the right.
   Geometry in mm, Y up. Closed, the case is centred on the origin. Each half is built in its own frame:
   x = 0 at the spine edge running outward, y = 0 at the middle of the 2 mm shell, +y is the inside face. */
(function () {
  var WRK = window.WRK;

  WRK.register({
    id: 'cardcase', order: 5,
    name: { ar: 'تعارف', en: 'ta’aruf' },
    kind: { ar: 'حافظة البطاقات', en: 'The card case' },
    price: 139,
    line: { ar: 'جيب لبطاقاتك، وجيب لبطاقات من تتعرّف عليهم.', en: 'One pocket for your cards, one for the cards of the people you meet.' },
    story: {
      ar: 'حافظة من الجلد الأسود تُفتح مثل الكتاب العربي، من اليسار إلى اليمين. بداخلها جيبان يتسعان لمقاسَي البطاقات المستخدمة في السعودية. اسمه مضغوط في الزاوية من الخارج، بلا لون.',
      en: 'A black leather case that opens like an Arabic book, from left to right. Inside are two pockets that take both card sizes used in Saudi Arabia. Their name is pressed into the outside corner, with no colour.'
    },
    specs: [
      [{ ar: 'المقاس', en: 'Size' }, { ar: '102 × 68 × 9 مم وهي مغلقة', en: '102 × 68 × 9 mm closed' }],
      [{ ar: 'الجلد', en: 'Leather' }, { ar: 'جلد طبيعي أسود، حواف مصبوغة باليد', en: 'Black full-grain leather, hand-painted edges' }],
      [{ ar: 'الداخل', en: 'Inside' }, { ar: 'جيبان، وبطانة من جلد ناعم', en: 'Two pockets, smooth leather lining' }],
      [{ ar: 'البطاقات', en: 'Cards' }, { ar: '90 × 50 و 85 × 55 مم، نحو 20 بطاقة', en: '90 × 50 and 85 × 55 mm, about 20 cards' }],
      [{ ar: 'الإغلاق', en: 'Closure' }, { ar: 'بثنية الجلد نفسها، بلا مغناطيس', en: 'The fold of the leather itself, no magnet' }],
      [{ ar: 'الاسم', en: 'Name' }, { ar: 'ضغط حراري بلا لون', en: 'Heat-pressed, no colour' }]
    ],
    personal: { ar: 'يُضغط في الزاوية السفلية من الخارج، بلا لون', en: 'Pressed into the lower outside corner, no colour' },
    personalFields: ['name'],
    actions: [
      { id: 'open', label: { ar: 'افتح', en: 'Open' }, labelOn: { ar: 'أغلق', en: 'Close' } },
      { id: 'draw', label: { ar: 'اسحب بطاقة', en: 'Draw a card' }, labelOn: { ar: 'أعد البطاقة', en: 'Put it back' } }
    ],
    gallery: [
      { states: [], yaw: -.3, pitch: .62, zoom: 1, caption: { ar: 'مغلقة. الثنية على اليمين.', en: 'Closed. The fold is on the right.' } },
      { states: [], yaw: -.16, pitch: .5, target: [-27, 8, 30], radius: 26, caption: { ar: 'الاسم مضغوط في الجلد، يظهر مع الضوء.', en: 'The name is pressed into the leather and shows with the light.' } },
      { states: ['open'], yaw: -.12, pitch: .98, target: [0, 3, 0], radius: 100, caption: { ar: 'مفتوحة. جيب لما تعطي، وجيب لما تأخذ.', en: 'Open. One pocket for what you give, one for what you take.' } },
      { states: ['open', 'draw'], yaw: -.34, pitch: .66, target: [44, 4, -12], radius: 58, caption: { ar: 'خياطة دقيقة، وحافة الجيب مكوية.', en: 'Fine stitching and a creased pocket edge.' } }
    ],

    build: function (ctx) {
      var T = ctx.THREE, M = ctx.mats, G = ctx.geo, tex = ctx.tex, mesh = ctx.mesh, F = ctx.FONT;
      var clamp = WRK.clamp, lerp = WRK.lerp;
      function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

      /* ----- dimensions ----- */
      var PW = 97.5, PH = 68, HZ = PH / 2;       // one panel
      var SH = 2;                                 // shell: 1.5 outer + 0.5 lining
      var SP = 11;                                // spine length along the fold
      var XS = 46.5;                              // world x of the base panel's spine edge when closed
      var ZM = -6;                                // pocket mouth line
      var PT = 1;                                 // pocket leather
      var ST = 2.5;                               // stitch line inset
      var CW = 90, CH = 50, CT = .5;              // the first card
      var PHI_OPEN = .052;                        // the cover rests about 3 degrees off flat on the leather's memory
      var SHIFT = 52;                             // open, the pair is re-centred on the paper

      var group = new T.Group(), body = new T.Group(); group.add(body);
      var base = new T.Group(); base.position.set(XS, 1, 0); body.add(base);
      var cover = new T.Group(); body.add(cover);

      /* ----- stitch path, in canonical panel coords (c = distance from the spine edge, z) ----- */
      var stitchLoop = (function () {
        var a = ST, b = PW - ST, t = -HZ + ST, bt = HZ - ST, r = 2.5, p = new T.Path();
        p.moveTo(a, t); p.lineTo(b - r, t); p.absarc(b - r, t + r, r, -Math.PI / 2, 0, false);
        p.lineTo(b, bt - r); p.absarc(b - r, bt - r, r, 0, Math.PI / 2, false);
        p.lineTo(a, bt); p.lineTo(a, t);
        var len = 2 * (b - a) + 2 * (bt - t) - 8 * r + 2 * Math.PI * r;
        var pts = p.getSpacedPoints(Math.round(len / 2.7)); pts.pop();
        return pts.map(function (q) { return [q.x, q.y]; });
      })();
      function strokeLoop(c, k, toX, toY) {
        c.save(); c.globalAlpha = .55; c.lineWidth = .55 * k; c.lineJoin = 'round'; c.beginPath();
        stitchLoop.forEach(function (q, i) { var x = toX(q[0]), y = toY(q[1]); if (i) c.lineTo(x, y); else c.moveTo(x, y); });
        c.closePath(); c.stroke(); c.restore();
      }

      /* ----- shapes and small builders ----- */
      function halfShape(w, h, r, sg) {
        var e = .25, rR = sg > 0 ? r : e, rL = sg > 0 ? e : r, s = new T.Shape(), x = -w / 2, y = -h / 2;
        s.moveTo(x + rL, y); s.lineTo(x + w - rR, y); s.absarc(x + w - rR, y + rR, rR, -Math.PI / 2, 0, false);
        s.lineTo(x + w, y + h - rR); s.absarc(x + w - rR, y + h - rR, rR, 0, Math.PI / 2, false);
        s.lineTo(x + rL, y + h); s.absarc(x + rL, y + h - rL, rL, Math.PI / 2, Math.PI, false);
        s.lineTo(x, y + rL); s.absarc(x + rL, y + rL, rL, Math.PI, Math.PI * 1.5, false);
        return s;
      }
      var edgeMat = M.edge();
      var threadMat = new T.MeshPhysicalMaterial({ color: 0x29292b, roughness: .55, metalness: 0, sheen: .5, sheenRoughness: .5, sheenColor: new T.Color(0x55555a) });
      var stitchGeo = new T.CapsuleGeometry(.26, 1.5, 3, 8); stitchGeo.rotateZ(Math.PI / 2); stitchGeo.scale(1, .7, 1);

      /* ----- textures ----- */
      function nameOf() { return (ctx.personal && ctx.personal.name) || 'نورة العتيبي'; }
      // outside of the front cover. Seen from above when closed this face is mirrored in x, so the name is drawn flipped.
      var outTex = tex.debossedLeather(PW, PH, function (c, w, h, k) {
        strokeLoop(c, k, function (x) { return x * k; }, function (z) { return (z + HZ) * k; });
        var n = nameOf();
        c.save(); c.translate((PW - 7) * k, (HZ + HZ - 8) * k); c.scale(-1, 1);
        tex.text(c, n, 0, 0, { font: WRK.isArabic(n) ? F.ar : F.mark, weight: 400, size: (WRK.isArabic(n) ? 3.5 : 3.3) * k, align: 'left', maxWidth: 46 * k, spacing: .12 * k });
        c.restore();
      }, { ppm: 12, depth: .95, polish: .68, shoulder: 1.4 });
      var outerCoverMat = M.leather({ bumpMap: outTex.bumpMap, roughnessMap: outTex.roughnessMap, bumpScale: .8 });
      var outerBaseMat = M.leather({ repeatX: PW / 26, repeatY: PH / 26, bumpScale: .8 });

      function liningTex(sg, word, mark) {
        var toX = function (cx) { return (sg > 0 ? cx : PW - cx); };
        return tex.debossedLeather(PW, PH, function (c, w, h, k) {
          strokeLoop(c, k, function (x) { return toX(x) * k; }, function (z) { return (z + HZ) * k; });
          // the word under the lip, turned to read from the mouth
          c.save(); c.translate(toX(PW / 2) * k, (ZM + 3.1 + HZ) * k); c.rotate(Math.PI);
          tex.text(c, word, 0, 0, { font: F.ar, weight: 400, size: 3 * k }); c.restore();
          if (mark) tex.text(c, 'wrk.', toX(PW / 2) * k, 7.4 * k, { weight: 300, size: 3.6 * k });
        }, { ppm: 14, grainMm: 10, depth: .9, polish: .55, shoulder: 1.2 });
      }
      function liningMat(t) { return M.leather({ color: 0x101011, bumpMap: t.bumpMap, roughnessMap: t.roughnessMap, roughness: .47, bumpScale: .5 }); }

      function pocketTex(sg) {
        var toX = function (cx) { return (sg > 0 ? cx : PW - cx); };
        return tex.debossedLeather(PW, HZ - ZM, function (c, w, h, k) {
          strokeLoop(c, k, function (x) { return toX(x) * k; }, function (z) { return (z - ZM) * k; });
          c.fillRect(3 * k, 1.25 * k, w - 6 * k, .32 * k);   // the creased line along the mouth
        }, { ppm: 12, depth: .8, polish: .5 });
      }

      /* ----- one half: shell, lining, pocket, stitches ----- */
      function buildHalf(g, sg, o) {
        var cxm = sg * PW / 2;
        var outer = mesh(G.plate(PW, PH, 1.5, 0, { shape: halfShape(PW, PH, 5, sg), bevel: .4 }), [o.outer, edgeMat], { pos: [0, -1, 0] });
        outer.geometry.translate(cxm, 0, 0); g.add(outer);
        var lin = mesh(G.plate(PW - .2, PH - .2, .5, 0, { shape: halfShape(PW - .2, PH - .2, 4.9, sg), bevel: .15 }), [o.lining, edgeMat], { pos: [0, .5, 0], cast: false });
        lin.geometry.translate(cxm, 0, 0); g.add(lin);
        var pk = buildPocket(sg, o.gap, o.soft, o.pocketMat); pk.mesh.position.y = 1.005; g.add(pk.mesh);
        // stitches, both faces
        var n = stitchLoop.length, list = [];
        for (var i = 0; i < n; i++) {
          var a = stitchLoop[i], b = stitchLoop[(i + 1) % n];
          var x = sg * (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2, ang = Math.atan2(b[1] - a[1], sg * (b[0] - a[0]));
          list.push([x, -1.03, z, ang]);
          if (z < ZM - 1.2) list.push([x, 1.03, z, ang]); else if (z > ZM + 1.5) list.push([x, 1.03 + PT, z, ang]);
        }
        var im = new T.InstancedMesh(stitchGeo, threadMat, list.length), d = new T.Object3D();
        list.forEach(function (s, j) { d.position.set(s[0], s[1], s[2]); d.rotation.set(0, -s[3] + .2, 0); d.updateMatrix(); im.setMatrixAt(j, d.matrix); });
        im.castShadow = false; im.receiveShadow = true; g.add(im);
        return pk;
      }

      /* A pocket panel as a deformable slab: stitched flat on three sides, lifted over the cards, mouth standing a little open. */
      function buildPocket(sg, gap, soft, topMat) {
        var IN = .12, cs = [IN, 1.4, 2.9, 3.7, 4.6], zs = [];
        var nU = 46, u0 = 6, u1 = PW - 6;
        for (var i = 0; i <= nU; i++) cs.push(u0 + (u1 - u0) * i / nU);
        cs.push(PW - 4.6, PW - 3.7, PW - 2.9, PW - 1.4, PW - IN);
        [0, .7, 1.5, 2.6, 4, 5.6, 7.5, 10, 13, 16, 19, 22, 25, 28, 31, 33, 34.6].forEach(function (d) { zs.push(ZM + d); });
        zs.push(HZ - 4.6, HZ - 3.7, HZ - 2.9, HZ - 1.4, HZ - IN);
        if (sg < 0) cs.reverse();
        var nx = cs.length, nz = zs.length, D = HZ - ZM, rc = 5 - IN, ccx = PW - 5, ccz = HZ - 5;
        var P = [], UV = [], BY = [], GA = [], BW = [], idx = [];
        function vert(i, j, top) {
          var c = cs[i], z = zs[j];
          if (c > ccx && z > ccz) { var dx = c - ccx, dz = z - ccz, dl = Math.sqrt(dx * dx + dz * dz); if (dl > rc) { c = ccx + dx / dl * rc; z = ccz + dz / dl * rc; } }
          var dF = PW - c, dS = c, dB = HZ - z, hi = soft ? 7 : 3.7;
          var pinch = sstep(2.9, hi, dF) * sstep(2.9, hi, dS) * sstep(2.9, hi, dB);
          var arch = Math.pow(Math.sin(Math.PI * clamp((c - 2.9) / (PW - 5.8), 0, 1)), .75);
          P.push(sg * c, 0, z); UV.push(sg > 0 ? c / PW : 1 - c / PW, 1 - (z - ZM) / D);
          BY.push(top ? PT : 0); GA.push(gap * pinch); BW.push(arch * Math.exp(-(z - ZM) / 6.5));
          return P.length / 3 - 1;
        }
        var top = [], bot = [], i, j;
        for (j = 0; j < nz; j++) for (i = 0; i < nx; i++) top.push(vert(i, j, true));
        for (j = 0; j < nz; j++) for (i = 0; i < nx; i++) bot.push(vert(i, j, false));
        var g = new T.BufferGeometry();
        for (j = 0; j < nz - 1; j++) for (i = 0; i < nx - 1; i++) { var a = top[j * nx + i], b = top[j * nx + i + 1], c2 = top[(j + 1) * nx + i], d = top[(j + 1) * nx + i + 1]; idx.push(a, c2, b, b, c2, d); }
        var nTop = idx.length; g.addGroup(0, nTop, 0);
        for (j = 0; j < nz - 1; j++) for (i = 0; i < nx - 1; i++) { var a2 = bot[j * nx + i], b2 = bot[j * nx + i + 1], c3 = bot[(j + 1) * nx + i], d2 = bot[(j + 1) * nx + i + 1]; idx.push(a2, b2, c3, b2, d2, c3); }
        g.addGroup(nTop, idx.length - nTop, 1);
        var ring = []; for (i = 0; i < nx; i++) ring.push([i, 0]); for (j = 1; j < nz; j++) ring.push([nx - 1, j]); for (i = nx - 2; i >= 0; i--) ring.push([i, nz - 1]); for (j = nz - 2; j > 0; j--) ring.push([0, j]);
        var rt = ring.map(function (q) { return vert(q[0], q[1], true); }), rb = ring.map(function (q) { return vert(q[0], q[1], false); });
        var nSide = idx.length;
        for (i = 0; i < ring.length; i++) { var k2 = (i + 1) % ring.length; idx.push(rt[i], rt[k2], rb[i], rt[k2], rb[k2], rb[i]); }
        g.addGroup(nSide, idx.length - nSide, 2);
        var pos = new T.Float32BufferAttribute(P, 3); pos.setUsage(T.DynamicDrawUsage);
        g.setAttribute('position', pos); g.setAttribute('uv', new T.Float32BufferAttribute(UV, 2)); g.setIndex(idx);
        var under = M.suede({ repeat: 5 }); under.side = T.DoubleSide;
        var lip = M.edge(); lip.side = T.DoubleSide;
        var m = mesh(g, [topMat, under, lip]);
        function setBow(bow) { for (var v = 0; v < BY.length; v++) pos.setY(v, BY[v] + GA[v] + bow * BW[v]); pos.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere(); }
        return { mesh: m, setBow: setBow };
      }

      var linL = liningTex(-1, 'إليك', true), linR = liningTex(1, 'منك', false);
      var pkTL = pocketTex(-1), pkTR = pocketTex(1);
      function pocketMat(t) { return M.leather({ bumpMap: t.bumpMap, roughnessMap: t.roughnessMap, bumpScale: .8 }); }
      // left panel (stays on the paper): the receiving side, empty. right panel (the cover): the giving side, with the first card.
      var pkRecv = buildHalf(base, -1, { outer: outerBaseMat, lining: liningMat(linL), pocketMat: pocketMat(pkTL), gap: .14, soft: true });
      var pkGive = buildHalf(cover, 1, { outer: outerCoverMat, lining: liningMat(linR), pocketMat: pocketMat(pkTR), gap: .64, soft: false });

      /* ----- the first card: cotton, black painted edge, their name ----- */
      var cardTex = tex.print(CW - .5, CH - .5, function (c, w, h, k) {
        var n = nameOf();
        tex.text(c, 'wrk.', 6 * k, 6.6 * k, { weight: 300, size: 3.9 * k, align: 'left', color: '#3b3a38' });
        tex.text(c, n, w / 2, 23.5 * k, { font: WRK.isArabic(n) ? F.ar : F.mark, weight: 300, size: 5.6 * k, color: '#161616', maxWidth: w - 16 * k });
      }, { ppm: 12 });
      var card = new T.Group(), cardZ0 = HZ - 3.85 - CH / 2; card.position.set(PW / 2, 1.02, cardZ0); cover.add(card);
      var cardEdge = M.matteBlack({ color: 0x0c0c0d, roughness: .5 });
      card.add(mesh(G.plate(CW, CH, CT, .5, { bevel: .06 }), [M.cotton(), cardEdge]));
      card.add(ctx.decal(CW - .5, CH - .5, M.cotton({ map: cardTex }), { pos: [0, CT + .012, 0] }));

      /* ----- the spine: one strip of constant length that bends as the cover turns ----- */
      var NS = 22, sPos = new Float32Array((NS + 1) * 8 * 3), sUV = [], sIdx = [], ZE = HZ - .25;
      (function () {
        var i, n1 = (NS + 1) * 2;
        for (i = 0; i <= NS; i++) { var s = SP * i / NS; sUV.push(s / 26, 0, s / 26, 2 * ZE / 26); }
        for (i = 0; i <= NS; i++) { var s2 = SP * i / NS; sUV.push(s2 / 10, 0, s2 / 10, 2 * ZE / 10); }
        for (i = 0; i <= NS; i++) sUV.push(0, 0, 0, 1); for (i = 0; i <= NS; i++) sUV.push(0, 0, 0, 1);
        function quads(off) { for (var q = 0; q < NS; q++) { var a = off + q * 2; sIdx.push(a, a + 2, a + 1, a + 2, a + 3, a + 1); } }
        quads(0); quads(n1); quads(n1 * 2); quads(n1 * 3);
      })();
      var sGeo = new T.BufferGeometry(), sAttr = new T.BufferAttribute(sPos, 3); sAttr.setUsage(T.DynamicDrawUsage);
      sGeo.setAttribute('position', sAttr); sGeo.setAttribute('uv', new T.Float32BufferAttribute(sUV, 2)); sGeo.setIndex(sIdx);
      var per = NS * 6; sGeo.addGroup(0, per, 0); sGeo.addGroup(per, per, 1); sGeo.addGroup(per * 2, per * 2, 2);
      var spOut = M.leather({ repeatX: 1, repeatY: 1, bumpScale: .8 }); spOut.side = T.DoubleSide;
      var spIn = M.leather({ color: 0x101011, repeatX: 1, repeatY: 1, roughness: .47, bumpScale: .7 }); spIn.side = T.DoubleSide;
      var spEdge = M.edge(); spEdge.side = T.DoubleSide;
      body.add(mesh(sGeo, [spOut, spIn, spEdge]));
      function bendSpine(phi) {
        var n1 = (NS + 1) * 2 * 3;
        for (var i = 0; i <= NS; i++) {
          var th = phi * i / NS, s = SP * i / NS, mx, my;
          if (phi < 1e-4) { mx = XS + s; my = 1; } else { var R = SP / phi; mx = XS + R * Math.sin(th); my = 1 + R * (1 - Math.cos(th)); }
          var nx = -Math.sin(th), ny = Math.cos(th);
          var ox = mx - nx * .98, oy = my - ny * .98, ix = mx + nx * .72, iy = my + ny * .72, o = i * 6;
          sPos[o] = ox; sPos[o + 1] = oy; sPos[o + 2] = -ZE; sPos[o + 3] = ox; sPos[o + 4] = oy; sPos[o + 5] = ZE;
          sPos[n1 + o] = ix; sPos[n1 + o + 1] = iy; sPos[n1 + o + 2] = -ZE; sPos[n1 + o + 3] = ix; sPos[n1 + o + 4] = iy; sPos[n1 + o + 5] = ZE;
          sPos[2 * n1 + o] = ox; sPos[2 * n1 + o + 1] = oy; sPos[2 * n1 + o + 2] = -ZE; sPos[2 * n1 + o + 3] = ix; sPos[2 * n1 + o + 4] = iy; sPos[2 * n1 + o + 5] = -ZE;
          sPos[3 * n1 + o] = ox; sPos[3 * n1 + o + 1] = oy; sPos[3 * n1 + o + 2] = ZE; sPos[3 * n1 + o + 3] = ix; sPos[3 * n1 + o + 4] = iy; sPos[3 * n1 + o + 5] = ZE;
        }
        sAttr.needsUpdate = true; sGeo.computeVertexNormals(); sGeo.computeBoundingSphere();
      }

      var view = { radius: 58, target: [0, 4.5, 0], yaw: -.3, pitch: .62, footprint: [102, 68], tile: { yaw: -.3, pitch: .66 } };

      /* ----- pose ----- */
      var openK = 0, drawK = 0, isOpen = false, isDrawn = false;
      function pose() {
        var phi = lerp(Math.PI, PHI_OPEN, openK), R = SP / phi, o = clamp(openK, 0, 1);
        cover.position.set(XS + R * Math.sin(phi), 1 + R * (1 - Math.cos(phi)), 0); cover.rotation.z = phi;
        bendSpine(phi);
        pkRecv.setBow(lerp(.15, 1.6, o)); pkGive.setBow(lerp(.12, 1.0, o));
        card.position.z = cardZ0 - 24 * drawK;
        var e = sstep(0, 1, o); body.position.x = -SHIFT * e;
        view.footprint[0] = lerp(102, 190, e); view.target[1] = lerp(4.5, 3, e);
      }
      pose();

      function setState(id, on, animate) {
        if (id === 'open') {
          isOpen = !!on; var f = openK, t = on ? 1 : 0;
          if (animate === false) { openK = t; pose(); ctx.invalidate(); return; }
          ctx.look(on ? -.12 : -.3, on ? .98 : .62, on ? 1250 : 1500, on ? 1.72 : 1);
          // lifted slowly at the free edge, falls open past upright, presses flat, then relaxes to where the fold holds it
          return ctx.run(on ? 1900 : 1600, function (k) {
            var m = on ? ctx.ease.inOut(clamp(k / .8, 0, 1)) : ctx.ease.inOut(k);
            var press = on ? .012 * Math.sin(Math.PI * clamp((k - .74) / .26, 0, 1)) : 0;
            openK = f + (t - f) * m + press; pose();
          }, ctx.ease.linear, 'cover');
        }
        if (id === 'draw') {
          isDrawn = !!on; var f2 = drawK, t2 = on ? 1 : 0;
          if (animate === false) { drawK = t2; pose(); ctx.invalidate(); return; }
          return ctx.run(on ? 1000 : 850, function (k) { drawK = f2 + (t2 - f2) * k; pose(); }, on ? ctx.ease.out : ctx.ease.inOut, 'card');
        }
      }
      function setPersonal(p) { ctx.personal = p; outTex.repaint(); cardTex.repaint(); ctx.invalidate(); }

      return { group: group, view: view, setState: setState, setPersonal: setPersonal };
    }
  });
})();
