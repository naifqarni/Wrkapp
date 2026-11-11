/* هويّة — the badge holder and lanyard.
   A flat lay: the holder lies face up on the paper, the lanyard set down beside it in a loose curl.
   Geometry in mm, Y up. Holder-local axes: X across (62), Z along (98, the strap slot at -Z), Y through the leather.
   The card loads from the long side at +X. */
(function () {
  var WRK = window.WRK;

  /* scene layout: the holder sits right of centre, the lanyard curls up and to the left */
  var OX = 66, OZ = 48, YAW = -.18;
  function at(x, y, z, yaw) { var c = Math.cos(yaw), s = Math.sin(yaw); x += OX; z += OZ; return [x * c + z * s, y, -x * s + z * c]; }

  WRK.register({
    id: 'badge', order: 1,
    name: { ar: 'هويّة', en: 'huwiyya' },
    kind: { ar: 'البطاقة والحبل', en: 'The badge and lanyard' },
    price: 129,
    line: { ar: 'اسمه على صدره من أول يوم.', en: 'Their name, worn from the first day.' },
    story: {
      ar: 'حافظة بطاقة من جلد أسود وحبل منسوج. بداخلها بطاقة اليوم الأول باسمه وتاريخ مباشرته، يلبسها إلى أن تصدر بطاقته الرسمية. بعدها تدخل بطاقة العمل مكانها، والحافظة تبقى معه.',
      en: 'A black leather badge holder on a woven lanyard. Inside is a day-one card with their name and start date, worn until the company issues the real ID. Then the work ID takes its place, and the holder stays with them.'
    },
    specs: [
      [{ ar: 'المقاس', en: 'Size' }, { ar: '62 × 98 × 5 مم', en: '62 × 98 × 5 mm' }],
      [{ ar: 'الحافظة', en: 'Holder' }, { ar: 'جلد طبيعي أسود، حواف مدهونة، خياطة كاملة', en: 'Black full-grain leather, painted edges, stitched all round' }],
      [{ ar: 'البطاقة', en: 'Card' }, { ar: 'تناسب بطاقة العمل القياسية 54 × 86 مم', en: 'Fits a standard 54 × 86 mm work ID' }],
      [{ ar: 'الحبل', en: 'Lanyard' }, { ar: 'شريط منسوج 12 مم، طوله 90 سم، بمشبك دوّار', en: '12 mm woven strap, 90 cm, swivel hook' }],
      [{ ar: 'الأمان', en: 'Safety' }, { ar: 'قفل مغناطيسي خلف الرقبة ينفصل عند الشد', en: 'Magnetic clasp at the nape that releases under a pull' }],
      [{ ar: 'الاسم', en: 'Name' }, { ar: 'على بطاقة اليوم الأول، ومضغوط على ظهر الجلد', en: 'On the day-one card, and pressed into the leather back' }]
    ],
    personal: { ar: 'الاسم وتاريخ أول يوم على البطاقة، والاسم على ظهر الحافظة', en: 'Name and first work day on the card, name on the back of the holder' },
    personalFields: ['name', 'date'],
    actions: [
      { id: 'card', label: { ar: 'اسحب البطاقة', en: 'Slide the card out' }, labelOn: { ar: 'أعد البطاقة', en: 'Slide it back' } },
      { id: 'flip', label: { ar: 'اقلب الحافظة', en: 'Turn it over' }, labelOn: { ar: 'أعدها على وجهها', en: 'Turn it back' } }
    ],
    gallery: [
      { yaw: YAW, pitch: 1.0, zoom: 1, caption: { ar: 'الحافظة والحبل كما تصل', en: 'The holder and lanyard as they arrive' } },
      { yaw: -.22, pitch: 1.06, target: at(0, 4, 2, -.22), radius: 60, caption: { ar: 'بطاقة اليوم الأول باسمه', en: 'The day-one card in their name' } },
      { states: ['card'], yaw: -.34, pitch: .8, target: at(16, 4, 4, -.34), radius: 62, caption: { ar: 'بطاقة حقيقية في جيب حقيقي', en: 'A real card in a real pocket' } },
      { yaw: .42, pitch: .62, target: at(-9, 4, -62, .42), radius: 40, caption: { ar: 'مشبك دوّار ولسان من الجلد نفسه', en: 'Swivel hook and a tab of the same leather' } }
    ],

    build: function (ctx) {
      var T = ctx.THREE, M = ctx.mats, G = ctx.geo, tex = ctx.tex, mesh = ctx.mesh, F = ctx.FONT;
      var clamp = WRK.clamp, lerp = WRK.lerp;
      function smooth(k) { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); }
      var group = new T.Group(), root = new T.Group(); root.position.set(OX, 0, OZ); group.add(root);

      /* ================= the holder ================= */
      var W = 62, H = 98, R = 6, TH = 4.7;
      var L0 = -12;                                   // the lip of the hidden pocket
      var SLOT = { z: -43.1, w: 14, h: 3.4 };
      var WIN = { z: 3, w: 48, h: 72, r: 4 };
      var NOTCH = { z: -26, r: 6.5 };
      var CARD = { x: -.4, z: 2.4, w: 54, h: 85.6, t: .8 };
      var A1 = .0152, A2 = .0235;                     // the hook wire passes under the top edge and props it up a little

      function outline(notch) {
        var pts = [], hw = W / 2, hh = H / 2, i, a;
        function arc(cx, cy, a0) { for (i = 0; i <= 10; i++) { a = a0 + i / 10 * Math.PI / 2; pts.push(new T.Vector2(cx + Math.cos(a) * R, cy + Math.sin(a) * R)); } }
        arc(hw - R, -hh + R, -Math.PI / 2);
        if (notch) for (i = 0; i <= 18; i++) { a = i / 18 * Math.PI; pts.push(new T.Vector2(hw - Math.sin(a) * notch.r, -notch.z - Math.cos(a) * notch.r)); }
        arc(hw - R, hh - R, 0); arc(-hw + R, hh - R, Math.PI / 2); arc(-hw + R, -hh + R, Math.PI);
        return pts;
      }
      // keep the part of a polygon where nx*x + ny*y <= c   (shape y is -z)
      function clip(pts, nx, ny, c) {
        var out = [], n = pts.length;
        for (var i = 0; i < n; i++) {
          var a = pts[i], b = pts[(i + 1) % n], da = nx * a.x + ny * a.y - c, db = nx * b.x + ny * b.y - c;
          if (da <= 0) out.push(a.clone());
          if ((da < 0 && db > 0) || (da > 0 && db < 0)) { var k = da / (da - db); out.push(new T.Vector2(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k)); }
        }
        return out;
      }
      function hole(cx, cz, w, h, r) { var p = new T.Path(), s = G.roundedRectShape(w, h, r); p.setFromPoints(s.getPoints(8).map(function (q) { return new T.Vector2(q.x + cx, q.y - cz); })); return p; }
      function slotHole() { return hole(0, SLOT.z, SLOT.w, SLOT.h, SLOT.h / 2); }
      function layer(pts, y, thick, bevel, mat, holes) {
        var g = G.plate(W, H, thick, 0, { shape: new T.Shape(pts), holes: holes || null, bevel: bevel, curveSegments: 10, bevelSegments: 2 });
        return mesh(g, mat, { pos: [0, y, 0] });
      }

      /* textures: everything pressed into the leather is in the bump, nothing is printed */
      var PPM = 10;
      function cx(x, k) { return (x + W / 2) * k; }
      function cz(z, k) { return (z + H / 2) * k; }
      function rr(c, k, x0, z0, w, h, r) {
        var x = cx(x0 - w / 2, k), y = cz(z0 - h / 2, k); w *= k; h *= k; r *= k;
        c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
      }
      function groove(c, k) { c.save(); c.globalAlpha = .6; c.lineWidth = .8 * k; rr(c, k, 0, 0, W - 5.2, H - 5.2, R - 2.6); c.stroke(); c.restore(); }
      // text on the underside reads through a mirror, so it is drawn mirrored
      function backText(c, str, x, z, k, o) { c.save(); c.translate(cx(x, k), cz(z, k)); c.scale(-1, 1); tex.text(c, str, 0, 0, o); c.restore(); }

      var frameTex = tex.debossedLeather(W, H, function (c, w, h, k) {
        groove(c, k);
        c.save(); c.globalAlpha = .5; c.lineWidth = .4 * k; rr(c, k, 0, WIN.z, WIN.w + 2.8, WIN.h + 2.8, WIN.r + 1.4); c.stroke(); c.restore();
        tex.text(c, 'wrk.', cx(0, k), cz(42, k), { weight: 400, size: 4.6 * k });
      }, { ppm: PPM, depth: 1, polish: .7 });
      var backTex = tex.debossedLeather(W, H, function (c, w, h, k) {
        var p = ctx.personal || {}, n = p.name || 'نورة العتيبي';
        groove(c, k);
        backText(c, n, 0, -25, k, { font: WRK.isArabic(n) ? F.ar : F.mark, weight: 400, size: 4.5 * k, maxWidth: 36 * k });
        backText(c, WRK.formatDate(p.date, 'num'), 0, L0 + 3.2, k, { weight: 400, size: 2.4 * k, spacing: .25 * k });   // hidden under the lip
      }, { ppm: 12, depth: 1, polish: .7 });
      var pocketTex = tex.debossedLeather(W, H, function (c, w, h, k) {
        groove(c, k);
        backText(c, 'wrk.', 0, 40, k, { weight: 400, size: 4.6 * k });
      }, { ppm: PPM, depth: 1, polish: .7 });
      function leatherOf(t, scale) { return M.leather({ bumpMap: t.bumpMap, roughnessMap: t.roughnessMap, bumpScale: scale || 1 }); }
      var edge = M.edge();

      var holderG = new T.Group(), restG = new T.Group(), flipG = new T.Group(), body = new T.Group();
      root.add(holderG); holderG.add(restG); restG.add(flipG); flipG.add(body); body.position.y = -TH / 2;

      // hidden pocket piece (outermost on the back), y 0 .. 0.7
      body.add(layer(clip(outline(), 0, 1, -L0), 0, .7, .16, [leatherOf(pocketTex), edge]));
      // the note that travels inside it, one corner showing past the lip
      var note = mesh(G.plate(40, 52, .08, .4, { bevel: 0 }), M.paper({ color: 0xf1eee6 }), { pos: [-1, .71, 14.2], cast: false });
      note.rotation.y = -.3; body.add(note);
      // back panel, y 0.8 .. 1.7, and its lining (the floor of the card pocket)
      body.add(layer(outline(NOTCH), .8, .9, .16, [leatherOf(backTex), edge], [slotHole()]));
      body.add(layer(outline(NOTCH), 1.7, .3, 0, [M.suede({ repeat: 5 }), edge], [slotHole()]));
      // filler: closed on the left, top and bottom, open on the right
      var inner = clip(outline(), -1, 0, 27.6);
      body.add(layer(clip(outline(), 1, 0, -27.6), 2, 1, 0, edge));
      body.add(layer(clip(inner, 0, -1, -40.6), 2, 1, 0, edge, [slotHole()]));
      body.add(layer(clip(inner, 0, 1, -45.4), 2, 1, 0, edge));
      // the day-one card
      var cardTex = tex.print(CARD.w, CARD.h, function (c, w, h, k) {
        var p = ctx.personal || {}, n = p.name || 'نورة العتيبي', ar = WRK.isArabic(n), mid = (CARD.w / 2 - CARD.x) * k;
        tex.text(c, 'wrk.', 8.2 * k, 15 * k, { weight: 300, size: 4.8 * k, align: 'left', color: '#474747' });
        tex.text(c, n, mid, 40 * k, { font: ar ? F.ar : F.mark, weight: ar ? 300 : 400, size: (ar ? 7.4 : 6.6) * k, color: '#141414', maxWidth: 41 * k });
        tex.text(c, WRK.formatDate(p.date, ar ? 'ar' : 'en'), mid, 50.2 * k, { font: ar ? F.ar : F.mark, weight: 300, size: 2.9 * k, color: '#6a6964', maxWidth: 41 * k });
        c.fillStyle = '#c2bfb8'; c.fillRect(mid - 4 * k, 67.6 * k, 8 * k, .3 * k);
        tex.text(c, ar ? 'اليوم الأول' : 'Day one', mid, 72.6 * k, { font: ar ? F.ar : F.mark, weight: 300, size: 2.6 * k, color: '#8a8883', spacing: .08 * k });
      }, { ppm: 14 });
      var card = new T.Group(); card.position.set(CARD.x, 2.02, CARD.z); body.add(card);
      card.add(mesh(G.plate(CARD.w, CARD.h, CARD.t, 3.18, { bevel: .1 }), M.cotton({ repeat: 4 })));
      var faceG = new T.ShapeGeometry(G.roundedRectShape(CARD.w - .16, CARD.h - .16, 3.1), 10), fp = faceG.attributes.position, fu = faceG.attributes.uv;
      for (var fi = 0; fi < fp.count; fi++) fu.setXY(fi, fp.getX(fi) / CARD.w + .5, fp.getY(fi) / CARD.h + .5);
      faceG.rotateX(-Math.PI / 2);
      var face = new T.Mesh(faceG, M.cotton({ map: cardTex, repeat: 4 })); face.material.emissive.set(0xffffff); face.material.emissiveMap = cardTex; face.material.emissiveIntensity = .13; face.position.y = CARD.t + .012; face.receiveShadow = true; card.add(face);
      // window film, then the frame
      var film = mesh(G.plate(WIN.w - .2, WIN.h - .2, .2, WIN.r, { bevel: 0 }), M.film(), { pos: [0, 3.06, WIN.z], cast: false }); film.renderOrder = 2; body.add(film);
      body.add(layer(outline(), 3, 1.7, .42, [leatherOf(frameTex), edge], [hole(0, WIN.z, WIN.w, WIN.h, WIN.r), slotHole()]));

      /* stitches: one instanced thread segment, slightly sunk in its groove */
      var thread = new T.MeshPhysicalMaterial({ color: 0x1b1b1e, roughness: .6, metalness: 0, sheen: .5, sheenRoughness: .5, sheenColor: new T.Color(0x55555c) });
      function stitchRow(list, parent, yOf, slant) {
        var g = new T.CapsuleGeometry(.27, 1.65, 2, 6); g.rotateZ(Math.PI / 2);
        var im = new T.InstancedMesh(g, thread, list.length), d = new T.Object3D();
        list.forEach(function (s, i) { d.position.set(s.x, yOf(s), s.z); d.rotation.set(0, s.ang + slant, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
        im.castShadow = false; im.receiveShadow = true; parent.add(im); return im;
      }
      function loopStitches(w, h, r, pitch, ox, oz) {
        var sh = G.roundedRectShape(w, h, r), n = Math.round(sh.getLength() / pitch), pts = sh.getSpacedPoints(n), out = [];
        for (var i = 0; i < n; i++) { var a = pts[i], b = pts[i + 1]; out.push({ x: (a.x + b.x) / 2 + (ox || 0), z: -(a.y + b.y) / 2 + (oz || 0), ang: Math.atan2(b.y - a.y, b.x - a.x) }); }
        return out;
      }
      var seam = loopStitches(W - 5.2, H - 5.2, R - 2.6, 2.8);
      stitchRow(seam, body, function () { return TH + .04; }, .2);
      stitchRow(seam.filter(function (s) { var dx = s.x - W / 2, dz = s.z - NOTCH.z; return dx * dx + dz * dz > 68; }), body, function (s) { return s.z > L0 ? -.04 : .76; }, -.2);

      /* ================= hook, swivel and leather tab ================= */
      var metal = M.gunmetal(), metalSoft = M.gunmetal({ roughness: .42 });
      var CHX = -.469, CHZ = -.883, LC = 55.4, AXY = 4.3;         // chain direction from the slot, its length, the swivel axis height
      var FX = CHX * LC, FZ = SLOT.z + CHZ * LC;                  // where the strap leaves the tab
      var chainG = new T.Group(), pitchG = new T.Group(); chainG.position.set(FX, 0, FZ); chainG.rotation.y = Math.atan2(-CHX, -CHZ); root.add(chainG); chainG.add(pitchG);
      // tab: one strip folded over the eye, strap ends inside
      var tabLeather = M.leather({ repeatX: .6, repeatY: 1, bumpScale: .9 });
      pitchG.add(mesh(G.plate(14, 22.5, 1.2, 1.4, { bevel: .3 }), [tabLeather, edge], { pos: [0, 0, 11.25] }));
      pitchG.add(mesh(G.plate(14, 22.5, 1.2, 1.4, { bevel: .3 }), [tabLeather, edge], { pos: [0, 4.2, 11.25] }));
      var foldG = new T.CylinderGeometry(2.7, 2.7, 14, 20, 1, false, -Math.PI / 2 + Math.PI / 2, Math.PI); foldG.rotateZ(Math.PI / 2);
      pitchG.add(mesh(foldG, tabLeather, { pos: [0, 2.7, 21.6] }));
      pitchG.add(mesh(new T.BoxGeometry(12, 3, 21), M.matteBlack({ color: 0x0c0c0d, roughness: .95 }), { pos: [0, 2.7, 10.6] }));
      stitchRow(loopStitches(9.4, 12, .6, 2.6, 0, 9.5), pitchG, function () { return 5.44; }, .2);
      // eye: a flat rectangular ring the tab passes through
      function ringCurve(w, l, r, n) { var pts = G.roundedRectShape(w, l, r).getSpacedPoints(n).slice(0, n).map(function (p) { return new T.Vector3(p.x, 0, p.y); }); return new T.CatmullRomCurve3(pts, true, 'centripetal'); }
      var eye = mesh(new T.TubeGeometry(ringCurve(15.6, 9.2, 2.2, 28), 84, 1, 8, true), metal, { pos: [0, 3.5, 26.6] }); eye.rotation.x = -.175; pitchG.add(eye);
      // swivel
      var ball = mesh(new T.SphereGeometry(2.5, 20, 14), metal, { pos: [0, AXY, 31.6] }); ball.scale.set(1.05, .92, .8); pitchG.add(ball);
      var barrel = mesh(G.lathe([[0, 0], [2.3, 0], [2.7, .4], [2.7, 3.2], [3.15, 3.5], [3.15, 4.4], [2.6, 4.7], [0, 4.7]], 28), metalSoft, { pos: [0, AXY, 32.7] }); barrel.rotation.x = Math.PI / 2; pitchG.add(barrel);
      // the snap hook turns on the swivel
      var hookSpin = new T.Group(); hookSpin.position.set(0, AXY, 0); pitchG.add(hookSpin);
      var hook = new T.Group(); hook.rotation.z = .995; hookSpin.add(hook);
      var HW = 3.8, HZ0 = 38.2, HZ1 = LC + .4;
      (function () {
        var pts = [], i, a;
        for (i = 0; i <= 8; i++) { a = i / 8 * Math.PI; pts.push(new T.Vector3(-HW * Math.cos(a), 0, HZ1 - HW + HW * Math.sin(a))); }
        pts.push(new T.Vector3(HW, 0, (HZ0 + HZ1) / 2 + 3), new T.Vector3(HW, 0, (HZ0 + HZ1) / 2 - 3));
        for (i = 0; i <= 8; i++) { a = i / 8 * Math.PI; pts.push(new T.Vector3(HW * Math.cos(a), 0, HZ0 + HW - HW * Math.sin(a))); }
        pts.push(new T.Vector3(-HW, 0, (HZ0 + HZ1) / 2 - 3), new T.Vector3(-HW, 0, (HZ0 + HZ1) / 2 + 3));
        hook.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true, 'centripetal'), 96, 1.1, 10, true), metal));
        var neck = mesh(new T.CylinderGeometry(2.1, 2.5, 3.2, 20), metalSoft, { pos: [0, 0, HZ0 - .2] }); neck.rotation.x = Math.PI / 2; hook.add(neck);
        // the spring gate: a sleeve on one side and its thumb catch
        var gate = mesh(new T.CylinderGeometry(1.5, 1.5, 6.4, 16), metalSoft, { pos: [HW, 0, 45.5] }); gate.rotation.x = Math.PI / 2; hook.add(gate);
        hook.add(mesh(G.roundedBox(2.4, 1.5, 2.8, .5, 1), metalSoft, { pos: [HW + 1.7, 0, 44.6] }));
      })();

      /* ================= the lanyard ================= */
      var STRAP_W = 12, STRAP_T = 1.5, LOOP = 900, CAP = 10, BASE = STRAP_T / 2 + .03;
      // the doubled strap follows this path, both strands side by side, and turns back on edge at the far end
      var pairPts = [[FX, FZ], [-35.4, -109.7], [-50, -124], [-76, -131], [-106, -126], [-131, -108], [-148, -81], [-150, -50], [-137, -21], [-111, -4], [-84, -1], [-62, -12], [-52, -34], [-56, -58], [-72, -76], [-93, -80], [-110, -71], [-119, -55], [-120, -38]];
      var pair = new T.CatmullRomCurve3(pairPts.map(function (p) { return new T.Vector3(p[0], 0, p[1]); }), false, 'centripetal'); pair.arcLengthDivisions = 800;
      var pairLen = pair.getLength();
      function strandCurve(len) {
        var n = Math.round(len / 11), A = [], B = [], C = new T.Vector3(), t = new T.Vector3(), i, cap = [];
        for (i = 0; i <= n; i++) {
          var u = len * i / n, k = u / pairLen; pair.getPointAt(k, C); pair.getTangentAt(k, t);
          var open = smooth(u / 58), end = smooth((u - (len - 34)) / 34);
          var wa = lerp(8.5 * open * (1 + .11 * Math.sin(u / 43 + 1.2)), CAP, end), wb = lerp(8.5 * open * (1 + .12 * Math.sin(u / 57 + 4)), CAP, end);
          A.push(new T.Vector3(C.x + t.z * wa, 0, C.z - t.x * wa)); B.push(new T.Vector3(C.x - t.z * wb, 0, C.z + t.x * wb));
          if (i === n) for (var j = 1; j < 6; j++) { var a = j / 6 * Math.PI; cap.push(new T.Vector3(C.x + Math.cos(a) * t.z * CAP + Math.sin(a) * t.x * CAP, 0, C.z - Math.cos(a) * t.x * CAP + Math.sin(a) * t.z * CAP)); }
        }
        var c = new T.CatmullRomCurve3(A.concat(cap, B.reverse()), false, 'centripetal'); c.arcLengthDivisions = 1200; c.apex = cap[2]; return c;
      }
      var lo = 300, hi = pairLen - 2, strand;
      for (var it = 0; it < 14; it++) { var mid = (lo + hi) / 2; strand = strandCurve(mid); if (strand.getLength() > LOOP) hi = mid; else lo = mid; }
      var SL = strand.getLength(), NS = 540, sp = strand.getSpacedPoints(NS), ds = SL / NS;
      var apexI = 0, best = 1e9, i, j;
      for (i = 0; i <= NS; i++) { var dd = sp[i].distanceToSquared(strand.apex); if (dd < best) { best = dd; apexI = i; } }
      var sApex = apexI * ds, sMid = SL / 2;
      var turn = (sp[apexI].x - sp[apexI - 6].x) * (sp[apexI + 6].z - sp[apexI].z) - (sp[apexI].z - sp[apexI - 6].z) * (sp[apexI + 6].x - sp[apexI].x);   // > 0 turns right
      var rollOf = function (s) { return (turn > 0 ? -1 : 1) * 1.36 * smooth(1 - Math.abs(s - sApex) / 44); };
      // heights: out of the tab, over the other strand where they overlap, into the clasp
      var lift = new Float32Array(NS + 1), tmp = new Float32Array(NS + 1);
      for (i = 0; i <= NS; i++) {
        var s = i * ds, v = 1.2 * (1 - smooth(s / 30));
        if (Math.abs(rollOf(s)) < .15) for (j = 0; j < i; j++) {
          if (s - j * ds < 45) break;
          var dx = sp[i].x - sp[j].x, dz = sp[i].z - sp[j].z, d2 = dx * dx + dz * dz;
          if (d2 < 210) { var ov = smooth((14.5 - Math.sqrt(d2)) / 3.5); v = Math.max(v, ov * (lift[j] + STRAP_T + .05)); }
        }
        lift[i] = v;
      }
      for (var pass = 0; pass < 2; pass++) { for (i = 0; i <= NS; i++) tmp[i] = (lift[Math.max(0, i - 1)] + 2 * lift[i] + lift[Math.min(NS, i + 1)]) / 4; lift.set(tmp); }
      (function () {
        var NV = 10, pos = new Float32Array((NS + 1) * NV * 3), nor = new Float32Array((NS + 1) * NV * 3), uv = new Float32Array((NS + 1) * NV * 2), idx = [];
        var t = new T.Vector3(), h = new T.Vector3(), n0 = new T.Vector3(), side = new T.Vector3(), nrm = new T.Vector3(), c = new T.Vector3(), up = new T.Vector3(0, 1, 0);
        var neg = new T.Vector3(), negS = new T.Vector3(), nl = new T.Vector3(), nr = new T.Vector3(), o, q;
        function put(sx, ny, n, u, vv) { pos[o] = c.x + side.x * sx + nrm.x * ny; pos[o + 1] = c.y + side.y * sx + nrm.y * ny; pos[o + 2] = c.z + side.z * sx + nrm.z * ny; nor[o] = n.x; nor[o + 1] = n.y; nor[o + 2] = n.z; uv[q] = u; uv[q + 1] = vv; o += 3; q += 2; }
        var hw = STRAP_W / 2, ht = STRAP_T / 2, sel = 1.3, drop = .24;
        for (i = 0; i <= NS; i++) {
          var s = i * ds, r = rollOf(s), a = sp[Math.max(0, i - 1)], b = sp[Math.min(NS, i + 1)];
          var clasp = 2.45 * (1 - smooth((Math.abs(s - sMid) - 12) / 22));
          t.set(b.x - a.x, 0, b.z - a.z).normalize(); h.crossVectors(t, up).normalize(); n0.crossVectors(h, t).normalize();
          side.copy(h).multiplyScalar(Math.cos(r)).addScaledVector(n0, Math.sin(r)); nrm.copy(n0).multiplyScalar(Math.cos(r)).addScaledVector(h, -Math.sin(r));
          c.set(sp[i].x, BASE * Math.abs(Math.cos(r)) + (hw + .05) * Math.abs(Math.sin(r)) + lift[i] + clasp, sp[i].z);
          neg.copy(nrm).negate(); negS.copy(side).negate();
          nl.copy(nrm).multiplyScalar(.78).addScaledVector(side, -.62); nr.copy(nrm).multiplyScalar(.78).addScaledVector(side, .62);
          var vv = s / SL; o = i * NV * 3; q = i * NV * 2;
          // a woven strap is slightly crowned: the selvedges roll over and catch the light
          put(-hw, ht - drop, nl, 0, vv); put(-hw + sel, ht, nrm, .11, vv); put(hw - sel, ht, nrm, .89, vv); put(hw, ht - drop, nr, 1, vv);
          put(-hw, -ht, neg, 0, vv); put(hw, -ht, neg, 1, vv);
          put(-hw, ht - drop, negS, .02, vv); put(-hw, -ht, negS, .1, vv); put(hw, ht - drop, side, .98, vv); put(hw, -ht, side, .9, vv);
          if (i < NS) { var e = i * NV, f = e + NV;
            for (j = 0; j < 3; j++) idx.push(e + j, e + j + 1, f + j, e + j + 1, f + j + 1, f + j);   // top
            idx.push(e + 4, f + 4, e + 5, e + 5, f + 4, f + 5);                                     // underside
            idx.push(e + 6, f + 6, e + 7, f + 6, f + 7, e + 7);                                     // left edge
            idx.push(e + 8, e + 9, f + 8, e + 9, f + 9, f + 8); }                                   // right edge
        }
        var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(idx);
        var wm = M.webbing({ color: 0x1a1a1c, repeatX: 2, repeatY: Math.round(SL / 6) }); wm.side = T.FrontSide; wm.bumpScale = .7; wm.roughness = .82; wm.sheen = .8;
        root.add(mesh(g, wm));
      })();
      // magnetic breakaway at the nape: two keyed halves
      (function () {
        var m = Math.round(sMid / ds), p = sp[m], a = sp[m - 4], b = sp[m + 4], g = new T.Group();
        g.position.set(p.x, lift[m], p.z); g.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); root.add(g);
        var shell = M.blackMetal({ roughness: .5, repeat: 3 });
        g.add(mesh(G.roundedBox(14, 6.5, 13.3, 1.5, 2), shell, { pos: [0, 3.25, -6.8] }));
        g.add(mesh(G.roundedBox(14, 6.5, 13.3, 1.5, 2), shell, { pos: [0, 3.25, 6.8] }));
        g.add(mesh(new T.BoxGeometry(12.4, 4.9, 1.2), M.gunmetal({ roughness: .5 }), { pos: [0, 3.25, 0], cast: false }));
      })();

      /* ================= view and states ================= */
      var HOME = [0, 3, 0], NEAR = at(6, 3, -4, YAW);
      var view = { radius: 108, target: HOME.slice(), yaw: YAW, pitch: 1.0, pitchMin: .22, pitchMax: 1.5, footprint: [.01, .01], tile: { yaw: YAW, pitch: 1.0 } };

      var st = { card: 0, flip: 0, focus: 0 };
      function poseCard(k) { card.position.x = CARD.x + 25 * k; }
      function poseFlip(k) {
        var phi = Math.PI * k, sn = Math.sin(phi), up = W / 2 * sn + TH / 2 * (Math.abs(Math.cos(phi)) - 1) + 5 * sn;
        var a = lerp(A1, A2, k);
        restG.rotation.x = a; restG.position.y = H / 2 * Math.sin(a);
        flipG.rotation.z = phi; flipG.position.y = TH / 2 + up;
        // the hook rides up with the slot: the tab pivots on the paper where the strap leaves it, and the holder swings in a little
        var hyp = Math.sqrt(AXY * AXY + LC * LC), th = Math.asin(clamp((AXY + up) / hyp, -1, 1)) - Math.atan2(AXY, LC);
        pitchG.rotation.x = -th; hookSpin.rotation.z = phi;
        var pull = LC - (LC * Math.cos(th) - AXY * Math.sin(th));
        holderG.position.set(CHX * pull, 0, CHZ * pull);
      }
      function poseFocus(k) { for (var q = 0; q < 3; q++) view.target[q] = lerp(HOME[q], NEAR[q], k); }
      poseCard(0); poseFlip(0);
      function focus(animate, ms) {
        var to = (st.card || st.flip) ? 1 : 0, from = st.focus; if (to === from) return; st.focus = to;
        if (animate === false) { poseFocus(to); return; }
        ctx.look(YAW, to ? 1.08 : 1.0, ms, to ? .66 : 1);
        ctx.run(ms, function (k) { poseFocus(from + (to - from) * k); }, ctx.ease.inOut, 'focus');
      }
      function setState(id, on, animate) {
        var to = on ? 1 : 0, from;
        if (id === 'card') {
          from = st.card; st.card = to;
          if (animate === false) { poseCard(to); focus(false); ctx.invalidate(); return; }
          focus(true, 1000);
          // a card in a snug pocket: it lets go slowly and stops on the fingers
          return ctx.run(on ? 1150 : 950, function (k) { poseCard(from + (to - from) * k); }, on ? ctx.ease.inOut : ctx.ease.out, 'card');
        }
        if (id === 'flip') {
          from = st.flip; st.flip = to;
          if (animate === false) { poseFlip(to); focus(false); ctx.invalidate(); return; }
          focus(true, 1300);
          return ctx.run(1900, function (k) { poseFlip(from + (to - from) * k); }, ctx.ease.inOut, 'flip');
        }
      }
      function setPersonal(p) { ctx.personal = p; cardTex.repaint(); backTex.repaint(); ctx.invalidate(); }

      return { group: group, view: view, setState: setState, setPersonal: setPersonal };
    }
  });
})();
