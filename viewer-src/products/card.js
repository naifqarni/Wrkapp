/* كلمة — the message card. 205 x 95 mm cotton card, letterpress black, in a black ungummed envelope.
   Geometry in mm, Y up, resting on y = 0. Long side along X. The envelope mouth faces away from the viewer (-Z). */
(function () {
  var WRK = window.WRK;

  WRK.register({
    id: 'card', order: 4,
    name: { ar: 'كلمة', en: 'kalima' },
    kind: { ar: 'بطاقة الرسالة', en: 'The message card' },
    price: 39,
    line: { ar: 'كلمة منك، تبقى معه.', en: 'A word from you, to keep.' },
    story: {
      ar: 'بطاقة قطنية سميكة، اسمه وكلمتك مضغوطة فيها بالحبر الأسود. تحتها سطر فارغ، لو حبّيت تكتب شيئًا بخط يدك. تأتي في ظرف أسود.',
      en: 'A thick cotton card with their name and your words pressed into it in black ink. Below them is an empty line, in case you want to add something by hand. It comes in a black envelope.'
    },
    specs: [
      [{ ar: 'المقاس', en: 'Size' }, { ar: '205 × 95 مم', en: '205 × 95 mm' }],
      [{ ar: 'الورق', en: 'Paper' }, { ar: 'قطن 600 غرام، غير مصقول', en: '600 gsm cotton, uncoated' }],
      [{ ar: 'الطباعة', en: 'Print' }, { ar: 'ضغط بالحبر الأسود، لون واحد', en: 'Letterpress, one colour, black' }],
      [{ ar: 'رسالتك', en: 'Your message' }, { ar: 'حتى 60 حرفًا', en: 'Up to 60 characters' }],
      [{ ar: 'الظرف', en: 'Envelope' }, { ar: 'ورق أسود غير مصقول، 212 × 101 مم', en: 'Black uncoated paper, 212 × 101 mm' }]
    ],
    personal: { ar: 'الاسم في أول البطاقة', en: 'The name opens the card' },
    personalFields: ['name', 'date'],
    actions: [
      { id: 'out', label: { ar: 'أخرج البطاقة', en: 'Take the card out' }, labelOn: { ar: 'أعدها للظرف', en: 'Put it back' } },
      { id: 'flip', label: { ar: 'اقلب البطاقة', en: 'Turn it over' }, labelOn: { ar: 'أعدها على وجهها', en: 'Turn it back' } }
    ],
    gallery: [
      { states: [], yaw: -.32, pitch: .8, caption: { ar: 'البطاقة في ظرفها', en: 'The card in its envelope' } },
      { states: [], yaw: -.2, pitch: .62, target: [46, 1, -40], radius: 42, caption: { ar: 'الاسم مضغوط في القطن', en: 'The name, pressed into the cotton' } },
      { states: ['out'], yaw: -.3, pitch: .86, caption: { ar: 'البطاقة والظرف', en: 'Card and envelope' } },
      { states: ['out'], yaw: .34, pitch: .5, target: [-58, 1, 128], radius: 40, caption: { ar: 'سطر فارغ لخط يدك', en: 'An empty line for your handwriting' } }
    ],

    build: function (ctx) {
      var T = ctx.THREE, M = ctx.mats, G = ctx.geo, tex = ctx.tex, mesh = ctx.mesh, F = ctx.FONT, E = ctx.ease;
      var clamp = WRK.clamp, lerp = WRK.lerp;
      var group = new T.Group();

      var CW = 205, CH = 95, tC = .85;           // card
      var EW = 212, EH = 101, tP = .3, FL = 38;  // envelope, paper thickness, flap depth
      var mouthZ = -26.5, envZ = mouthZ + EH / 2; // the fold the flap hinges on; envelope centre
      var INK = '#121110', STOCK = '#F7F5F0';
      var PPM = 9.9, MX = 15;

      /* ---------- the card artwork ---------- */
      function P() {
        var p = ctx.personal || {};
        return { name: p.name || 'نورة العتيبي', message: p.message || 'فخورين فيك.', from: p.from || 'أمك وأبوك', date: p.date || '2026-12-06' };
      }
      function fontFor(s) { return WRK.isArabic(s) ? F.ar : F.mark; }
      function wrap(c, str, maxW) {
        var words = String(str).split(/\s+/).filter(Boolean), lines = [], cur = '';
        words.forEach(function (wd) { var t = cur ? cur + ' ' + wd : wd; if (cur && c.measureText(t).width > maxW) { lines.push(cur); cur = wd; } else cur = t; });
        if (cur) lines.push(cur); return lines;
      }
      function drawFront(c, w, h, k, col) {
        var p = P(), R = w - MX * k, maxW = w - 2 * MX * k;
        var ar = WRK.isArabic(p.name);
        // salutation
        tex.text(c, p.name + (ar ? '،' : ','), R, 22 * k, { font: fontFor(p.name), weight: 300, size: 5.3 * k, align: 'right', baseline: 'alphabetic', color: col, maxWidth: maxW });
        // the message: one large line, or smaller wrapped lines
        var mf = fontFor(p.message), tries = [[9.6, 1], [6.6, 2], [5, 3]], pick = null;
        for (var i = 0; i < tries.length && !pick; i++) {
          c.font = '300 ' + (tries[i][0] * k) + 'px ' + mf; var ls = wrap(c, p.message, maxW);
          if (ls.length <= tries[i][1] || i === tries.length - 1) pick = { size: tries[i][0], lines: ls.slice(0, tries[i][1]) };
        }
        var y0 = pick.lines.length === 1 ? 44.5 : 33 + pick.size * .82;
        pick.lines.forEach(function (ln, j) { tex.text(c, ln, R, (y0 + j * pick.size * 1.55) * k, { font: mf, weight: 300, size: pick.size * k, align: 'right', baseline: 'alphabetic', color: col, maxWidth: maxW }); });
        // sender, bottom-left, and the empty hand-writing rule that leads to it
        var fw = tex.text(c, p.from, MX * k, 67 * k, { font: fontFor(p.from), weight: 300, size: 5.3 * k, align: 'left', baseline: 'alphabetic', color: col, maxWidth: 70 * k });
        c.fillStyle = col; var x0 = MX * k + fw + 7 * k; c.fillRect(x0, 67 * k - .13 * k, Math.max(0, R - x0), .26 * k);
        tex.text(c, 'wrk.', MX * k, 83 * k, { weight: 300, size: 3.6 * k, align: 'left', baseline: 'alphabetic', color: col });
      }
      function drawBack(c, w, h, k, col) {
        tex.text(c, WRK.formatDate(P().date, 'num'), MX * k, h - 14 * k, { weight: 300, size: 4.6 * k, align: 'left', baseline: 'alphabetic', color: col, spacing: .7 * k });
      }

      var TW = Math.round(CW * PPM), TH = Math.round(CH * PPM);
      function scratch() { var c = document.createElement('canvas'); c.width = TW; c.height = TH; return c; }
      var maskF = scratch(), maskB = scratch(), tmp = scratch();
      /* cotton tooth: soft felt marks at three scales */
      function tooth(c) {
        c.fillStyle = '#8c8c8c'; c.fillRect(0, 0, TW, TH);
        var n = tex.noiseCanvas(256, 1, 3);
        [[9, .045], [3.1, .07], [1.3, .07]].forEach(function (s) { c.save(); c.globalAlpha = s[1]; c.scale(s[0], s[0]); c.fillStyle = c.createPattern(n, 'repeat'); c.fillRect(0, 0, TW / s[0] + 1, TH / s[0] + 1); c.restore(); });
      }
      /* press a mask into (multiply) or raise it out of (screen) a height canvas */
      function press(c, mask, depth, blur, flipV, raise) {
        var t = tmp.getContext('2d'); t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-over'; t.filter = 'none';
        t.fillStyle = raise ? '#000' : '#fff'; t.fillRect(0, 0, TW, TH);
        t.save(); if (flipV) { t.translate(0, TH); t.scale(1, -1); }
        t.globalCompositeOperation = raise ? 'source-over' : 'difference'; t.filter = 'blur(' + blur + 'px)'; t.drawImage(mask, 0, 0); t.restore(); t.filter = 'none';
        c.save(); c.globalCompositeOperation = raise ? 'screen' : 'multiply'; c.globalAlpha = depth; c.drawImage(tmp, 0, 0); c.restore();
      }
      function paintMask(mask, draw) { var m = mask.getContext('2d'); m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, TW, TH); draw(m, TW, TH, PPM, '#fff'); }

      var frontMap = tex.print(CW, CH, function (c, w, h, k) {
        // a soft grey shoulder around the ink: the walls of the impression
        c.save(); c.globalAlpha = .16; c.filter = 'blur(' + (.22 * k) + 'px)'; drawFront(c, w, h, k, '#6b655c'); c.restore(); c.filter = 'none';
        drawFront(c, w, h, k, INK);
      }, { ppm: PPM, stock: STOCK });
      var backMap = tex.print(CW, CH, function (c, w, h, k) {
        c.save(); c.globalAlpha = .17; c.filter = 'blur(' + (.1 * k) + 'px)'; drawBack(c, w, h, k, '#4a4238'); c.restore(); c.filter = 'none';
      }, { ppm: PPM, stock: STOCK });
      var frontBump = tex.data(TW, TH, function () {}), backBump = tex.data(TW, TH, function () {});
      frontBump.wrapS = frontBump.wrapT = backBump.wrapS = backBump.wrapT = T.ClampToEdgeWrapping;
      function paintBumps() {
        paintMask(maskF, drawFront); paintMask(maskB, drawBack);
        tex.redraw(frontBump, function (c) { tooth(c); press(c, maskF, .9, 2.2); });
        tex.redraw(backBump, function (c) { tooth(c); press(c, maskF, .07, 3.5, true, true); press(c, maskB, .85, 1.8); });
      }
      paintBumps();

      function cotton(map, bump) {
        var m = M.cotton({ map: map }); if (m.bumpMap) m.bumpMap.dispose(); m.bumpMap = bump; m.bumpScale = 5; m.emissive.set(0xffffff); m.emissiveMap = map; m.emissiveIntensity = .22; return m;
      }
      var edgeMat = M.cotton({ color: 0xf3f0e9, repeat: 14 }); edgeMat.bumpScale = .5; edgeMat.emissive.set(0xf3f0e9); edgeMat.emissiveIntensity = .16;
      var frontMat = cotton(frontMap, frontBump), backMat = cotton(backMap, backBump);

      /* card body: one plate, three material groups (front lid, back lid, edge) */
      var cg = G.plate(CW, CH, tC, .45, { bevel: .17, bevelSegments: 3, curveSegments: 5 });
      cg.translate(0, -tC / 2, 0);
      (function () {
        var gr = cg.groups, lid = gr[0], n = lid.count / 2, pos = cg.attributes.position, uv = cg.attributes.uv, total = pos.count;
        var firstIsTop = pos.getY(lid.start) > 0;
        cg.clearGroups();
        cg.addGroup(lid.start, n, firstIsTop ? 0 : 1);
        cg.addGroup(lid.start + n, n, firstIsTop ? 1 : 0);
        cg.addGroup(lid.start + lid.count, total - lid.count, 2);
        // the back is read after turning the card over its long edge: flip v so it is upright then
        var b0 = firstIsTop ? lid.start + n : lid.start;
        for (var i = b0; i < b0 + n; i++) uv.setY(i, 1 - uv.getY(i));
        uv.needsUpdate = true;
      })();
      var cardG = new T.Group(); cardG.rotation.order = 'YXZ'; group.add(cardG);
      var flipG = new T.Group(); cardG.add(flipG);
      flipG.add(mesh(cg, [frontMat, backMat, edgeMat], { receive: false }));

      /* ---------- envelope ---------- */
      var paperMat = M.blackPaper({ repeat: 9 });
      var env = new T.Group(); group.add(env);
      // lower ply
      env.add(mesh(G.plate(EW, EH, tP, .5, { bevel: .08 }), paperMat, { pos: [0, 0, envZ] }));
      // upper ply: a sheet that lies over whatever is inside, so the card shows through it
      var xs = [], zs = [], i, j;
      [106, 105.3, 104.6, 103.9, 103.2, 102.5, 101.6, 100.4, 98.5, 95].forEach(function (x) { xs.push(-x); });
      for (i = -84; i <= 84; i += 12) xs.push(i);
      [95, 98.5, 100.4, 101.6, 102.5, 103.2, 103.9, 104.6, 105.3, 106].forEach(function (x) { xs.push(x); });
      var zA = mouthZ + 2, zB = mouthZ + EH - .2, NZ = 44;
      for (j = 0; j <= NZ; j++) zs.push(lerp(zA, zB, j / NZ));
      var skinG = new T.BufferGeometry(), sp = new Float32Array(xs.length * zs.length * 3), su = new Float32Array(xs.length * zs.length * 2), si = [];
      for (j = 0; j < zs.length; j++) for (i = 0; i < xs.length; i++) {
        var o = j * xs.length + i; sp[o * 3] = xs[i]; sp[o * 3 + 1] = 2 * tP + .02; sp[o * 3 + 2] = zs[j]; su[o * 2] = xs[i] / EW + .5; su[o * 2 + 1] = -zs[j] / EH;
        if (i < xs.length - 1 && j < zs.length - 1) si.push(o, o + xs.length, o + 1, o + 1, o + xs.length, o + xs.length + 1);
      }
      skinG.setAttribute('position', new T.BufferAttribute(sp, 3)); skinG.setAttribute('uv', new T.BufferAttribute(su, 2)); skinG.setIndex(si); skinG.computeVertexNormals();
      var skinMat = M.blackPaper({ repeat: 9 }); skinMat.side = T.DoubleSide;
      var skin = mesh(skinG, skinMat, { cast: false }); env.add(skin);
      function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
      var skinKey = '';
      function shapeSkin(cx, innerZ, amt) {
        var key = cx.toFixed(2) + '|' + innerZ.toFixed(2) + '|' + amt.toFixed(3); if (key === skinKey) return; skinKey = key;
        var a = skinG.attributes.position, base = 2 * tP + .02, n = 0;
        for (var jj = 0; jj < zs.length; jj++) {
          var hz = amt * (1 - sstep(innerZ - 1, innerZ + 8, zs[jj]));
          for (var ii = 0; ii < xs.length; ii++, n++) {
            // the glued side seams and the bottom fold turn down onto the lower ply
            if (ii === 0 || ii === xs.length - 1 || jj === zs.length - 1) a.setY(n, tP + .005);
            else a.setY(n, base + (hz ? hz * (tC + .05) * (1 - sstep(103.3, 104.8, Math.abs(xs[ii] - cx))) : 0));
          }
        }
        a.needsUpdate = true; skinG.computeVertexNormals();
      }
      // flap: hinged on the fold, no glue. Its inner face carries one line in black foil.
      var flap = new T.Group(); flap.position.set(0, 0, mouthZ); env.add(flap);
      var fs = new T.Shape(), fx = EW / 2 - .3, tx = fx - 2.2, fr = 2;
      fs.moveTo(-fx, 0); fs.lineTo(fx, 0); fs.lineTo(tx, FL - fr); fs.quadraticCurveTo(tx, FL, tx - fr, FL); fs.lineTo(-tx + fr, FL); fs.quadraticCurveTo(-tx, FL, -tx, FL - fr); fs.lineTo(-fx, 0);
      flap.add(mesh(G.plate(EW, FL, tP, 0, { shape: fs, bevel: .08 }), paperMat));
      var foil = tex.foil(202, FL - 4, function (c, w, h, k) { tex.text(c, 'تُفتح أكثر من مرة.', w / 2, h / 2, { font: F.ar, weight: 300, size: 3.1 * k }); }, { base: '#121213', foil: '#1d1d20', baseRough: .96, foilRough: .2, ppm: 10 });
      var foilMat = M.blackPaper({ repeat: 9 }); foilMat.map = foil.map; foilMat.roughnessMap = foil.roughnessMap; foilMat.roughness = 1; foilMat.color.set(0xffffff);
      flap.add(ctx.decal(202, FL - 4, foilMat, { pos: [0, tP + .02, -FL / 2] }));
      // the score line of the fold
      env.add(mesh(new T.BoxGeometry(EW - 1, .04, .5), M.blackPaper({ color: 0x070708 }), { pos: [0, tP - .005, mouthZ + .1], cast: false }));

      /* ---------- soft contact shadows on the paper (the card is white on a pale page) ---------- */
      function contact(w, h, pad, a1, a2) {
        var t = tex.color(256, 256, function (c) {
          var sx = 256 / (w + 2 * pad), sy = 256 / (h + 2 * pad);
          c.save(); c.scale(sx, sy); c.fillStyle = 'rgba(28,22,16,' + a2 + ')'; c.filter = 'blur(' + (pad * .34 * sx) + 'px)'; c.fillRect(pad, pad, w, h); c.restore();
          c.save(); c.scale(sx, sy); c.fillStyle = 'rgba(28,22,16,' + a1 + ')'; c.filter = 'blur(' + (1.6 * sx) + 'px)'; c.fillRect(pad - .4, pad - .4, w + .8, h + .8); c.restore();
        });
        t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
        var g = new T.PlaneGeometry(w + 2 * pad, h + 2 * pad); g.rotateX(-Math.PI / 2);
        var m = new T.Mesh(g, new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); m.renderOrder = -1; return m;
      }
      var envShadow = contact(EW, EH, 16, .5, .2); envShadow.position.set(0, .04, envZ); group.add(envShadow);
      var cardShadow = contact(CW, CH, 16, .42, .16); group.add(cardShadow);

      /* ---------- poses ---------- */
      var view = { radius: 128, target: [0, 1, 0], yaw: -.32, pitch: .8, footprint: [170, 90], tile: { yaw: -.32, pitch: .8 } };
      var IN = { x: .8, z: mouthZ - 48 + CH / 2, yaw: .006, y: tP + .02 + tC / 2 };
      var zClear = mouthZ - CH / 2 - 9;
      var tilt = .0112;                                       // back edge rests on the envelope's front edge
      var OUT = { x: 7, z: 104, yaw: -.085, y: tC / 2 + .03 + Math.sin(tilt) * CH / 2 };
      var flapRest = .2;                                      // the fold's memory: the flap never lies quite flat

      var out = 0, flip = 0, tOut = 0, tFlip = 0;
      function pose() {
        var s = clamp(out / .36, 0, 1), c = clamp((out - .3) / .7, 0, 1), es = E.inOut(s), ec = E.inOut(c), bell = Math.pow(Math.sin(Math.PI * c), 2);
        var x = lerp(IN.x, OUT.x, ec), yaw = lerp(IN.yaw, OUT.yaw, ec), rx = tilt * ec - .11 * bell;
        var y = lerp(IN.y, OUT.y, ec) + 36 * bell, phi = Math.PI * flip, slide = es;
        if (flip > 0 && flip < 1) {
          var m;
          if (out > .5) m = flip;
          else { m = clamp((flip - .24) / .52, 0, 1); slide = Math.max(slide, E.inOut(Math.min(clamp(flip / .3, 0, 1), clamp((1 - flip) / .3, 0, 1)))); }
          phi = Math.PI * E.inOut(m); y += 57 * Math.pow(Math.sin(Math.PI * m), 2);
        }
        var z = IN.z + (zClear - IN.z) * slide + (OUT.z - zClear) * ec;
        cardG.position.set(x, y, z); cardG.rotation.set(rx, yaw, 0); flipG.rotation.x = phi;
        var bottom = y - tC / 2 - Math.abs(Math.sin(phi)) * CH / 2;
        // the flap follows the card up until the fold holds it
        flap.rotation.x = z < 3.5 ? Math.min(flapRest, Math.asin(clamp((bottom - tP - .02) / FL, 0, 1))) : flapRest;
        // the upper ply lies on the part of the card that is still inside
        shapeSkin(x, z + CH / 2, clamp(1 - Math.abs(bottom - tP - .02) / 1.5, 0, 1) * clamp(1 - c * 10, 0, 1));
        cardShadow.position.set(x, .05, z); cardShadow.rotation.y = yaw;
        var hgt = clamp(bottom / 45, 0, 1); cardShadow.material.opacity = 1 - hgt; cardShadow.scale.setScalar(1 + hgt * .25);
        view.target[2] = 43 * ec; view.radius = lerp(128, 150, ec);
        ctx.invalidate();
      }
      pose();

      function setState(id, on, animate) {
        var from, to = on ? 1 : 0;
        if (id === 'out') {
          from = out; tOut = to; flip = tFlip;
          if (animate === false) { out = to; pose(); return; }
          return ctx.run(2100, function (k) { out = from + (to - from) * k; pose(); }, E.linear, 'card');
        }
        if (id === 'flip') {
          from = flip; tFlip = to; out = tOut;
          if (animate === false) { flip = to; pose(); return; }
          return ctx.run(out > .5 ? 1500 : 2600, function (k) { flip = from + (to - from) * k; pose(); }, E.linear, 'card');
        }
      }
      function setPersonal(p) { ctx.personal = p; frontMap.repaint(); backMap.repaint(); paintBumps(); ctx.invalidate(); }

      return { group: group, view: view, setState: setState, setPersonal: setPersonal };
    }
  });
})();
