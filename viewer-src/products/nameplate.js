/* اسم — the desk nameplate. A triangular aluminium bar, 200 mm long, three faces.
   Geometry in mm, Y up, resting on y = 0 and centred on the origin. Long side along X.
   Section coordinates used below: a = Z (toward the visitor), b = Y, centroid at the origin of the bar group. */
(function () {
  var WRK = window.WRK;

  WRK.register({
    id: 'nameplate', order: 7,
    name: { ar: 'اسم', en: 'ism' },
    kind: { ar: 'لوحة الاسم', en: 'The nameplate' },
    price: 189,
    line: { ar: 'اسمك على مكتبك من أول يوم.', en: 'Your name on your desk from the first day.' },
    story: {
      ar: 'قطعة ألمنيوم مثلثة بثلاثة أوجه. وجه عليه الاسم بالعربية، ووجه بالحروف اللاتينية، والثالث فارغ. تجلس على وجهها الفارغ، فيقرأ الزائر اسمًا ويرى صاحب المكتب الآخر.',
      en: 'A triangular aluminium bar with three faces. One carries the name in Arabic, one in Latin letters, and the third is left blank. It sits on the blank face, so the visitor reads one name and the owner sees the other.'
    },
    specs: [
      [{ ar: 'المقاس', en: 'Size' }, { ar: 'طول 200 مم، ضلع 42 مم', en: '200 mm long, 42 mm per side' }],
      [{ ar: 'المادة', en: 'Material' }, { ar: 'ألمنيوم مبثوق', en: 'Extruded aluminium' }],
      [{ ar: 'السطح', en: 'Finish' }, { ar: 'أنودة سوداء مطفية', en: 'Matte black anodise' }],
      [{ ar: 'الاسم', en: 'Name' }, { ar: 'حفر ليزر بلون الألمنيوم', en: 'Laser engraved, bare aluminium' }],
      [{ ar: 'الأوجه', en: 'Faces' }, { ar: 'عربي، لاتيني، فارغ', en: 'Arabic, Latin, blank' }]
    ],
    personal: { ar: 'الاسم بالعربية على وجه، وبالحروف اللاتينية على الوجه الآخر', en: 'The name in Arabic on one face, in Latin letters on the other' },
    personalFields: ['name', 'latin'],
    actions: [{ id: 'roll', step: true, label: { ar: 'اقلبها', en: 'Roll' }, labelOn: { ar: 'اقلبها', en: 'Roll' } }],
    gallery: [
      { yaw: .42, pitch: .46, caption: { ar: 'الوجه العربي جهة الزائر', en: 'The Arabic face, toward the visitor' } },
      { yaw: .16, pitch: .5, target: [8, 15, 2], radius: 40, caption: { ar: 'الحروف محفورة حتى الألمنيوم', en: 'Letters engraved down to the aluminium' } },
      { yaw: Math.PI - .38, pitch: .44, caption: { ar: 'الوجه اللاتيني جهة صاحب المكتب', en: 'The Latin face, toward the owner' } },
      { states: ['roll'], yaw: .5, pitch: .52, target: [-18, 15, -33], caption: { ar: 'الوجه الثالث فارغ', en: 'The third face is blank' } }
    ],

    build: function (ctx) {
      var T = ctx.THREE, tex = ctx.tex, mesh = ctx.mesh, F = ctx.FONT;
      var group = new T.Group();

      /* ----- section: equilateral triangle, 42 mm per side to the sharp corners, R2 corners ----- */
      var LEN = 200, SIDE = 42, CR = 2, TAU = Math.PI * 2;
      var RIN = SIDE / (2 * Math.sqrt(3));          // 12.124, centroid to face
      var RHO = 2 * (RIN - CR);                     // 20.249, centroid to corner arc centre
      var HALF = RHO * Math.cos(Math.PI / 6);       // 17.535, half a flat
      var FLAT = 2 * HALF, ARC = CR * TAU / 3, STEP = FLAT + ARC, PERIM = 3 * STEP;   // 35.07, 4.19, 39.26, 117.78
      // perimeter walk: face A (front, Arabic) from the front-bottom corner up to the top edge, round the top,
      // face L (back, Latin) down to the back-bottom corner, round it, face B (bottom, blank) forward, round the front corner.
      var prof = [];
      (function () {
        var Fc = [HALF, -(RIN - CR)], Pc = [0, RHO], Kc = [-HALF, -(RIN - CR)], s = 0, SEG = 10;
        function flat(c0, c1, ang) { var n = [Math.cos(ang), Math.sin(ang)]; prof.push([c0[0] + n[0] * CR, c0[1] + n[1] * CR, n[0], n[1], s]); s += FLAT; prof.push([c1[0] + n[0] * CR, c1[1] + n[1] * CR, n[0], n[1], s]); }
        function arc(c, a0) { for (var i = 1; i < SEG; i++) { var a = a0 + (TAU / 3) * i / SEG; prof.push([c[0] + Math.cos(a) * CR, c[1] + Math.sin(a) * CR, Math.cos(a), Math.sin(a), s + ARC * i / SEG]); } s += ARC; }
        flat(Fc, Pc, Math.PI / 6); arc(Pc, Math.PI / 6);
        flat(Pc, Kc, Math.PI * 5 / 6); arc(Kc, Math.PI * 5 / 6);
        flat(Kc, Fc, Math.PI * 1.5); arc(Fc, Math.PI * 1.5);
        prof.push([prof[0][0], prof[0][1], prof[0][2], prof[0][3], PERIM]);
      })();
      var NP = prof.length;

      /* side wall through a list of rings [x, inset, nx]. UV: u along the length, v around the perimeter. */
      function wall(rings) {
        var pos = [], nor = [], uv = [], idx = [];
        rings.forEach(function (r) {
          var k = Math.sqrt(1 - r[2] * r[2]);
          for (var i = 0; i < NP; i++) { var p = prof[i]; pos.push(r[0], p[1] - p[3] * r[1], p[0] - p[2] * r[1]); nor.push(r[2], p[3] * k, p[2] * k); uv.push((r[0] + LEN / 2) / LEN, p[4] / PERIM); }
        });
        for (var j = 0; j < rings.length - 1; j++) for (var i = 0; i < NP - 1; i++) { var a = j * NP + i, b = a + NP; idx.push(a, b, a + 1, a + 1, b, b + 1); }
        var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
      }
      /* flat end face at x, facing dir (+1 / -1). UV maps a 42 x 35 mm window so text reads upright from outside. */
      var CW = 42, CH = 35, CB = -12.5;
      function endFace(x, inset, dir) {
        var pos = [x, 0, 0], nor = [dir, 0, 0], uv = [.5, (0 - CB) / CH], idx = [];
        for (var i = 0; i < NP; i++) { var p = prof[i], a = p[0] - p[2] * inset, b = p[1] - p[3] * inset; pos.push(x, b, a); nor.push(dir, 0, 0); uv.push(dir < 0 ? (a + CW / 2) / CW : (CW / 2 - a) / CW, (b - CB) / CH); }
        for (var j = 1; j < NP; j++) { if (dir > 0) idx.push(0, j + 1, j); else idx.push(0, j, j + 1); }
        var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
      }

      /* ----- the anodised skin: one wrap texture round all three faces, 10 px per mm ----- */
      var PPM = 10, AW = LEN * PPM, AH = Math.round(PERIM * PPM);
      var BLACK = '#252528', SILVER = '#dcdde0', ROUGH = .44, BASE_METAL = .12, MARK_ROUGH = .62, MARK_METAL = .5;
      function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
      function grey(v) { var g = Math.round(WRK.clamp(v, 0, 1) * 255); return 'rgb(' + g + ',' + g + ',' + g + ')'; }
      function orm(r, m) { return 'rgb(0,' + Math.round(r * 255) + ',' + Math.round(m * 255) + ')'; }
      function tint(mark, col, speck) {
        var t = canvas(mark.width, mark.height), c = t.getContext('2d'); c.drawImage(mark, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = col; c.fillRect(0, 0, t.width, t.height);
        if (speck) { c.globalCompositeOperation = 'source-atop'; c.globalAlpha = speck; c.fillStyle = c.createPattern(tex.noiseCanvas(256, 1, 4), 'repeat'); c.fillRect(0, 0, t.width, t.height); }
        return t;
      }
      // base layers, painted once: the blast is even, with the faintest memory of the extrusion direction under it
      var rnd = WRK.rng(31);
      var baseOrm = canvas(AW, AH), baseBump = canvas(AW, AH);
      (function () {
        var o = baseOrm.getContext('2d'), b = baseBump.getContext('2d'), v = 0;
        b.fillStyle = '#808080'; b.fillRect(0, 0, AW, AH);
        b.globalAlpha = .55; b.fillStyle = b.createPattern(tex.noiseCanvas(256, .5), 'repeat'); b.fillRect(0, 0, AW, AH); b.globalAlpha = 1;
        for (var y = 0; y < AH; y++) {
          v = v * .6 + (rnd() - .5) * .4;
          o.fillStyle = orm(ROUGH + v * .04, BASE_METAL); o.fillRect(0, y, AW, 1);
          b.fillStyle = v > 0 ? 'rgba(255,255,255,' + (v * .08) + ')' : 'rgba(0,0,0,' + (-v * .08) + ')'; b.fillRect(0, y, AW, 1);
        }
        o.globalCompositeOperation = 'lighter'; o.globalAlpha = .05; o.fillStyle = o.createPattern(tint(tex.noiseCanvas(256, 1, 6), '#00ff00'), 'repeat'); o.fillRect(0, 0, AW, AH);
      })();
      var mark = canvas(AW, AH);
      var skinMap = tex.color(AW, AH, function () {}), skinOrm = tex.data(AW, AH, function () {}), skinBump = tex.data(AW, AH, function () {});
      function sY(s) { return AH * (1 - s / PERIM); }
      function drawMarks(c, p) {
        var name = (p && p.name) || 'نورة العتيبي', latin = (p && p.latin) || 'Noura Alotaibi';
        // face A, Arabic, top toward the top edge
        var arA = WRK.isArabic(name);
        tex.text(c, name, AW / 2, sY(HALF) + (arA ? -.4 : .6) * PPM, { font: arA ? F.ar : F.mark, weight: 300, size: (arA ? 12.5 : 10.2) * PPM, spacing: arA ? 0 : .7 * PPM, maxWidth: 150 * PPM });
        // face L, Latin, top toward the same edge: turned half a turn in the wrap
        var arL = WRK.isArabic(latin);
        c.save(); c.translate(AW / 2, sY(STEP + HALF)); c.rotate(Math.PI);
        tex.text(c, latin, 0, (arL ? -.4 : .6) * PPM, { font: arL ? F.ar : F.mark, weight: 300, size: (arL ? 12.5 : 10.2) * PPM, spacing: arL ? 0 : .7 * PPM, maxWidth: 150 * PPM });
        c.restore();
        // face B, blank, with the one full stop
        c.beginPath(); c.arc(14 * PPM, sY(2 * STEP + HALF) + 3.6 * PPM, .7 * PPM, 0, TAU); c.fill();
      }
      function paintSkin() {
        var m = mark.getContext('2d'); m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, AW, AH); m.fillStyle = '#fff'; drawMarks(m, ctx.personal);
        tex.redraw(skinMap, function (c) { c.fillStyle = BLACK; c.fillRect(0, 0, AW, AH); c.drawImage(tint(mark, SILVER, .09), 0, 0); });
        tex.redraw(skinOrm, function (c) { c.drawImage(baseOrm, 0, 0); c.drawImage(tint(mark, orm(MARK_ROUGH, MARK_METAL)), 0, 0); });
        tex.redraw(skinBump, function (c) { c.drawImage(baseBump, 0, 0); c.filter = 'blur(.7px)'; c.globalAlpha = .85; c.drawImage(tint(mark, '#4c4c4c', .25), 0, 0); c.filter = 'none'; c.globalAlpha = 1; });
      }
      paintSkin();
      [skinMap, skinOrm, skinBump].forEach(function (t) { t.wrapS = T.ClampToEdgeWrapping; t.wrapT = T.RepeatWrapping; });
      function anodise(o) {
        return new T.MeshPhysicalMaterial(Object.assign({ color: 0xffffff, metalness: 1, roughness: 1, ior: 1.76, anisotropy: .3, bumpScale: .08, sheen: .6, sheenRoughness: .5, sheenColor: new T.Color(0x34343c) }, o));
      }
      var skin = anodise({ map: skinMap, roughnessMap: skinOrm, metalnessMap: skinOrm, bumpMap: skinBump });

      /* ----- end caps: date on one, wordmark on the other, 24 px per mm ----- */
      var CPPM = 24, cw = CW * CPPM, ch = CH * CPPM;
      function capTextures(draw) {
        var mk = canvas(cw, ch), map = tex.color(cw, ch, function () {}), o = tex.data(cw, ch, function () {});
        function paint() {
          var m = mk.getContext('2d'); m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, cw, ch); m.fillStyle = '#fff'; draw(m, cw / 2, ch * (1 - (-1 - CB) / CH), CPPM);
          tex.redraw(map, function (c) { c.fillStyle = BLACK; c.fillRect(0, 0, cw, ch); c.drawImage(tint(mk, SILVER, .08), 0, 0); });
          tex.redraw(o, function (c) { c.fillStyle = orm(ROUGH + .02, BASE_METAL); c.fillRect(0, 0, cw, ch); c.drawImage(tint(mk, orm(MARK_ROUGH, MARK_METAL)), 0, 0); });
        }
        paint(); map.wrapS = map.wrapT = o.wrapS = o.wrapT = T.ClampToEdgeWrapping;
        return { mat: anodise({ map: map, roughnessMap: o, metalnessMap: o, bumpMap: tex.noiseBump(5, 4, .5), bumpScale: .05, anisotropy: 0 }), repaint: paint };
      }
      var capDate = capTextures(function (c, x, y, k) { tex.text(c, WRK.formatDate(ctx.personal && ctx.personal.date, 'num'), x, y, { weight: 300, size: 2.2 * k, spacing: .28 * k }); });
      var capMark = capTextures(function (c, x, y, k) { tex.text(c, 'wrk.', x, y, { weight: 300, size: 3 * k }); });

      /* ----- the bar: body and two flush caps, a hairline seam between them ----- */
      var bar = new T.Group(); group.add(bar);
      var CAP = 3, GAP = .06, CH1 = .25, CH2 = .42, X = LEN / 2, S = Math.SQRT1_2;
      bar.add(mesh(wall([[-X + CAP + GAP, CH1, -S], [-X + CAP + GAP + CH1, 0, 0], [X - CAP - GAP - CH1, 0, 0], [X - CAP - GAP, CH1, S]]), skin));
      bar.add(mesh(wall([[-X, CH2, -S], [-X + CH2, 0, 0], [-X + CAP - CH1, 0, 0], [-X + CAP, CH1, S]]), skin));
      bar.add(mesh(wall([[X - CAP, CH1, -S], [X - CAP + CH1, 0, 0], [X - CH2, 0, 0], [X, CH2, S]]), skin));
      bar.add(mesh(endFace(-X, CH2, -1), capDate.mat));
      bar.add(mesh(endFace(X, CH2, 1), capMark.mat));
      // what is behind the seam: the plug of the cap, dark
      bar.add(mesh(wall([[-X + 1, CH1 + .04, 0], [X - 1, CH1 + .04, 0]]), new T.MeshStandardMaterial({ color: 0x050506, roughness: .9, metalness: 0 }), { cast: false }));

      /* ----- contact shadow that travels with the bar (the stage's own stays at the origin) ----- */
      var shadowTex = tex.color(256, 128, function (c) { c.filter = 'blur(9px)'; c.fillStyle = 'rgba(20,16,12,.62)'; c.fillRect(24, 44, 208, 40); });
      var shadow = new T.Mesh(new T.PlaneGeometry(LEN * 256 / 208, 36 * 128 / 40), new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: .5 }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = .06; shadow.renderOrder = -1; group.add(shadow);

      var view = { radius: 100, target: [0, 15, -6], yaw: .42, pitch: .46, footprint: [.01, .01], tile: { yaw: .42, pitch: .5 } };
      // the camera follows the bar a little when it rolls away. The turntable is the group's parent.
      function follow() {
        var yaw = group.parent ? group.parent.rotation.y : view.yaw, tz = -6 + bar.position.z * .8;
        var x = tz * Math.sin(yaw), z = tz * Math.cos(yaw);
        if (Math.abs(x - view.target[0]) < .02 && Math.abs(z - view.target[2]) < .02) return false;
        view.target[0] = x; view.target[2] = z; return true;
      }

      /* ----- rolling. q is the roll coordinate: whole numbers rest on a face, between them the bar pivots on a corner.
         The corner is a 2 mm radius, so the bar rolls on it without slipping while it tips. ----- */
      var qNow = 0, qGoal = 0;
      function pose(q) {
        var i = Math.floor(q + 1e-9), f = Math.max(0, q - i), th = f * TAU / 3, ang = Math.PI * 5 / 6 - th;
        bar.position.z = i * STEP + HALF + CR * th + RHO * Math.cos(ang);
        bar.position.y = CR + RHO * Math.sin(ang);
        bar.rotation.x = q * TAU / 3;
        shadow.position.z = bar.position.z;
        var lift = (bar.position.y - RIN) / (CR + RHO - RIN);
        shadow.material.opacity = .5 - .2 * lift; shadow.scale.y = 1 + .25 * lift;
        qNow = q;
      }
      // one tip over an edge: pushed up to the balance point, it hangs, falls on its own weight, lands and settles
      function tip(k) {
        var m = .8, t;
        if (k < m) {
          t = k / m;
          if (t < .56) { var u = t / .56; return .5 * (.88 * u * u * (3 - 2 * u) + .12 * u); }
          var w = (t - .56) / .44; return .5 + .5 * (.1 * w + .9 * Math.pow(w, 2.4));
        }
        t = (k - m) / (1 - m);
        if (t < .6) return 1 - .016 * Math.sin(Math.PI * t / .6);
        return 1 - .004 * Math.sin(Math.PI * (t - .6) / .4);
      }
      pose(0); follow();
      function setState(id, on, animate) {
        if (id !== 'roll') return;
        // each press is one roll over an edge: away onto the Latin face so the blank face comes up, then back
        qGoal = qGoal === 0 ? -1 : 0;
        var from = qNow, to = qGoal, d = Math.abs(to - from);
        if (animate === false || d < 1e-4) { pose(to); ctx.invalidate(); return; }
        var whole = d > .98;
        return ctx.run(whole ? 1350 : 500 + 700 * d, function (k) {
          var g = whole ? tip(k) : (k < .75 ? Math.pow(k / .75, 2) : 1 - .012 * Math.sin(Math.PI * (k - .75) / .25));
          pose(k >= 1 ? to : from + (to - from) * g);
        }, ctx.ease.linear, 'roll');
      }
      function setPersonal(p) { ctx.personal = p; paintSkin(); capDate.repaint(); ctx.invalidate(); }

      return { group: group, view: view, setState: setState, setPersonal: setPersonal, update: follow };
    }
  });
})();
