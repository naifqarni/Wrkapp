/* أول يوم — the kit box. Reference module: copy this structure for other products.
   Geometry in mm, Y up, object resting on y = 0 and centred on the origin. Long side along X. */
(function () {
  var WRK = window.WRK;

  WRK.register({
    id: 'kit', order: 0,
    name: { ar: 'أول يوم', en: 'awwal yawm' },
    kind: { ar: 'الطقم', en: 'The kit' },
    price: 399,
    priceNote: { ar: 'من 299', en: 'from 299' },
    line: { ar: 'كل ما يحتاجه في أول يوم، باسمه.', en: 'Everything for the first day, in their name.' },
    story: {
      ar: 'علبة سوداء طويلة. بطاقة باسمه، قلم، دفتر، ورسالة منك فوقها كلها. تُفتح مرة واحدة، وتبقى على المكتب.',
      en: 'A long black box. A badge in their name, a pen, a notebook, and your message on top of it all. It is opened once and stays on the desk.'
    },
    specs: [
      [{ ar: 'المقاس', en: 'Size' }, { ar: '340 × 150 × 38 مم', en: '340 × 150 × 38 mm' }],
      [{ ar: 'العلبة', en: 'Box' }, { ar: 'كرتون صلب، ملمس ناعم مطفي', en: 'Rigid board, soft-touch matte' }],
      [{ ar: 'بالداخل', en: 'Inside' }, { ar: 'هويّة، توقيع، تسعون، كلمة', en: 'huwiyya, tawqee, tis’oun, kalima' }],
      [{ ar: 'الاسم', en: 'Name' }, { ar: 'على البطاقة والقلم والدفتر', en: 'On the badge, pen and notebook' }]
    ],
    personal: { ar: 'يظهر على البطاقة داخل العلبة', en: 'Shown on the badge inside the box' },
    actions: [{ id: 'open', label: { ar: 'افتح', en: 'Open' }, labelOn: { ar: 'أغلق', en: 'Close' } }],

    build: function (ctx) {
      var T = ctx.THREE, M = ctx.mats, G = ctx.geo, tex = ctx.tex, mesh = ctx.mesh, F = ctx.FONT;
      var group = new T.Group();
      var L = 340, W = 150, H = 38;

      /* ----- base: four walls, a floor, and the tray plate with three recesses ----- */
      var base = new T.Group(); group.add(base);
      var bl = 335, bw = 145, bh = 36, wall = 2, wrap = M.softTouch();
      base.add(mesh(new T.BoxGeometry(bl, 1.5, bw), wrap, { pos: [0, .75, 0] }));
      [[0, bw / 2 - wall / 2, bl, wall], [0, -bw / 2 + wall / 2, bl, wall], [bl / 2 - wall / 2, 0, wall, bw], [-bl / 2 + wall / 2, 0, wall, bw]].forEach(function (s) {
        base.add(mesh(new T.BoxGeometry(s[2], bh, s[3]), wrap, { pos: [s[0], bh / 2, s[1]] }));
      });
      var trayY = 31;
      function hole(cx, cz, w, h, r) { var p = new T.Path(), s = G.roundedRectShape(w, h, r); p.setFromPoints(s.getPoints(8).map(function (q) { return new T.Vector2(q.x + cx, q.y - cz); })); return p; }
      var NB = { x: -44, z: -8, w: 214, h: 104 }, PEN = { x: -44, z: 58, w: 150, h: 12 }, BDG = { x: 114, z: 0, w: 66, h: 102 };
      var tray = mesh(G.plate(bl - 2 * wall - .4, bw - 2 * wall - .4, 1.5, .5, { bevel: .2, holes: [hole(NB.x, NB.z, NB.w, NB.h, 1), hole(PEN.x, PEN.z, PEN.w, PEN.h, 6), hole(BDG.x, BDG.z, BDG.w, BDG.h, 1.5)] }), M.blackPaper({ repeat: 14 }), { pos: [0, trayY - 1.5, 0] });
      base.add(tray);
      var liner = M.blackPaper({ color: 0x08080a });
      function well(o, depth) {
        var y = trayY - depth;
        base.add(mesh(new T.BoxGeometry(o.w, .6, o.h), liner, { pos: [o.x, y, o.z], cast: false }));
        var wm = M.blackPaper({ color: 0x0b0b0c });
        base.add(mesh(new T.BoxGeometry(o.w, depth, .6), wm, { pos: [o.x, y + depth / 2, o.z - o.h / 2], cast: false }));
        base.add(mesh(new T.BoxGeometry(o.w, depth, .6), wm, { pos: [o.x, y + depth / 2, o.z + o.h / 2], cast: false }));
        base.add(mesh(new T.BoxGeometry(.6, depth, o.h), wm, { pos: [o.x - o.w / 2, y + depth / 2, o.z], cast: false }));
        base.add(mesh(new T.BoxGeometry(.6, depth, o.h), wm, { pos: [o.x + o.w / 2, y + depth / 2, o.z], cast: false }));
        return y;
      }
      var nbY = well(NB, 11), penY = well(PEN, 12), bdgY = well(BDG, 20);

      /* ----- what is inside (simple versions; each piece has its own detailed module) ----- */
      // notebook, 210 x 100 x 8
      base.add(mesh(G.plate(210, 100, 8, 3, { bevel: .8 }), M.leather({ repeatX: 8, repeatY: 4, bumpScale: .9 }), { pos: [NB.x, nbY + .3, NB.z] }));
      // message card on top, 205 x 95
      var cardTex = tex.print(205, 95, function (c, w, h, k) {
        tex.text(c, 'أهلًا بك', w - 16 * k, 24 * k, { font: F.ar, weight: 300, size: 12 * k, align: 'right', color: '#111' });
        tex.text(c, 'فخورين فيك.', w - 16 * k, 46 * k, { font: F.ar, weight: 300, size: 6.4 * k, align: 'right', color: '#222' });
        c.fillStyle = '#d6d4ce'; c.fillRect(16 * k, 70 * k, w - 32 * k, .35 * k);
        tex.text(c, 'wrk.', 16 * k, 82 * k, { weight: 300, size: 5.5 * k, align: 'left', color: '#666' });
      });
      var card = mesh(G.plate(205, 95, .7, .8, { bevel: .1 }), M.cotton({ map: cardTex }), { pos: [NB.x, nbY + 8.4, NB.z] });
      base.add(card);
      // pen, dia 10 x 140, lying along X
      var pen = new T.Group(); pen.position.set(PEN.x, penY + 5.3, PEN.z); pen.rotation.z = Math.PI / 2; base.add(pen);
      pen.add(mesh(G.lathe([[0, -70], [1.2, -70], [2.2, -66], [4.6, -52], [5, -48], [5, 66], [4.6, 69.4], [3.6, 70], [0, 70]], 48), M.blackMetal({ repeat: 4 })));
      pen.add(mesh(new T.CylinderGeometry(5.03, 5.03, .8, 48), M.blackGloss(), { pos: [0, 8, 0] }));
      pen.add(mesh(new T.BoxGeometry(2.6, 34, 1), M.blackGloss(), { pos: [0, 50, 5.4] }));
      // badge holder, 62 x 98 x 5, on the folded lanyard
      var holder = new T.Group(); holder.position.set(BDG.x, bdgY + 9, BDG.z); base.add(holder);
      base.add(mesh(G.plate(56, 60, 8, 3, { bevel: 1.5 }), M.webbing({ repeatX: 12, repeatY: 12 }), { pos: [BDG.x, bdgY + .4, BDG.z + 8] }));
      holder.add(mesh(G.plate(62, 98, 5, 6, { bevel: .9 }), M.leather({ repeatX: 3, repeatY: 4.5, bumpScale: .9 })));
      var nameTex = tex.print(50, 74, function (c, w, h, k) { drawBadge(c, w, h, k, ctx.personal); });
      holder.add(ctx.decal(50, 74, M.cotton({ map: nameTex }), { pos: [0, 5.03, 6] }));
      holder.add(mesh(G.plate(12, 3, .6, 1.5, { bevel: .1 }), M.matteBlack({ color: 0x050505 }), { pos: [0, 4.6, -41], cast: false }));
      function drawBadge(c, w, h, k, p) {
        tex.text(c, 'wrk.', 5 * k, 8 * k, { weight: 300, size: 4.4 * k, align: 'left', color: '#555' });
        var n = (p && p.name) || 'نورة العتيبي';
        tex.text(c, n, w / 2, h * .5, { font: WRK.isArabic(n) ? F.ar : F.mark, weight: 300, size: 7.4 * k, color: '#141414', maxWidth: w - 8 * k });
      }

      /* ----- lid: hollow, so the lining shows when it is lifted off ----- */
      var lid = new T.Group(); lid.position.set(0, H / 2, 0); group.add(lid);
      var foil = tex.foil(L, W, function (c, w, h, k) { tex.text(c, 'wrk.', w / 2, h / 2 - 1.2 * k, { weight: 200, size: 30 * k }); });
      var lidTop = M.softTouch({ map: foil.map, roughnessMap: foil.roughnessMap, roughness: 1 }); lidTop.color.set(0xffffff);
      lid.add(mesh(G.plate(L, W, 2, .9, { bevel: .35 }), lidTop, { pos: [0, H / 2 - 2, 0] }));
      var lw = M.softTouch({ repeat: 6 });
      [[0, W / 2 - 1, L, 2], [0, -W / 2 + 1, L, 2], [L / 2 - 1, 0, 2, W - 4], [-L / 2 + 1, 0, 2, W - 4]].forEach(function (s) {
        lid.add(mesh(G.roundedBox(s[2], H - 1.2, s[3], .5, 1), lw, { pos: [s[0], -.6, s[1]] }));
      });
      // lining with the hidden Arabic line (black foil on black paper)
      var lin = tex.foil(L - 4, W - 4, function (c, w, h, k) { c.translate(w / 2, h / 2); c.scale(1, -1); tex.text(c, 'أهلًا بك', 0, 0, { font: F.ar, weight: 300, size: 7 * k }); }, { base: '#111112', foil: '#232326', baseRough: .95, foilRough: .2 });
      var liningMat = M.blackPaper(); liningMat.map = lin.map; liningMat.roughnessMap = lin.roughnessMap; liningMat.roughness = 1; liningMat.color.set(0xffffff);
      var lining = new T.Mesh(new T.PlaneGeometry(L - 4, W - 4), liningMat); lining.rotation.x = Math.PI / 2; lining.position.y = H / 2 - 2.05; lining.receiveShadow = true; lid.add(lining);

      var view = { radius: 192, target: [0, 16, 0], yaw: -.52, pitch: .5, footprint: [340, 150], tile: { yaw: -.5, pitch: .56 } };

      /* ----- states ----- */
      var open = 0; // 0 closed, 1 open
      function pose(k) {
        // lift straight up on the air cushion, carry it back while turning it over, set it down behind the box
        var up = WRK.clamp(k / .34, 0, 1), over = WRK.clamp((k - .26) / .56, 0, 1), down = WRK.clamp((k - .8) / .2, 0, 1);
        var eo = ctx.ease.inOut(over);
        lid.position.y = H / 2 + ctx.ease.out(up) * 118 - ctx.ease.inOut(down) * 118 * (k > .8 ? 1 : 0);
        lid.position.z = -eo * 176; lid.position.x = eo * 10;
        lid.rotation.x = -eo * Math.PI; lid.rotation.y = eo * .07;
        view.target[2] = -eo * 84;
      }
      pose(0);
      function setState(id, on, animate) {
        if (id !== 'open') return;
        var from = open, to = on ? 1 : 0; open = to;
        if (animate === false) { pose(to); ctx.invalidate(); return; }
        ctx.look(null, on ? .86 : .5, on ? 1700 : 1500, on ? 1.42 : 1);
        return ctx.run(on ? 2100 : 1900, function (k) { pose(from + (to - from) * k); }, ctx.ease.linear, 'lid');
      }
      function setPersonal(p) { ctx.personal = p; nameTex.repaint(); ctx.invalidate(); }

      return {
        group: group,
        view: view,
        setState: setState, setPersonal: setPersonal
      };
    }
  });
})();
