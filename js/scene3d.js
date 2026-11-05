/* EloraEd 3D layer: one fixed WebGL canvas behind the page with real 3D props
   (atom, books, flask, prism, magnet, bulb, planet, cap, pencil, notes, laptop).
   Each prop is anchored to a page element; deeper props drift slower (parallax),
   everything turns gently with time, scroll and the pointer.
   Usage: Scene3D.start([{ kind: "atom", at: "#videos", dy: .2, x: .85, z: -200, size: 150 }]) */
(function () {
  const T = window.THREE;
  if (!T) return;
  const D = 1000; // camera distance: z = 0 is drawn 1:1 with CSS pixels
  const C = { orange: 0xff7a1a, orange2: 0xf2541e, ember: 0xc42a2a, purple: 0x8e2bd6, lilac: 0xc99bff, cream: 0xfff4e4, plum: 0x2a0a2e, gold: 0xffc93c, yellow: 0xffe45c, steel: 0xd8d4dc };

  // three r128 treats hex colours as linear; convert so the brand colours come out true
  const lin = (c) => (typeof c === "number" ? new T.Color(c).convertSRGBToLinear() : c);
  const std = (color, o) => {
    const m = Object.assign({ color, roughness: .42, metalness: .05 }, o);
    m.color = lin(m.color);
    if (m.emissive !== undefined) m.emissive = lin(m.emissive);
    return new T.MeshStandardMaterial(m);
  };
  const metal = (color = C.steel, o) => std(color, Object.assign({ roughness: .22, metalness: .95 }, o));
  const glass = (color = 0xffffff, opacity = .22) => new T.MeshPhysicalMaterial({ color: lin(color), roughness: .04, metalness: 0, transparent: true, opacity, clearcoat: 1, clearcoatRoughness: .04, side: T.DoubleSide, depthWrite: false, envMapIntensity: 1.6 });
  const glow = (color) => new T.MeshBasicMaterial({ color: lin(color), toneMapped: false });

  function canvasTex(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }
  let glowTex;
  function halo(color, size, opacity = .55) {
    glowTex = glowTex || canvasTex(128, 128, (g, w) => {
      const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.25, "rgba(255,255,255,.45)"); r.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = r; g.fillRect(0, 0, w, w);
    });
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: lin(color), transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false }));
    s.scale.set(size, size, 1);
    return s;
  }

  /* ---------- props (each about 100 units across, centred on the origin) ---------- */
  const BUILD = {
    atom() {
      const g = new T.Group();
      const nucleus = new T.Group();
      const pm = std(C.orange, { emissive: C.orange2, emissiveIntensity: .3, roughness: .3 });
      const nm = std(C.lilac, { roughness: .3 });
      for (let i = 0; i < 9; i++) {
        const a = i * 2.39996, y = 1 - (i / 8) * 2, r = Math.sqrt(1 - y * y);
        const m = new T.Mesh(new T.SphereGeometry(7.5, 20, 16), i % 2 ? nm : pm);
        m.position.set(Math.cos(a) * r * 8, y * 8, Math.sin(a) * r * 8);
        nucleus.add(m);
      }
      g.add(nucleus, halo(C.orange, 70, .35));
      const ring = std(C.lilac, { roughness: .25, metalness: .4 });
      const em = std(C.purple, { emissive: C.purple, emissiveIntensity: .8, roughness: .3 });
      const pivots = [];
      for (let i = 0; i < 3; i++) {
        const o = new T.Group();
        o.rotation.set(1.25, 0, i * Math.PI / 3);
        o.add(new T.Mesh(new T.TorusGeometry(50, 1.3, 10, 96), ring));
        const p = new T.Group();
        const e = new T.Mesh(new T.SphereGeometry(5.5, 20, 16), em);
        e.position.x = 50; e.add(halo(C.lilac, 26, .6));
        p.add(e); o.add(p); g.add(o); pivots.push(p);
      }
      return { g, update: (t) => { pivots.forEach((p, i) => (p.rotation.z = t * (1.5 + i * .35) + i * 2.1)); nucleus.rotation.y = t * .6; } };
    },

    books() {
      const g = new T.Group();
      const pages = std(C.cream, { roughness: .8 });
      const spec = [[C.purple, 96, 15, 68], [C.orange2, 88, 13, 62], [C.ember, 80, 17, 58]];
      let y = -24;
      spec.forEach(([col, w, h, d], i) => {
        const b = new T.Group();
        const cover = std(col, { roughness: .55 });
        const top = new T.Mesh(new T.BoxGeometry(w, 2.2, d), cover); top.position.y = h / 2 - 1.1;
        const bot = top.clone(); bot.position.y = -h / 2 + 1.1;
        const spine = new T.Mesh(new T.BoxGeometry(3, h, d), cover); spine.position.x = -w / 2 + 1.5;
        const block = new T.Mesh(new T.BoxGeometry(w - 5, h - 4, d - 4), pages); block.position.x = 1.2;
        const band = new T.Mesh(new T.BoxGeometry(3.2, h + .4, d * .9), metal(C.gold, { roughness: .35 })); band.position.x = -w / 2 + 12;
        const stripe = new T.Mesh(new T.BoxGeometry(w * .5, .6, 6), metal(C.gold, { roughness: .35 })); stripe.position.set(6, h / 2 + .1, -d * .25);
        b.add(top, bot, spine, block, band, stripe);
        b.position.y = y + h / 2; y += h + .4;
        b.rotation.y = [0.18, -0.22, 0.12][i];
        b.position.x = [-2, 4, -3][i];
        g.add(b);
      });
      return { g };
    },

    flask() {
      const g = new T.Group();
      const prof = [[0, 0], [34, 0], [37, 3], [36, 8], [14, 60], [12, 64], [12, 84], [15.5, 86], [15.5, 89], [11, 89]].map(([x, y]) => new T.Vector2(x, y - 44));
      g.add(new T.Mesh(new T.LatheGeometry(prof, 48), glass(0xf6efff, .26)));
      const liq = [[0, 2.5], [33, 2.5], [35, 6], [22, 30], [0, 30]].map(([x, y]) => new T.Vector2(x, y - 44));
      const lm = std(C.orange, { emissive: C.orange2, emissiveIntensity: .45, transparent: true, opacity: .82, roughness: .15 });
      g.add(new T.Mesh(new T.LatheGeometry(liq, 48), lm));
      const surf = new T.Mesh(new T.CircleGeometry(22, 40), std(C.yellow, { emissive: C.orange, emissiveIntensity: .5, transparent: true, opacity: .9 }));
      surf.rotation.x = -Math.PI / 2; surf.position.y = 30 - 44;
      g.add(surf, halo(C.orange, 90, .25));
      const bubbles = [];
      const bm = glass(0xffffff, .55);
      for (let i = 0; i < 7; i++) {
        const b = new T.Mesh(new T.SphereGeometry(2 + (i % 3), 12, 10), bm);
        b.userData = { a: i * 2.4, r: 6 + (i * 7) % 16, s: .5 + (i % 4) * .18, o: i / 7 };
        bubbles.push(b); g.add(b);
      }
      return { g, update: (t) => bubbles.forEach((b) => {
        const u = b.userData, k = (t * u.s + u.o) % 1, y = -40 + k * 28, rr = u.r * (1 - k * .35);
        b.position.set(Math.cos(u.a) * rr, y, Math.sin(u.a) * rr);
        b.scale.setScalar(.6 + k * .6);
      }) };
    },

    prism() {
      const g = new T.Group();
      const geo = new T.CylinderGeometry(44, 44, 54, 3);
      const p = new T.Mesh(geo, glass(0xe9f6ff, .3));
      p.rotation.set(Math.PI / 2, 0, 0); p.rotation.y = Math.PI / 2; // triangle faces the camera
      const prism = new T.Group(); prism.add(p);
      const edges = new T.LineSegments(new T.EdgesGeometry(geo), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7 }));
      edges.rotation.copy(p.rotation); prism.add(edges);
      prism.rotation.z = Math.PI / 2; // apex up
      g.add(prism);
      const beam = (len, color, w = 2.6) => { const m = new T.Mesh(new T.BoxGeometry(len, w, w), glow(color)); m.geometry.translate(len / 2, 0, 0); return m; };
      const inB = beam(130, 0xffffff, 3.2); inB.position.set(-142, -26, 0); inB.rotation.z = .2; g.add(inB);
      const fan = new T.Group(); fan.position.set(14, -4, 0);
      [0xff4d5e, 0xff9a3c, 0xffe45c, 0x3ddc97, 0x4aa8ff, 0x8e5bff].forEach((c, i) => {
        const b = beam(130, c, 2.4); b.rotation.z = -.12 - i * .075; fan.add(b);
      });
      g.add(fan, halo(0xffffff, 60, .35));
      return { g, face: true, update: (t) => { fan.children.forEach((b, i) => (b.scale.x = .9 + .1 * Math.sin(t * 2 + i))); } };
    },

    magnet() {
      const g = new T.Group();
      const red = std(C.ember, { roughness: .35, metalness: .2 });
      const blue = std(0x3a5bd9, { roughness: .35, metalness: .2 });
      const arcR = std(C.ember, { roughness: .35, metalness: .2 });
      const arc = new T.Mesh(new T.TorusGeometry(32, 12, 20, 48, Math.PI), arcR);
      arc.rotation.z = Math.PI; arc.position.y = -10;
      const legL = new T.Mesh(new T.CylinderGeometry(12, 12, 34, 24), red); legL.position.set(-32, 7, 0);
      const legR = new T.Mesh(new T.CylinderGeometry(12, 12, 34, 24), blue); legR.position.set(32, 7, 0);
      const tipM = metal();
      const tipL = new T.Mesh(new T.CylinderGeometry(12.2, 12.2, 14, 24), tipM); tipL.position.set(-32, 31, 0);
      const tipR = tipL.clone(); tipR.position.x = 32;
      g.add(arc, legL, legR, tipL, tipR);
      // field lines between the poles
      const lines = new T.Group();
      for (let i = 1; i <= 3; i++) {
        const curve = new T.QuadraticBezierCurve3(new T.Vector3(-32, 40, 0), new T.Vector3(0, 40 + i * 22, 0), new T.Vector3(32, 40, 0));
        lines.add(new T.Mesh(new T.TubeGeometry(curve, 32, .8, 6), new T.MeshBasicMaterial({ color: lin(C.lilac), transparent: true, opacity: .55 })));
      }
      g.add(lines);
      g.position.y = -8;
      return { g, update: (t) => lines.children.forEach((l, i) => (l.material.opacity = .25 + .35 * (.5 + .5 * Math.sin(t * 2.2 - i)))) };
    },

    bulb() {
      const g = new T.Group();
      const glassM = new T.MeshPhysicalMaterial({ color: lin(0xfff6d8), emissive: lin(C.gold), emissiveIntensity: .55, roughness: .08, transparent: true, opacity: .62, clearcoat: 1, depthWrite: false });
      const ball = new T.Mesh(new T.SphereGeometry(32, 40, 32), glassM); ball.position.y = 14;
      const neck = new T.Mesh(new T.CylinderGeometry(16, 13, 16, 32, 1, true), glassM); neck.position.y = -18;
      const fil = new T.Mesh(new T.TorusKnotGeometry(6, 1, 64, 6, 2, 5), glow(0xffd27a)); fil.position.y = 12;
      const base = new T.Group();
      const bm = metal(0xbfb8c4);
      for (let i = 0; i < 4; i++) { const r = new T.Mesh(new T.TorusGeometry(12.5, 2.2, 10, 32), bm); r.rotation.x = Math.PI / 2; r.position.y = -28 - i * 5; base.add(r); }
      const core = new T.Mesh(new T.CylinderGeometry(12, 9, 22, 24), bm); core.position.y = -36; base.add(core);
      const tip = new T.Mesh(new T.SphereGeometry(5, 16, 12), std(C.plum)); tip.position.y = -48; base.add(tip);
      const h = halo(C.gold, 150, .5); h.position.y = 14;
      g.add(ball, neck, fil, base, h);
      return { g, update: (t) => { const k = .45 + .12 * Math.sin(t * 3.1) + .05 * Math.sin(t * 11); glassM.emissiveIntensity = k; h.material.opacity = k * .95; } };
    },

    planet() {
      const g = new T.Group();
      const tex = canvasTex(256, 128, (c, w, h) => {
        const cols = ["#5a1a8a", "#8e2bd6", "#b06cf0", "#7a2fc0", "#c99bff", "#6b22a8", "#9b45e0", "#4e1478"];
        for (let i = 0; i < 16; i++) { c.fillStyle = cols[i % cols.length]; c.fillRect(0, (i / 16) * h, w, h / 16 + 1); }
        c.globalAlpha = .25; c.fillStyle = "#ff7a1a"; c.beginPath(); c.ellipse(w * .62, h * .58, 26, 10, 0, 0, 7); c.fill();
      });
      const ball = new T.Mesh(new T.SphereGeometry(34, 48, 32), std(0xffffff, { map: tex, roughness: .6 }));
      const ring = new T.Mesh(new T.RingGeometry(46, 66, 96), std(C.lilac, { side: T.DoubleSide, transparent: true, opacity: .75, roughness: .4, metalness: .2 }));
      ring.rotation.x = Math.PI / 2.25;
      const tilt = new T.Group(); tilt.rotation.z = .35; tilt.add(ball, ring);
      const moonPivot = new T.Group();
      const moon = new T.Mesh(new T.SphereGeometry(7, 24, 16), std(C.orange, { emissive: C.orange2, emissiveIntensity: .35 }));
      moon.position.x = 88; moonPivot.add(moon); moonPivot.rotation.x = .4;
      g.add(tilt, moonPivot);
      return { g, update: (t) => { ball.rotation.y = t * .4; moonPivot.rotation.y = t * .9; } };
    },

    cap() {
      const g = new T.Group();
      const cloth = std(C.plum, { roughness: .75 });
      const board = new T.Mesh(new T.BoxGeometry(92, 4, 92), cloth); board.rotation.y = Math.PI / 4; board.position.y = 12;
      const skull = new T.Mesh(new T.CylinderGeometry(30, 33, 26, 40, 1, true), std(C.plum, { roughness: .75, side: T.DoubleSide })); skull.position.y = -3;
      const btn = new T.Mesh(new T.CylinderGeometry(5, 5, 3, 20), metal(C.gold)); btn.position.y = 15.5;
      const cord = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 46, 8), std(C.gold)); cord.geometry.translate(0, -23, 0);
      const tassel = new T.Mesh(new T.ConeGeometry(5, 16, 16), std(C.gold)); tassel.position.y = -46;
      const swing = new T.Group(); swing.position.set(46, 14, 0); swing.add(cord, tassel);
      g.add(board, skull, btn, swing);
      return { g, update: (t) => { swing.rotation.z = Math.sin(t * 1.7) * .18; swing.rotation.x = Math.sin(t * 1.3) * .12; } };
    },

    pencil() {
      const g = new T.Group();
      const body = new T.Mesh(new T.CylinderGeometry(7.5, 7.5, 92, 6), std(C.orange, { roughness: .45 }));
      const wood = new T.Mesh(new T.CylinderGeometry(7.5, 1.6, 20, 6), std(0xf2cfa0, { roughness: .8 })); wood.position.y = -56;
      const lead = new T.Mesh(new T.ConeGeometry(1.6, 5, 12), std(0x2a2a30, { roughness: .3, metalness: .4 })); lead.position.y = -68.5; lead.rotation.x = Math.PI;
      const ferrule = new T.Mesh(new T.CylinderGeometry(7.9, 7.9, 10, 24), metal(0xd9cfa0)); ferrule.position.y = 51;
      const eraser = new T.Mesh(new T.CylinderGeometry(7.6, 7.6, 10, 24), std(0xff8fa8, { roughness: .9 })); eraser.position.y = 61;
      g.add(body, wood, lead, ferrule, eraser);
      g.rotation.z = -.75;
      return { g };
    },

    notes() {
      const g = new T.Group();
      const lined = canvasTex(256, 330, (c, w, h) => {
        c.fillStyle = "#fffaf1"; c.fillRect(0, 0, w, h);
        c.strokeStyle = "#b9c9f0"; c.lineWidth = 2;
        for (let y = 50; y < h; y += 22) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
        c.strokeStyle = "#ff8a8a"; c.beginPath(); c.moveTo(38, 0); c.lineTo(38, h); c.stroke();
        c.strokeStyle = "#5a2a7a"; c.lineWidth = 3; c.lineCap = "round";
        for (let r = 0; r < 9; r++) { // handwriting-like scribbles
          c.beginPath(); let x = 50; const y = 46 + r * 22, end = 70 + ((r * 97) % 150);
          c.moveTo(x, y); while (x < end) { x += 6; c.lineTo(x, y - 4 - Math.abs(Math.sin(x * .37 + r)) * 8); x += 6; c.lineTo(x, y); }
          c.stroke();
        }
        c.fillStyle = "#ff7a1a"; c.font = "bold 30px serif"; c.fillText("P = F/A", 120, 290);
      });
      const paper = std(0xfffaf1, { roughness: .85 });
      for (let i = 0; i < 4; i++) {
        const mats = [paper, paper, i === 3 ? std(0xffffff, { map: lined, roughness: .85 }) : paper, paper, paper, paper];
        const s = new T.Mesh(new T.BoxGeometry(72, 1.2, 94), mats);
        s.position.y = i * 1.6 - 3; s.rotation.y = (i - 1.5) * .07;
        g.add(s);
      }
      const clip = new T.Mesh(new T.TorusGeometry(7, 1.1, 8, 32, Math.PI * 1.6), metal());
      clip.position.set(-26, 4, -46); clip.rotation.set(0, Math.PI / 2, Math.PI / 2);
      g.add(clip);
      g.rotation.x = .95;
      return { g, face: true };
    },

    laptop() {
      const g = new T.Group();
      const alu = metal(0xcfc8d6, { roughness: .35, metalness: .8 });
      const base = new T.Mesh(new T.BoxGeometry(116, 5, 78), alu); base.position.y = -2.5;
      const keys = new T.Mesh(new T.BoxGeometry(96, .6, 36), std(0x3a2a40)); keys.position.set(0, .3, -10);
      const pad = new T.Mesh(new T.BoxGeometry(34, .5, 20), std(0xb8b0c0, { roughness: .3 })); pad.position.set(0, .2, 22);
      const screenTex = canvasTex(320, 200, (c, w, h) => {
        const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#ff7a1a"); gr.addColorStop(.5, "#f2541e"); gr.addColorStop(1, "#8e2bd6");
        c.fillStyle = gr; c.fillRect(0, 0, w, h);
        c.fillStyle = "rgba(255,255,255,.92)"; c.beginPath(); c.arc(w / 2, h / 2 - 6, 30, 0, 7); c.fill();
        c.fillStyle = "#f2541e"; c.beginPath(); c.moveTo(w / 2 - 9, h / 2 - 22); c.lineTo(w / 2 + 15, h / 2 - 6); c.lineTo(w / 2 - 9, h / 2 + 10); c.fill();
        c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(24, h - 30, w - 48, 6);
        c.fillStyle = "#fff"; c.fillRect(24, h - 30, (w - 48) * .62, 6);
      });
      const lid = new T.Group(); lid.position.set(0, 0, -39);
      const shell = new T.Mesh(new T.BoxGeometry(116, 76, 3.5), alu); shell.position.y = 38;
      const screen = new T.Mesh(new T.PlaneGeometry(106, 66), new T.MeshBasicMaterial({ map: screenTex, toneMapped: false })); screen.position.set(0, 38, 1.9);
      lid.add(shell, screen); lid.rotation.x = -.28;
      const h = halo(C.orange, 140, .22); h.position.set(0, 38, -30);
      g.add(base, keys, pad, lid, h);
      g.rotation.x = .25;
      return { g, face: true };
    },
  };

  function envMap(renderer) {
    const tex = canvasTex(256, 128, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, "#fff4e4"); gr.addColorStop(.45, "#ffb47a"); gr.addColorStop(.55, "#8e2bd6"); gr.addColorStop(1, "#2a0a2e");
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = "#ffffff"; c.fillRect(40, 18, 40, 16); c.fillRect(170, 26, 30, 10);
    });
    tex.mapping = T.EquirectangularReflectionMapping;
    const pm = new T.PMREMGenerator(renderer);
    const env = pm.fromEquirectangular(tex).texture;
    pm.dispose(); tex.dispose();
    return env;
  }

  function start(items) {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer;
    const canvas = document.createElement("canvas");
    canvas.className = "scene3d";
    canvas.setAttribute("aria-hidden", "true");
    try {
      renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    } catch (e) { return; } // no WebGL: the page works without the props
    document.body.prepend(canvas);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .95;

    const scene = new T.Scene();
    scene.environment = envMap(renderer);
    const cam = new T.PerspectiveCamera(50, 1, 20, 6000);
    scene.add(new T.HemisphereLight(0xfff1e0, 0x3a1d45, .55));
    const key = new T.DirectionalLight(0xfff0dc, 1.7); key.position.set(-500, 700, 900); scene.add(key);
    const rim = new T.DirectionalLight(0xb48cff, 1.1); rim.position.set(600, -150, -500); scene.add(rim);
    const warm = new T.DirectionalLight(0xff9a4a, .45); warm.position.set(400, -500, 600); scene.add(warm);
    // lights are directional, so they follow the camera's height for free

    const objs = items.map((it, i) => {
      const b = BUILD[it.kind]();
      const holder = new T.Group();
      holder.add(b.g);
      scene.add(holder);
      const seed = Math.sin((i + 1) * 12.9898) * 43758.5 % 1;
      return { it, b, holder, seed: Math.abs(seed) * 6.28, spin: (it.spin ?? b.spin ?? 1) * (i % 2 ? -1 : 1), base: new T.Vector3(), roll: 0 };
    });

    window.__props3d = objs; // handy for debugging in the console
    let vw = 0, vh = 0, mobile = false;
    function layout() {
      vw = innerWidth; vh = innerHeight; mobile = vw < 760;
      renderer.setSize(vw, vh, false);
      cam.aspect = vw / vh;
      cam.fov = 2 * Math.atan(vh / 2 / D) * 180 / Math.PI;
      cam.updateProjectionMatrix();
      const room = (vw - 1180) / 2; // free margin beside the content column
      const tight = !mobile && room < 170;
      const sf = mobile ? .8 : Math.min(1.7, Math.max(1.1, vw / 1000)) * (tight ? .8 : 1);
      for (const o of objs) {
        const el = document.querySelector(o.it.at);
        o.on = !!el && !(mobile && o.it.mobile === false);
        o.holder.visible = false;
        if (!o.on) continue;
        const z = o.it.z || 0, k = (D - z) / D;
        const P = el.getBoundingClientRect().top + scrollY + (o.it.dy || 0) * vh;
        const x = (mobile || tight) && !o.it.keep ? Math.sign(o.it.x) * Math.max(.95, Math.abs(o.it.x)) : o.it.x;
        o.base.set(x * vw / 2 * k, -P, z);
        o.holder.position.copy(o.base);
        o.holder.scale.setScalar(o.it.size * sf * k / 100);
      }
    }

    let mx = 0, my = 0, tmx = 0, tmy = 0, lastY = scrollY, vel = 0;
    addEventListener("pointermove", (e) => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; }, { passive: true });
    let queued = false;
    const relayout = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; layout(); if (reduced) frame(0); }); };
    addEventListener("resize", relayout);
    new ResizeObserver(relayout).observe(document.body);

    const t0 = performance.now();
    function frame(now) {
      const t = reduced ? 2 : (now - t0) / 1000;
      const sy = scrollY;
      vel += (sy - lastY) * .0035; lastY = sy; vel *= .9;
      mx += (tmx - mx) * .06; my += (tmy - my) * .06;
      cam.position.set(mx * 30, -(sy + vh / 2) - my * 20, D);
      cam.lookAt(mx * 10, -(sy + vh / 2), 0);
      for (const o of objs) {
        const { holder, b, seed, spin } = o;
        // only props within reach of the screen are drawn and animated
        holder.visible = !!o.on && Math.abs(o.base.y + sy + vh / 2) < vh * 1.6;
        if (!holder.visible) continue;
        o.roll += vel * spin;
        holder.position.set(o.base.x, o.base.y + Math.sin(t * .8 + seed) * 10, o.base.z);
        holder.rotation.y = b.face ? Math.sin(t * .4 + seed) * .35 + Math.sin(o.roll) * .3 + mx * .5 : seed + t * .22 * spin + o.roll + mx * .5;
        holder.rotation.x = Math.sin(t * .5 + seed) * .14 + my * .35;
        holder.rotation.z = Math.sin(t * .37 + seed * 2) * .06;
        b.update && b.update(t);
      }
      renderer.render(scene, cam);
      if (!reduced) requestAnimationFrame(frame);
    }
    layout();
    if (reduced) { addEventListener("scroll", () => frame(0), { passive: true }); frame(0); }
    else requestAnimationFrame(frame);
  }

  window.Scene3D = { start };
})();
