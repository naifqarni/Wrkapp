/* مكان — the desk tray. One flat sheet of 2.2 mm leather; four pinched corners held by press studs.
   Geometry in mm, Y up. The sheet is modelled as its inside (sueded) surface, folded by five rigid
   panels per corner (floor, two walls, two ear halves) and blended across the creases like real
   leather; the grain side is that surface offset outward by the leather thickness. */
(function () {
  var WRK = window.WRK;

  WRK.register({
    id: 'tray', order: 6,
    name: { ar: 'مكان', en: 'makan' },
    kind: { ar: 'صينية المكتب', en: 'The desk tray' },
    price: 169,
    line: { ar: 'أول شيء يجعل المكتب مكتبك.', en: 'The first thing that makes the desk yours.' },
    story: {
      ar: 'في أول يوم يعطونك مكتبًا. هذه الصينية تُوضع عليه، وفيها حافة تمسك القلم في مكانه. قطعة واحدة من الجلد الأسود السميك بأربعة أزرار، تفتحها فتعود مسطّحة.',
      en: 'On the first day you are given a desk. This tray goes on it, with a ridge that keeps the pen where you left it. One piece of thick black leather held by four studs. Unsnap them and it lies flat again.'
    },
    specs: [
      [{ ar: 'المقاس', en: 'Size' }, { ar: '220 × 126 × 22 مم', en: '220 × 126 × 22 mm' }],
      [{ ar: 'مفتوحة', en: 'Laid flat' }, { ar: '253 × 158 مم', en: '253 × 158 mm' }],
      [{ ar: 'الجلد', en: 'Leather' }, { ar: 'جلد طبيعي أسود 2.2 مم، باطنه مخملي', en: 'Full-grain black, 2.2 mm, sueded inside' }],
      [{ ar: 'الأزرار', en: 'Studs' }, { ar: 'أربعة أزرار كبس بلون معدني داكن', en: 'Four gunmetal press studs' }],
      [{ ar: 'مسند القلم', en: 'Pen rest' }, { ar: 'حافة مرتفعة على الجانب الطويل', en: 'A raised ridge along one long side' }],
      [{ ar: 'الاسم', en: 'Name' }, { ar: 'كبس حراري بلا لون داخل الزاوية', en: 'Blind-debossed inside one corner' }]
    ],
    personal: { ar: 'يُكبس الاسم داخل زاوية الصينية', en: 'The name is pressed inside one corner of the tray' },
    personalFields: ['name'],
    actions: [
      { id: 'unsnap', label: { ar: 'افتح الأزرار', en: 'Unsnap' }, labelOn: { ar: 'أغلق الأزرار', en: 'Snap' } },
      { id: 'turn', label: { ar: 'اقلبها', en: 'Turn over' }, labelOn: { ar: 'أعدها', en: 'Turn back' } }
    ],
    gallery: [
      { states: [], yaw: .38, pitch: .72, zoom: 1, caption: { ar: 'مكان، على المكتب', en: 'makan, on the desk' } },
      { states: [], yaw: .785, pitch: .3, target: [118, 10, -33], radius: 30, caption: { ar: 'الزاوية مثنية ويمسكها زر كبس', en: 'The corner is pinched and held by a press stud' } },
      { states: [], yaw: 0, pitch: 1.3, target: [68, 4, -44], radius: 50, caption: { ar: 'الاسم داخل الزاوية، حيث يشير القلم', en: 'The name inside the corner, where the pen points' } },
      { states: ['unsnap'], yaw: .38, pitch: .86, zoom: 1.14, caption: { ar: 'تفتح الأزرار فتعود مسطّحة', en: 'Unsnap the studs and it lies flat' } }
    ],

    build: function (ctx) {
      var T = ctx.THREE, M = ctx.mats, G = ctx.geo, tex = ctx.tex, mesh = ctx.mesh, F = ctx.FONT, E = ctx.ease;
      var group = new T.Group(), body = new T.Group(); group.add(body);

      /* ----- the sheet ----- */
      var A = 106.5, B = 59.25;          // half floor, inside the creases: 213 x 118.5
      var WH = 20, TH = 2.2, RC = 12;    // wall strip, leather thickness, sheet corner radius
      var LX = 2 * (A + WH), LZ = 2 * (B + WH);
      var DEG = Math.PI / 180, TH_REL = 9 * DEG, TH_MAX = 86 * DEG;   // leather keeps a little of its crease when unsnapped
      var BAND = 4.4, DIAG = 1.7;        // crease softness across a wall fold, and across the pinched diagonal
      var th = [TH_MAX, TH_MAX, TH_MAX, TH_MAX];   // wall angle at each corner: index = (x>0 ? 1 : 0) + (z>0 ? 2 : 0)
      var CN = [0, 1, 2, 3].map(function () { return new Float64Array(21); });
      var SQ2 = Math.SQRT2;

      function corners() {
        for (var ci = 0; ci < 4; ci++) {
          var sx = (ci & 1) ? 1 : -1, sz = (ci & 2) ? 1 : -1, K = CN[ci];
          var st = Math.sin(th[ci]), ct = Math.cos(th[ci]);
          // the diagonal fold stays in the corner's mirror plane, 45 degrees from both wall ends
          var bb = ct / SQ2, rr = Math.sqrt(st * st + bb * bb), ph = Math.atan2(st, bb) - Math.acos(Math.min(1, 1 / (SQ2 * rr)));
          var sp = Math.sin(ph), cp = Math.cos(ph), up = SQ2 * sp - st;
          // ear half joined to the long wall: z offset -> e1, x offset -> g2
          K[0] = 0; K[1] = st; K[2] = sz * ct;
          K[3] = sx * cp; K[4] = up; K[5] = sz * (cp - ct);
          // ear half joined to the short wall: x offset -> e2, z offset -> h2
          K[6] = sx * ct; K[7] = st; K[8] = 0;
          K[9] = sx * (cp - ct); K[10] = up; K[11] = sz * cp;
          var s = sx * sz;
          K[12] = s * (K[1] * K[5] - K[2] * K[4]); K[13] = s * (K[2] * K[3] - K[0] * K[5]); K[14] = s * (K[0] * K[4] - K[1] * K[3]);
          K[15] = s * (K[10] * K[8] - K[11] * K[7]); K[16] = s * (K[11] * K[6] - K[9] * K[8]); K[17] = s * (K[9] * K[7] - K[10] * K[6]);
          var mx = K[12] + K[15], my = K[13] + K[16], mz = K[14] + K[17], ml = Math.sqrt(mx * mx + my * my + mz * mz);
          if (ml < 1e-5) { mx = 0; my = 1; mz = 0; ml = 1; }
          K[18] = mx / ml; K[19] = my / ml; K[20] = mz / ml;
        }
      }
      function sm(u) { u = u < 0 ? 0 : (u > 1 ? 1 : u); return u * u * (3 - 2 * u); }
      var S = new Float64Array(6);   // skin output: position, inside normal
      /* Where a point of the flat sheet (x, z) is now, and which way its inside face looks. */
      function skin(x, z) {
        var sx = x < 0 ? -1 : 1, sz = z < 0 ? -1 : 1, dX = sx * x - A, dZ = sz * z - B;
        var wX = sm(dX / BAND), wZ = sm(dZ / BAND), w, t, s, c, tau, c0;
        var px = 0, py = 0, pz = 0, nx = 0, ny = 0, nz = 0;
        w = (1 - wX) * (1 - wZ);
        if (w > 0) { px += w * x; pz += w * z; ny += w; }
        w = wZ * (1 - wX);
        if (w > 0) {
          tau = sm((x + A) / (2 * A)); c0 = sz > 0 ? 2 : 0; t = th[c0] + (th[c0 + 1] - th[c0]) * tau; s = Math.sin(t); c = Math.cos(t);
          px += w * x; py += w * dZ * s; pz += w * sz * (B + dZ * c); ny += w * c; nz -= w * sz * s;
        }
        w = wX * (1 - wZ);
        if (w > 0) {
          tau = sm((z + B) / (2 * B)); c0 = sx > 0 ? 1 : 0; t = th[c0] + (th[c0 + 2] - th[c0]) * tau; s = Math.sin(t); c = Math.cos(t);
          px += w * sx * (A + dX * c); py += w * dX * s; pz += w * z; nx -= w * sx * s; ny += w * c;
        }
        w = wX * wZ;
        if (w > 0) {
          var K = CN[(sx > 0 ? 1 : 0) + (sz > 0 ? 2 : 0)], g = sm(.5 + (dZ - dX) / (2 * SQ2 * DIAG)), h = 1 - g, bul = Math.sin(Math.PI * g);
          px += w * (sx * A + g * (dZ * K[0] + dX * K[3]) + h * (dX * K[6] + dZ * K[9]));
          py += w * (g * (dZ * K[1] + dX * K[4]) + h * (dX * K[7] + dZ * K[10]));
          pz += w * (sz * B + g * (dZ * K[2] + dX * K[5]) + h * (dX * K[8] + dZ * K[11]));
          // around the pinched fold the grain side rolls over in a half circle
          nx += w * (g * K[12] + h * K[15] + bul * K[18]); ny += w * (g * K[13] + h * K[16] + bul * K[19]); nz += w * (g * K[14] + h * K[17] + bul * K[20]);
        }
        var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        S[0] = px; S[1] = py; S[2] = pz; S[3] = nx / l; S[4] = ny / l; S[5] = nz / l;
      }

      /* flat grid: 1 mm cells in the walls and corner squares, coarse on the floor and along the walls */
      function axis(half) {
        var pts = [], inner = half - 5, n = Math.ceil(inner / 8.5), i;
        for (i = 0; i < n; i++) pts.push(inner * i / n);
        for (i = 0; i <= 5 + WH; i++) pts.push(inner + i);
        var out = []; for (i = pts.length - 1; i > 0; i--) out.push(-pts[i]); return out.concat(pts);
      }
      var xs = axis(A), zs = axis(B), NX = xs.length, NZ = zs.length, NV = NX * NZ;
      var fx = new Float32Array(NV), fz = new Float32Array(NV);
      var cxr = A + WH - RC, czr = B + WH - RC;
      (function () {
        for (var j = 0; j < NZ; j++) for (var i = 0; i < NX; i++) {
          var x = xs[i], z = zs[j], ax = Math.abs(x), az = Math.abs(z), p = ax - cxr, q = az - czr;
          if (p > 0 && q > 0) { var m = Math.max(p, q) / Math.sqrt(p * p + q * q); ax = cxr + p * m; az = czr + q * m; }   // round the sheet corners
          fx[j * NX + i] = x < 0 ? -ax : ax; fz[j * NX + i] = z < 0 ? -az : az;
        }
      })();
      var topPos = new Float32Array(NV * 3), topNor = new Float32Array(NV * 3), botPos = new Float32Array(NV * 3), botNor = new Float32Array(NV * 3);
      var topUv = new Float32Array(NV * 2), botUv = new Float32Array(NV * 2), idxTop = [], idxBot = [];
      (function () {
        for (var v = 0; v < NV; v++) { topUv[v * 2] = botUv[v * 2] = fx[v] / LX + .5; topUv[v * 2 + 1] = -fz[v] / LZ + .5; botUv[v * 2 + 1] = fz[v] / LZ + .5; }
        for (var j = 0; j < NZ - 1; j++) for (var i = 0; i < NX - 1; i++) {
          var a = j * NX + i, b = a + 1, c = a + NX, d = c + 1;
          if ((xs[i] + xs[i + 1]) * (zs[j] + zs[j + 1]) > 0) { idxTop.push(a, c, d, a, d, b); idxBot.push(a, d, c, a, b, d); }   // cell diagonals follow the corner fold
          else { idxTop.push(a, c, b, b, c, d); idxBot.push(a, b, c, b, d, c); }
        }
      })();
      function dyn(pos, nor, uv, idx) {
        var g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3));
        if (uv) g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(idx); return g;
      }
      var topGeo = dyn(topPos, topNor, topUv, idxTop), botGeo = dyn(botPos, botNor, botUv, idxBot);

      /* painted edge: a slightly domed band round the whole outline */
      var loop = [];
      (function () { var i, j; for (i = 0; i < NX; i++) loop.push(i); for (j = 1; j < NZ; j++) loop.push(j * NX + NX - 1); for (i = NX - 2; i >= 0; i--) loop.push((NZ - 1) * NX + i); for (j = NZ - 2; j >= 1; j--) loop.push(j * NX); })();
      var NL = loop.length, inX = new Float32Array(NL), inZ = new Float32Array(NL), edgePos = new Float32Array(NL * 4 * 3), idxEdge = [];
      (function () {
        for (var n = 0; n < NL; n++) {
          var v = loop[n], x = fx[v], z = fz[v], ax = Math.abs(x), az = Math.abs(z), ox, oz;
          if (ax > cxr && az > czr) { ox = ax - cxr; oz = az - czr; var l = Math.sqrt(ox * ox + oz * oz); ox /= l; oz /= l; }
          else if (A + WH - ax < B + WH - az) { ox = 1; oz = 0; } else { ox = 0; oz = 1; }
          inX[n] = x - (x < 0 ? -ox : ox) * 1.4; inZ[n] = z - (z < 0 ? -oz : oz) * 1.4;
          var m = (n + 1) % NL;
          for (var r = 0; r < 3; r++) { var a = n * 4 + r, b = m * 4 + r; idxEdge.push(a, b, a + 1, b, b + 1, a + 1); }
        }
      })();
      var edgeGeo = new T.BufferGeometry(); edgeGeo.setAttribute('position', new T.BufferAttribute(edgePos, 3)); edgeGeo.setIndex(idxEdge);

      /* ----- textures, drawn in flat-sheet millimetres ----- */
      var PPM = 8, CW = Math.round(LX * PPM), CH = Math.round(LZ * PPM);
      function cx_(x) { return (x + LX / 2) * PPM; }
      function rrect(c, hw, hh, r) {   // rounded rectangle centred on the sheet, in mm
        var x0 = cx_(-hw), x1 = cx_(hw), y0 = (LZ / 2 - hh) * PPM, y1 = (LZ / 2 + hh) * PPM; r *= PPM;
        c.beginPath(); c.moveTo(x0 + r, y0); c.lineTo(x1 - r, y0); c.arcTo(x1, y0, x1, y0 + r, r); c.lineTo(x1, y1 - r); c.arcTo(x1, y1, x1 - r, y1, r);
        c.lineTo(x0 + r, y1); c.arcTo(x0, y1, x0, y1 - r, r); c.lineTo(x0, y0 + r); c.arcTo(x0, y0, x0 + r, y0, r); c.closePath();
      }
      var ST_IN = 3.2, SEX = A + WH - ST_IN, SEZ = B + WH - ST_IN, SR = RC - ST_IN;   // border stitch line
      var RX0 = -A + 6, RX1 = RX0 + 150, RZ = -B + 13.5;                                // pen rest: bead from RX0 to RX1, centre line RZ
      var NAME = { right: A - 9, z: -B + 9.5, max: 44, size: 4.7 };
      function creases(c) {   // same lines on any canvas whose y axis is +z or -z: they are symmetric
        var cr = BAND / 2, w = CW, h = CH, k = PPM;
        c.beginPath();
        [-(A + cr), A + cr].forEach(function (x) { c.moveTo(cx_(x), 0); c.lineTo(cx_(x), h); });
        [-(B + cr), B + cr].forEach(function (z) { c.moveTo(0, (z + LZ / 2) * k); c.lineTo(w, (z + LZ / 2) * k); });
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (s) { c.moveTo(cx_(s[0] * A), (s[1] * B + LZ / 2) * k); c.lineTo(cx_(s[0] * (A + WH)), (s[1] * (B + WH) + LZ / 2) * k); });
        c.stroke();
      }
      function drawName(c, style) {
        var n = (ctx.personal && ctx.personal.name) || 'نورة العتيبي';
        tex.text(c, n, cx_(NAME.right), (NAME.z + LZ / 2) * PPM, { font: WRK.isArabic(n) ? F.ar : F.mark, weight: 400, size: NAME.size * PPM, align: 'right', color: style, maxWidth: NAME.max * PPM });
        // the wordmark sits in the opposite corner, pressed the same way
        tex.text(c, 'wrk.', cx_(-NAME.right), (-NAME.z + LZ / 2) * PPM, { weight: 300, size: 5.6 * PPM, align: 'left', color: style });
      }
      var topMap = tex.color(CW, CH, function () {}), topBump = tex.data(CW, CH, function () {}), topRough = tex.data(CW, CH, function () {});
      [topMap, topBump, topRough].forEach(function (t) { t.wrapS = t.wrapT = T.ClampToEdgeWrapping; });
      function paintTop() {
        var noise = tex.noiseCanvas(256, .9), r = WRK.rng(41);
        tex.redraw(topMap, function (c, w, h) {
          c.fillStyle = '#343231'; c.fillRect(0, 0, w, h);
          // the nap is never even: soft patches where it lies one way or the other
          for (var i = 0; i < 46; i++) {
            var x = r() * w, y = r() * h, rad = (18 + r() * 46) * PPM, g = c.createRadialGradient(x, y, 0, x, y, rad), up = r() > .5;
            g.addColorStop(0, up ? 'rgba(74,70,66,.22)' : 'rgba(8,8,8,.2)'); g.addColorStop(1, up ? 'rgba(74,70,66,0)' : 'rgba(8,8,8,0)');
            c.save(); c.translate(x, y); c.scale(1.9, 1); c.translate(-x, -y); c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); c.restore();
          }
          c.save(); c.globalAlpha = .1; c.globalCompositeOperation = 'multiply'; c.scale(5, 1.2); c.fillStyle = c.createPattern(noise, 'repeat'); c.fillRect(0, 0, w, h); c.restore();
          c.save(); c.filter = 'blur(2px)'; c.strokeStyle = 'rgba(0,0,0,.34)'; c.lineWidth = 1.5 * PPM; creases(c); c.restore();
          c.save(); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = .8 * PPM; rrect(c, SEX, SEZ, SR); c.stroke(); c.restore();
          c.save(); c.filter = 'blur(.6px)'; drawName(c, 'rgba(0,0,0,.62)'); c.restore();
        });
        tex.redraw(topBump, function (c, w, h) {
          c.fillStyle = '#8a8a8a'; c.fillRect(0, 0, w, h);
          c.save(); c.globalAlpha = .75; c.scale(.6, .6); c.fillStyle = c.createPattern(noise, 'repeat'); c.fillRect(0, 0, w / .6, h / .6); c.restore();
          c.save(); c.filter = 'blur(2.5px)'; c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1.3 * PPM; creases(c); c.restore();
          c.save(); c.filter = 'blur(1px)'; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = .9 * PPM; rrect(c, SEX, SEZ, SR); c.stroke(); c.restore();
          c.save(); c.filter = 'blur(1px)'; drawName(c, 'rgba(0,0,0,.9)'); c.restore();
        });
        tex.redraw(topRough, function (c, w, h) {
          c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
          c.save(); c.filter = 'blur(2px)'; c.strokeStyle = 'rgba(120,120,120,.5)'; c.lineWidth = 1.2 * PPM; creases(c); c.restore();
          drawName(c, '#6e6e6e');     // the heat press lays the nap down: smoother, so it takes the light
        });
      }
      paintTop();
      var suede = M.suede(); suede.bumpMap.dispose();
      suede.color.set(0xffffff); suede.map = topMap; suede.bumpMap = topBump; suede.bumpScale = .7; suede.roughnessMap = topRough;

      var under = tex.debossedLeather(LX, LZ, function (c, w, h, k) {   // canvas top = the front edge of the sheet (+z)
        tex.text(c, 'هذا مكانك.', w / 2, h / 2, { font: F.ar, weight: 300, size: 5.6 * k });
        c.save(); c.globalAlpha = .7; c.lineWidth = .5 * k; rrect(c, SEX, SEZ, SR); c.stroke();
        c.beginPath(); [RZ - 3, RZ + 3].forEach(function (z) { var y = (LZ / 2 - z) * k; c.moveTo(cx_(RX0 - .5), y); c.lineTo(cx_(RX1 + .5), y); }); c.stroke();
        c.globalAlpha = .35; c.lineWidth = .9 * k; creases(c); c.restore();
      }, { ppm: PPM, depth: 1, polish: .62, shoulder: 1.1 });
      var grain = M.leather({ bumpMap: under.bumpMap, roughnessMap: under.roughnessMap, bumpScale: 1.2 });
      var edgeMat = M.edge(); edgeMat.side = T.DoubleSide;

      function dynMesh(g, m) { var o = mesh(g, m); o.frustumCulled = false; body.add(o); return o; }
      dynMesh(topGeo, suede); dynMesh(botGeo, grain); dynMesh(edgeGeo, edgeMat);

      /* ----- stitches: real thread, one instance each, carried by the leather ----- */
      var stitch = [];   // x, z, tx, tz, side, lift, corner whose pinched fold it wraps (or -1)
      (function () {
        var sl = 2 * (SEX - SR), tl = 2 * (SEZ - SR), arc = Math.PI * SR / 2, per = 2 * sl + 2 * tl + 4 * arc, n = Math.round(per / 3), i;
        var seg = [[sl, -SEX + SR, -SEZ, 1, 0], [arc, SEX - SR, -SEZ + SR, -Math.PI / 2], [tl, SEX, -SEZ + SR, 0, 1], [arc, SEX - SR, SEZ - SR, 0],
          [sl, SEX - SR, SEZ, -1, 0], [arc, -SEX + SR, SEZ - SR, Math.PI / 2], [tl, -SEX, SEZ - SR, 0, -1], [arc, -SEX + SR, -SEZ + SR, Math.PI]];
        for (i = 0; i < n; i++) {
          var d = (i + .5) * per / n, k = 0; while (d > seg[k][0]) { d -= seg[k][0]; k++; }
          var q = seg[k], x, z, tx, tz;
          if (q.length === 5) { x = q[1] + q[3] * d; z = q[2] + q[4] * d; tx = q[3]; tz = q[4]; }
          else { var a = q[3] + d / SR; x = q[1] + SR * Math.cos(a); z = q[2] + SR * Math.sin(a); tx = -Math.sin(a); tz = Math.cos(a); }
          var dg = Math.abs((Math.abs(z) - B) - (Math.abs(x) - A)) / SQ2, cf = (Math.abs(x) > A && Math.abs(z) > B && dg < 2.6) ? (x > 0 ? 1 : 0) + (z > 0 ? 2 : 0) : -1;
          stitch.push(x, z, tx, tz, 1, 0, cf, x, z, tx, tz, -1, 0, cf);
        }
        for (var xr = RX0 + 1; xr < RX1 - 1; xr += 3) [RZ - 3, RZ + 3].forEach(function (z) { stitch.push(xr + 1.5, z, 1, 0, 1, .6, -1, xr + 1.5, z, 1, 0, -1, 0, -1); });
      })();
      var NS = stitch.length / 7;
      var stGeo = new T.CapsuleGeometry(.34, 1.55, 2, 5); stGeo.rotateZ(Math.PI / 2); stGeo.scale(1, .62, 1);
      var thread = M.matteBlack({ color: 0x1a1a1c, roughness: .5 });
      var stMesh = new T.InstancedMesh(stGeo, thread, NS); stMesh.frustumCulled = false; stMesh.castShadow = false; stMesh.receiveShadow = true; body.add(stMesh);

      /* Put a frame on the sheet at flat point (x, z): X along (tx, tz), Y out of the chosen face. Writes 16 numbers into out at o. */
      function frame(x, z, tx, tz, side, lift, half, out, o) {
        skin(x - tx * half, z - tz * half); var ax = S[0], ay = S[1], az = S[2], nx = S[3], ny = S[4], nz = S[5];
        skin(x + tx * half, z + tz * half); var bx = S[0], by = S[1], bz = S[2];
        nx += S[3]; ny += S[4]; nz += S[5]; var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= l; ny /= l; nz /= l;
        var ux = bx - ax, uy = by - ay, uz = bz - az, ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1; ux /= ul; uy /= ul; uz /= ul;
        var yx = nx * side, yy = ny * side, yz = nz * side;
        var wx = uy * yz - uz * yy, wy = uz * yx - ux * yz, wz = ux * yy - uy * yx, wl = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1; wx /= wl; wy /= wl; wz /= wl;
        yx = wy * uz - wz * uy; yy = wz * ux - wx * uz; yz = wx * uy - wy * ux;
        var off = (side < 0 ? TH : 0) + lift;
        out[o] = ux; out[o + 1] = uy; out[o + 2] = uz; out[o + 3] = 0; out[o + 4] = yx; out[o + 5] = yy; out[o + 6] = yz; out[o + 7] = 0;
        out[o + 8] = wx; out[o + 9] = wy; out[o + 10] = wz; out[o + 11] = 0;
        out[o + 12] = (ax + bx) / 2 + yx * off; out[o + 13] = (ay + by) / 2 + yy * off; out[o + 14] = (az + bz) / 2 + yz * off; out[o + 15] = 1;
      }

      /* ----- press studs: cap + socket on the ear half joined to the long wall, stud + back on the other ----- */
      var gun = M.gunmetal({ roughness: .26 }), gunDull = M.gunmetal({ roughness: .42 }); gun.color.set(0x9c9da3); gunDull.color.set(0x7c7d83);
      var capGeo = G.lathe([[4.2, -.15], [4.2, .3], [3.9, .8], [3, 1.2], [1.5, 1.42], [0, 1.48]], 40);
      var sockGeo = G.lathe([[2.3, -.1], [3.9, -.1], [3.9, .75], [3.4, 1.15], [2.9, 1.15], [2.3, .7], [2.3, -.1]], 36);
      var studGeo = G.lathe([[3.6, -.1], [3.6, .4], [2.1, .5], [1.85, 1.1], [2.15, 1.55], [1.8, 1.95], [0, 2.05]], 32);
      var backGeo = G.lathe([[3.8, -.1], [3.8, .35], [3.3, .62], [1.3, .62], [.9, .4], [0, .36]], 36);
      var studs = [];
      [0, 1, 2, 3].forEach(function (ci) {
        var sx = (ci & 1) ? 1 : -1, sz = (ci & 2) ? 1 : -1;
        function part(g, m, x, z, side) { var o = mesh(g, m); o.matrixAutoUpdate = false; o.frustumCulled = false; body.add(o); studs.push({ o: o, x: x, z: z, side: side }); }
        var ax = sx * (A + 5.8), az = sz * (B + 12), bx = sx * (A + 12), bz = sz * (B + 5.8);
        part(capGeo, gun, ax, az, -1); part(sockGeo, gunDull, ax, az, 1);
        part(studGeo, gunDull, bx, bz, 1); part(backGeo, gun, bx, bz, -1);
      });

      /* ----- pen rest: a covered core on the floor, stitched down each side (the floor never moves) ----- */
      var thin = M.leather({ repeatX: 10, repeatY: 1, bumpScale: .5, roughness: .52 });
      var RL = RX1 - RX0, RXC = (RX0 + RX1) / 2;
      body.add(mesh(G.plate(RL + 3, 8.4, .6, 1.6, { bevel: .18 }), thin, { pos: [RXC, 0, RZ], cast: false }));
      (function () {
        var g = new T.CapsuleGeometry(2, RL - 4, 8, 20); g.rotateZ(Math.PI / 2);
        var p = g.attributes.position; for (var i = 0; i < p.count; i++) { var y = p.getY(i); p.setY(i, y > 0 ? y * 1.6 : 0); }
        g.computeVertexNormals();
        body.add(mesh(g, thin, { pos: [RXC, .5, RZ] }));
      })();

      /* ----- the pen: a prop for scale, lying in the channel between the back wall and the ridge ----- */
      var pen = new T.Group(), penR = new T.Group(), penQ = new T.Group(); group.add(pen); pen.add(penR); penR.add(penQ);
      penR.rotation.z = Math.PI / 2; penQ.rotation.y = 1.12;
      penQ.add(mesh(G.lathe([[0, -70], [1.2, -70], [2.2, -66], [4.6, -52], [5, -48], [5, 66], [4.6, 69.4], [3.6, 70], [0, 70]], 48), M.blackMetal({ repeat: 4 })));
      penQ.add(mesh(new T.CylinderGeometry(5.03, 5.03, .8, 48), M.blackGloss(), { pos: [0, 8, 0] }));
      penQ.add(mesh(new T.BoxGeometry(2.6, 34, 1), M.blackGloss(), { pos: [0, 50, 5.4] }));
      var PEN_IN = [-28, TH + 5, -B + 5.6], PEN_OUT = [-22, 5, -(B + WH + 26)];

      var view = { radius: 124, target: [0, 10, 0], yaw: .38, pitch: .72, footprint: [236, 142], tile: { yaw: .38, pitch: .74 } };

      /* ----- pose ----- */
      var maxY = WH, flipP = 0, flipE = 0, tmp16 = new Float32Array(16);
      function update() {
        corners();
        var v, o, hi = 0;
        for (v = 0; v < NV; v++) {
          skin(fx[v], fz[v]); o = v * 3;
          topPos[o] = S[0]; topPos[o + 1] = S[1]; topPos[o + 2] = S[2]; topNor[o] = S[3]; topNor[o + 1] = S[4]; topNor[o + 2] = S[5];
          botPos[o] = S[0] - S[3] * TH; botPos[o + 1] = S[1] - S[4] * TH; botPos[o + 2] = S[2] - S[5] * TH; botNor[o] = -S[3]; botNor[o + 1] = -S[4]; botNor[o + 2] = -S[5];
          if (S[1] > hi) hi = S[1]; if (botPos[o + 1] > hi) hi = botPos[o + 1];
        }
        maxY = hi;
        for (var n = 0; n < NL; n++) {
          v = loop[n] * 3; o = n * 12;
          var px = topPos[v], py = topPos[v + 1], pz = topPos[v + 2], nx = topNor[v], ny = topNor[v + 1], nz = topNor[v + 2];
          skin(inX[n], inZ[n]); var ox = px - S[0], oy = py - S[1], oz = pz - S[2], ol = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1; ox *= .32 / ol; oy *= .32 / ol; oz *= .32 / ol;
          edgePos[o] = px; edgePos[o + 1] = py; edgePos[o + 2] = pz;
          edgePos[o + 3] = px - nx * .5 + ox; edgePos[o + 4] = py - ny * .5 + oy; edgePos[o + 5] = pz - nz * .5 + oz;
          edgePos[o + 6] = px - nx * (TH - .5) + ox; edgePos[o + 7] = py - ny * (TH - .5) + oy; edgePos[o + 8] = pz - nz * (TH - .5) + oz;
          edgePos[o + 9] = px - nx * TH; edgePos[o + 10] = py - ny * TH; edgePos[o + 11] = pz - nz * TH;
        }
        topGeo.attributes.position.needsUpdate = topGeo.attributes.normal.needsUpdate = true;
        botGeo.attributes.position.needsUpdate = botGeo.attributes.normal.needsUpdate = true;
        edgeGeo.attributes.position.needsUpdate = true; edgeGeo.computeVertexNormals();
        var im = stMesh.instanceMatrix.array;
        for (var s = 0; s < NS; s++) {
          o = s * 7; frame(stitch[o], stitch[o + 1], stitch[o + 2], stitch[o + 3], stitch[o + 4], stitch[o + 5] + .07, 1.1, im, s * 16);
          // a stitch that crosses a pinched fold is rolled into the fold: it is not seen until the corner opens
          if (stitch[o + 6] >= 0 && th[stitch[o + 6]] > .6) { var q = s * 16; im[q] = im[q + 1] = im[q + 2] = im[q + 4] = im[q + 5] = im[q + 6] = im[q + 8] = im[q + 9] = im[q + 10] = 0; }
        }
        stMesh.instanceMatrix.needsUpdate = true;
        for (var i = 0; i < studs.length; i++) { var d = studs[i]; frame(d.x, d.z, 1, 0, d.side, 0, .5, tmp16, 0); d.o.matrix.fromArray(tmp16); d.o.matrixWorldNeedsUpdate = true; }
      }
      function place() {
        // the pen is set down behind the tray first, then the tray is lifted and turned over towards you
        var pk = WRK.clamp(flipP / .26, 0, 1), q = WRK.clamp((flipP - .2) / .8, 0, 1);
        flipE = E.inOut(q);
        body.rotation.x = Math.PI * flipE;
        body.position.y = WRK.lerp(TH, maxY, flipE) + Math.sin(Math.PI * flipE) * 84;
        view.target[1] = 10 + Math.sin(Math.PI * flipE) * 62;
        var up = E.out(WRK.clamp(pk / .4, 0, 1)), across = E.inOut(WRK.clamp((pk - .12) / .7, 0, 1)), down = E.inOut(WRK.clamp((pk - .62) / .38, 0, 1));
        pen.position.set(WRK.lerp(PEN_IN[0], PEN_OUT[0], across), PEN_IN[1] + 27 * up - (PEN_IN[1] + 27 - PEN_OUT[1]) * down, WRK.lerp(PEN_IN[2], PEN_OUT[2], across));
        pen.rotation.y = across * .07; penQ.rotation.y = 1.12 + across * .5;
        ctx.invalidate();
      }
      update(); place();

      /* ----- states ----- */
      var ORDER = [2, 3, 1, 0], from = [0, 0, 0, 0];   // front left, front right, back right, back left
      function release(u) { return u < .1 ? .16 * E.out(u / .1) : .16 + .84 * E.settle((u - .1) / .9); }   // the stud lets go, then the wall sinks and settles
      function pinch(u) { return u < .86 ? .95 * E.inOut(u / .86) : .95 + .05 * E.out((u - .86) / .14); }  // the wall comes up, then the stud clicks
      function setState(id, on, animate) {
        if (id === 'unsnap') {
          var target = on ? TH_REL : TH_MAX, gap = on ? 170 : 150, each = on ? 1500 : 1100, total = each + 3 * gap, curve = on ? release : pinch;
          if (animate === false) { th[0] = th[1] = th[2] = th[3] = target; update(); place(); return; }
          from[0] = th[0]; from[1] = th[1]; from[2] = th[2]; from[3] = th[3];
          ctx.look(null, on ? .86 : .72, 1500, on ? 1.14 : (flipP > .5 ? 1.14 : 1));
          return ctx.run(total, function (k) {
            for (var n = 0; n < 4; n++) { var ci = ORDER[n], u = WRK.clamp((k * total - n * gap) / each, 0, 1); th[ci] = from[ci] + (target - from[ci]) * curve(u); }
            update(); place();
          }, E.linear, 'fold');
        }
        if (id === 'turn') {
          var f0 = flipP, f1 = on ? 1 : 0;
          if (animate === false) { flipP = f1; place(); return; }
          ctx.look(null, on ? .84 : (th[0] < .5 ? .86 : .72), 2000, on ? 1.14 : (th[0] < .5 ? 1.14 : 1));
          return ctx.run(2300, function (k) { flipP = f0 + (f1 - f0) * k; place(); }, E.linear, 'flip');
        }
      }
      function setPersonal(p) { ctx.personal = p; paintTop(); ctx.invalidate(); }

      return { group: group, view: view, setState: setState, setPersonal: setPersonal };
    }
  });
})();
