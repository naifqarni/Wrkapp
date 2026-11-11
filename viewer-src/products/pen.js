/* توقيع — the pen.
   Brass twist pen, matte black, 140 x 10 mm. Two opposite flats on the rear barrel: it rests on one and shows the name on the other.
   Geometry in mm, Y up. The pen lies along X, tip at -X, resting on its lower flat at y = 0.
   Inside this file "s" is the distance from the nose end in mm (0 to 140); local x = s - 70. */
(function () {
  var WRK = window.WRK;

  WRK.register({
    id: 'pen', order: 2,
    name: { ar: 'توقيع', en: 'tawqee' },
    kind: { ar: 'القلم', en: 'The pen' },
    price: 89,
    line: { ar: 'أول شيء في أول يوم: توقيعك على العقد.', en: 'The first thing on the first day: your signature on the contract.' },
    story: {
      ar: 'قلم من النحاس بطلاء أسود مطفي. يُفتح باللف، بلا صوت. الاسم محفور بالليزر في جسمه، فيظهر النحاس من تحت السواد.',
      en: 'A brass pen with a matte black finish. It opens with a twist, without a sound. The name is laser-engraved into the body, so the brass shows through the black.'
    },
    specs: [
      [{ ar: 'المقاس', en: 'Size' }, { ar: '140 × 10 مم', en: '140 × 10 mm' }],
      [{ ar: 'الوزن', en: 'Weight' }, { ar: 'حوالي 38 غ', en: 'About 38 g' }],
      [{ ar: 'الجسم', en: 'Body' }, { ar: 'نحاس، طلاء أسود مطفي', en: 'Brass, matte black finish' }],
      [{ ar: 'الحركة', en: 'Action' }, { ar: 'لفّ نصف دورة، بلا صوت', en: 'Half-turn twist, silent' }],
      [{ ar: 'العبوة', en: 'Refill' }, { ar: 'مقاس باركر G2، تُستبدل من أي مكتبة', en: 'Parker-style G2, replaceable anywhere' }],
      [{ ar: 'الاسم', en: 'Name' }, { ar: 'حفر ليزر، عربي أو إنجليزي', en: 'Laser-engraved, Arabic or English' }]
    ],
    personal: { ar: 'يُحفر على السطح المستوي من القلم', en: 'Engraved on the flat of the barrel' },
    personalFields: ['name', 'date'],
    actions: [
      { id: 'twist', label: { ar: 'لفّ', en: 'Twist' }, labelOn: { ar: 'أرجِع', en: 'Retract' } },
      { id: 'unscrew', label: { ar: 'افتح القلم', en: 'Unscrew' }, labelOn: { ar: 'أغلق', en: 'Close' } }
    ],
    gallery: [
      { yaw: .22, pitch: .62, zoom: 1, caption: { ar: 'توقيع. نحاس بطلاء أسود مطفي.', en: 'tawqee. Brass, matte black.' } },
      { yaw: .16, pitch: .95, target: [6, 6, -1], radius: 27, caption: { ar: 'الاسم محفور حتى النحاس.', en: 'The name, engraved down to the brass.' } },
      { states: ['twist'], yaw: .3, pitch: .8, target: [-6, 4, 2], radius: 34, caption: { ar: 'نصف لفّة ويخرج الرأس. بلا صوت.', en: 'Half a turn and the tip is out. No sound.' } },
      { states: ['unscrew'], yaw: .22, pitch: .66, target: [0, 4, 0], radius: 106, caption: { ar: 'عبوة قياسية تُستبدل.', en: 'A standard refill, easy to replace.' } }
    ],

    build: function (ctx) {
      var T = ctx.THREE, M = ctx.mats, tex = ctx.tex, mesh = ctx.mesh, F = ctx.FONT;
      var PI = Math.PI, clamp = WRK.clamp, lerp = WRK.lerp;
      var group = new T.Group();
      var R = 5, D = 4.2;                    // barrel radius, distance from axis to each flat
      var FW = 2 * Math.sqrt(R * R - D * D); // flat width, about 5.43

      /* ----- geometry helper: a lofted tube along X. stations are [radius, s, flatDistance?] ----- */
      function ringAngles(n, start) { var a = []; for (var j = 0; j <= n; j++) a.push(start + j * 2 * PI / n); return a; }
      function flatAngles(arcSeg, flatSeg) {
        var te = Math.asin(D / R), w = FW / 2, e = .11, a = [], j;
        function arc(a0, a1) { a.push(a0 + e / R); for (j = 1; j < arcSeg; j++) a.push(a0 + (a1 - a0) * j / arcSeg); a.push(a1 - e / R); a.push(a1); }
        function flat(sign, off) { var ts = [w - e]; for (j = 1; j < flatSeg; j++) ts.push(w - 2 * w * j / flatSeg); ts.push(-w + e, -w); ts.forEach(function (t) { a.push(Math.atan2(sign * D, sign * t) + off); }); }
        a.push(-te); arc(-te, te);
        var top0 = a.length - 1; flat(1, 0); var top1 = a.length - 1;
        arc(PI - te, PI + te); flat(-1, 2 * PI);
        return { ang: a, top0: top0, top1: top1 };
      }
      function loft(st, ang, o) {
        o = o || {};
        var pos = [], uv = [], i0 = [], i1 = [], n = ang.length, m = st.length, i, j;
        for (i = 0; i < m; i++) {
          var x = st[i][1] - 70, rad = st[i][0], d = st[i][2] == null ? 1e9 : st[i][2];
          for (j = 0; j < n; j++) {
            var th = ang[j], sn = Math.sin(th), r = Math.min(rad, d / Math.max(1e-6, Math.abs(sn)));
            pos.push(x, r * sn, r * Math.cos(th));
            var q = o.uv ? o.uv(st[i][1], j, i) : [st[i][1] / 4, j / (n - 1) * 6]; uv.push(q[0], q[1]);
          }
        }
        for (i = 0; i < m - 1; i++) for (j = 0; j < n - 1; j++) {
          var a = i * n + j, b = (i + 1) * n + j, c = a + 1, e = b + 1, t = (o.zone && o.zone(i, j)) ? i1 : i0;
          t.push(a, b, c, b, e, c);
        }
        var g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
        g.setIndex(i0.concat(i1)); g.addGroup(0, i0.length, 0); if (i1.length) g.addGroup(i0.length, i1.length, 1);
        g.computeVertexNormals(); return g;
      }

      /* ----- engraving textures: a colour map and a roughness map drawn from the same marks ----- */
      /* roughness in green, metalness in blue: laser-frosted brass scatters light, so the letters are less mirror-like than the coating */
      function rm(r, m) { return 'rgb(0,' + Math.round(r * 255) + ',' + Math.round(m * 255) + ')'; }
      function engrave(wmm, hmm, ppm, draw, base, ink, baseR, inkR, inkM) {
        var w = Math.round(wmm * ppm), h = Math.round(hmm * ppm);
        var map = tex.color(w, h, function () {}), rough = tex.data(w, h, function () {});
        function paint() {
          tex.redraw(map, function (c) { c.fillStyle = base; c.fillRect(0, 0, w, h); draw(c, w, h, ppm, ink); });
          tex.redraw(rough, function (c) { c.fillStyle = rm(baseR, 1); c.fillRect(0, 0, w, h); draw(c, w, h, ppm, rm(inkR, inkM)); });
        }
        paint();
        map.wrapS = map.wrapT = rough.wrapS = rough.wrapT = T.ClampToEdgeWrapping;
        return { map: map, rough: rough, repaint: paint };
      }
      var BLACK = '#47474c', BLACKN = 0x47474c, BRASS = '#dcb56c';
      function blackMat(rx, ry) { return M.blackMetal({ color: BLACKN, roughness: .47, bumpMap: tex.noiseBump(rx, ry, .35), bumpScale: .045 }); }
      function markMat(e, rx, ry) { var m = M.blackMetal({ map: e.map, roughnessMap: e.rough, roughness: 1, color: 0xffffff, bumpMap: tex.noiseBump(rx, ry, .35), bumpScale: .045 }); m.metalnessMap = e.rough; return m; }

      var pen = new T.Group(); pen.position.y = D; group.add(pen);

      /* ----- rear barrel: round, two flats, the name on the upper one ----- */
      var FA = flatAngles(18, 8), per = [0], j;
      for (j = 1; j < FA.ang.length; j++) {
        var s0 = Math.sin(FA.ang[j - 1]), s1 = Math.sin(FA.ang[j]), r0 = Math.min(R, D / Math.abs(s0)), r1 = Math.min(R, D / Math.abs(s1));
        per.push(per[j - 1] + Math.hypot(r1 * s1 - r0 * s0, r1 * Math.cos(FA.ang[j]) - r0 * Math.cos(FA.ang[j - 1])));
      }
      var perTop = (per[FA.top0] + per[FA.top1]) / 2;
      var N0 = 56, N1 = 96;                  // engraving zone along the barrel
      var nameE = engrave(N1 - N0, FW, 48, function (c, w, h, k, col) {
        var n = (ctx.personal && ctx.personal.name) || 'نورة العتيبي', ar = WRK.isArabic(n);
        tex.text(c, n, w / 2, h / 2 + (ar ? -.1 : .12) * k, { font: ar ? F.ar : F.mark, weight: 300, size: (ar ? 2.9 : 3.0) * k, spacing: .22 * k, color: col, maxWidth: w - 4 * k });
      }, BLACK, BRASS, .47, .5, .35);
      var barrelSt = [[4.2, 51.2, D], [5, 52.7, D], [5, 53.1, D], [5, N0, D], [5, N1, D], [5, 136.2, D], [4.86, 136.3, D], [4.86, 136.5, D], [5, 136.6, D],
        [5, 137.9, D], [5, 138.4, D], [4.62, 139.5, D], [4.05, 140, D], [4.05, 140, D], [.01, 140, D]];
      var barrel = mesh(loft(barrelSt, FA.ang, {
        uv: function (s, j) { return [(s - N0) / (N1 - N0), .5 + (per[j] - perTop) / FW]; },
        zone: function (i, j) { return i === 3 && j >= FA.top0 && j < FA.top1; }
      }), [blackMat(20, 2.7), markMat(nameE, 20, 2.7)]);
      pen.add(barrel);
      // polished joint ring at the barrel mouth
      pen.add(mesh(loft([[3.7, 50.06], [4.08, 50.06], [4.2, 50.18], [4.2, 51.1], [4.14, 51.2]], ringAngles(64, -PI / 2)), M.blackGloss()));

      /* ----- clip: a bent steel strip that comes out under the end plug and lands on the name flat ----- */
      (function () {
        var cl = new T.CatmullRomCurve3([[134.7, 3.6], [134.7, 5.35], [133.9, 6.1], [132.2, 6.38], [118, 6.2], [105.5, 5.8], [102.3, 5.35], [100.5, 4.63], [99.3, 4.72], [98.5, 5.1]].map(function (p) { return new T.Vector3(p[0] - 70, p[1], 0); }), false, 'centripetal');
        var up = [], dn = [], n = 80, p = new T.Vector3(), t = new T.Vector3(), hh = .3;
        for (var i = 0; i <= n; i++) { cl.getPoint(i / n, p); cl.getTangent(i / n, t); up.push(new T.Vector2(p.x - t.y * hh, p.y + t.x * hh)); dn.push(new T.Vector2(p.x + t.y * hh, p.y - t.x * hh)); }
        var sh = new T.Shape(up.concat(dn.reverse()));
        var g = new T.ExtrudeGeometry(sh, { depth: 2.2, bevelEnabled: true, bevelThickness: .1, bevelSize: .1, bevelSegments: 2, curveSegments: 4 });
        g.translate(0, 0, -1.1);
        var cm = M.blackMetal({ color: 0x3a3a3e, roughness: .25, bumpScale: .01 });
        pen.add(mesh(g, cm));
      })();

      /* ----- mechanism collar and thread (bare brass), fixed in the barrel; the date is on the collar ----- */
      var SA = ringAngles(48, -PI / 2);
      var dateE = engrave(8, 3.6 * (8 * 2 * PI / 48), 60, function (c, w, h, k, col) {
        tex.text(c, WRK.formatDate(ctx.personal && ctx.personal.date, 'num'), w / 2, h / 2 + .05 * k, { weight: 400, size: 1.3 * k, spacing: .16 * k, color: col });
      }, '#b08d57', '#3d2f1c', .35, .6, .5);
      var sleeveSt = [[3.0, 37.2], [3.3, 37.2]];
      for (j = 0; j <= 20; j++) sleeveSt.push([j % 2 ? 3.6 : 3.34, 37.2 + j * .25]);
      sleeveSt.push([3.34, 42.35], [3.6, 42.5], [3.6, 43], [3.6, 51], [3.6, 52.5]);
      var iC = sleeveSt.length - 3;
      var brassM = M.brass(), dateM = M.brass(); dateM.map = dateE.map; dateM.roughnessMap = dateE.rough; dateM.roughness = 1; dateM.metalnessMap = dateE.rough; dateM.color.set(0xffffff);
      pen.add(mesh(loft(sleeveSt, SA, {
        uv: function (s, j) { return [(s - 43) / 8, (j - 20) / 8]; },
        zone: function (i, j) { return i === iC && j >= 20 && j < 28; }
      }), [brassM, dateM]));

      /* ----- refill: Parker-style G2, blue. Slides 3.6 mm forward when the pen is twisted ----- */
      var refill = new T.Group(); pen.add(refill);
      var RS = .6;                           // retracted: the point sits 0.6 mm inside the nose
      function rs(a) { return a.map(function (p) { return [p[0], p[1] + RS]; }); }
      var steel = new T.MeshPhysicalMaterial({ color: 0xc4c5c8, metalness: 1, roughness: .24 });
      refill.add(mesh(loft(rs([[.02, 0], [.3, .04], [.42, .4], [1.0, 2.7], [1.27, 3.3], [1.27, 9.5], [2.9, 13.5]]), ringAngles(40, -PI / 2)), steel));
      var tubeTex = tex.color(1150, 364, function (c, w, h) {
        var k = 20; c.fillStyle = '#b7b9bd'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#1e3f8c'; c.fillRect(2.2 * k, 0, 1.5 * k, h);
        tex.text(c, 'G2 · 0.7 · blue', 6 * k, h / 2, { weight: 400, size: 1.7 * k, align: 'left', color: '#26262a', spacing: .1 * k });
      });
      var tubeM = new T.MeshPhysicalMaterial({ color: 0xffffff, map: tubeTex, metalness: 1, roughness: .3 });
      refill.add(mesh(loft(rs([[2.9, 13.5], [2.9, 71], [2.9, 71], [2.5, 71], [2.5, 92], [2.9, 92], [2.9, 97.5], [.01, 97.5]]), ringAngles(48, -PI / 2), { uv: function (s, j) { return [(s - RS - 13.5) / 57.5, j / 48]; } }), tubeM));

      /* ----- front section: turns half a turn to bring the tip out; unscrews to change the refill ----- */
      var section = new T.Group(); pen.add(section);
      function og(s) { return 1.75 + 2.35 * (1 - Math.pow(1 - Math.min(s / 30, 1), 2.3)); }
      section.add(mesh(loft([[1.36, 2.6], [1.36, .04], [1.36, 0], [1.58, 0], [1.75, .14], [og(1), 1], [og(2), 2], [og(3), 3.04]], ringAngles(48, PI / 2)), M.blackGloss()));
      var secSt = [[og(3.04), 3.04], [og(3.5), 3.5]];
      for (j = 2; j <= 15; j++) secSt.push([og(j * 2), j * 2]);
      var iW = secSt.length;                 // the wrk. mark sits between s = 40 and s = 47
      secSt.push([4.1, 40], [4.1, 47], [4.1, 49.75], [4.0, 50.03], [4.0, 50.03], [3.68, 50.03], [3.68, 40.5], [3.1, 40.5], [3.1, 34]);
      var wrkE = engrave(7, 4.1 * (8 * 2 * PI / 72), 60, function (c, w, h, k, col) {
        tex.text(c, 'wrk.', w / 2, h / 2 - .1 * k, { weight: 300, size: 2.2 * k, color: col, spacing: .1 * k });
      }, BLACK, BRASS, .47, .5, .35);
      section.add(mesh(loft(secSt, ringAngles(72, PI / 2), {
        uv: function (s, j) { return [(s - 40) / 7, (j - 32) / 8]; },
        zone: function (i, j) { return i === iW && j >= 32 && j < 40; }
      }), [blackMat(6, 3.5), markMat(wrkE, 6, 3.5)]));

      var view = { radius: 66, target: [0, 5, 0], yaw: .22, pitch: .62, footprint: [124, 9], tile: { yaw: .32, pitch: .66, zoom: .96 } };

      /* ----- states: tw 0..1 (tip in..out), un 0..1 (assembled..front section off) ----- */
      var cur = { tw: 0, un: 0 }, want = { tw: false, un: false };
      function pose() {
        var tw = cur.tw, un = cur.un;
        var a = clamp(un / .42, 0, 1), b = ctx.ease.inOut(clamp((un - .36) / .64, 0, 1));
        section.rotation.x = -PI * tw + 6 * PI * a;          // half a turn out; three visible turns to come off the thread
        section.position.x = -(5 * a + 61 * b);
        section.position.y = -.1 * b;                        // off the pen it lies on the paper
        refill.position.x = -3.6 * tw;
        // keep the part being worked on over the turntable centre
        var ue = ctx.ease.inOut(un);
        pen.position.x = 36 * tw * (1 - ue) + 33 * ue;
        view.footprint[0] = lerp(lerp(124, 60, tw), 190, ue);
      }
      pose();
      function go(animate) {
        var tu = want.un ? 1 : 0, tt = want.un ? 0 : (want.tw ? 1 : 0), segs = [], total = 0;
        if (tu) { if (cur.tw > 0) segs.push(['tw', cur.tw, 0, 800 * cur.tw + 1]); if (cur.un < 1) segs.push(['un', cur.un, 1, 2100 * (1 - cur.un) + 1]); }
        else { if (cur.un > 0) segs.push(['un', cur.un, 0, 2000 * cur.un + 1]); if (cur.tw !== tt) segs.push(['tw', cur.tw, tt, 1150 * Math.abs(tt - cur.tw) + 1]); }
        if (animate === false || !segs.length) { cur.tw = tt; cur.un = tu; pose(); ctx.invalidate(); return; }
        segs.forEach(function (s) { s[4] = total; total += s[3]; });
        ctx.look(null, tu ? .66 : (tt ? .8 : .62), total, tu ? 1.42 : (tt ? .5 : 1));
        return ctx.run(total, function (k) {
          var t = k * total;
          for (var i = 0; i < segs.length; i++) { var s = segs[i]; cur[s[0]] = lerp(s[1], s[2], ctx.ease.inOut(clamp((t - s[4]) / s[3], 0, 1))); }
          pose();
        }, ctx.ease.linear, 'pen');
      }
      function setState(id, on, animate) {
        if (id === 'twist') { want.tw = !!on; if (on) want.un = false; }
        else if (id === 'unscrew') { want.un = !!on; if (on) want.tw = false; }
        else return;
        return go(animate);
      }
      function setPersonal(p) { ctx.personal = p; nameE.repaint(); dateE.repaint(); ctx.invalidate(); }

      return { group: group, view: view, setState: setState, setPersonal: setPersonal };
    }
  });
})();
