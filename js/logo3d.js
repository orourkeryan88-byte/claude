/* ============================================
   RELIER — 3D Logo Engine
   Renders the RR monogram (4 mirrored Rs
   forming an X) as a spinning 3D plane
   via Three.js CanvasTexture.
   ============================================ */

(function () {
  'use strict';

  const THREE = window.THREE;
  if (!THREE) return;

  const instances = [];
  let rafRunning = false;

  /* ---- Draw RR Monogram to a 2D canvas ---- */
  function drawMonogram(canvas, opts) {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, w, h);

    if (opts.bgColor) {
      ctx.fillStyle = opts.bgColor;
      ctx.fillRect(0, 0, w, h);
    }

    const cx = w / 2;
    const cy = h / 2;
    const fontSize = Math.min(w, h) * (opts.fontScale || 0.29);

    /* Offsets — tuned so the R legs form the centre X */
    const ox = fontSize * 0.44;
    const oy = fontSize * 0.41;

    ctx.fillStyle = opts.color || '#ffffff';
    ctx.font = `900 ${fontSize}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    /* Top-left: normal R */
    ctx.save();
    ctx.translate(cx - ox, cy - oy);
    ctx.fillText('R', 0, 0);
    ctx.restore();

    /* Top-right: mirrored R (Я) */
    ctx.save();
    ctx.translate(cx + ox, cy - oy);
    ctx.scale(-1, 1);
    ctx.fillText('R', 0, 0);
    ctx.restore();

    /* Bottom-left: mirrored + flipped (180° of top-right) */
    ctx.save();
    ctx.translate(cx - ox, cy + oy);
    ctx.scale(-1, -1);
    ctx.fillText('R', 0, 0);
    ctx.restore();

    /* Bottom-right: flipped (180° of top-left) */
    ctx.save();
    ctx.translate(cx + ox, cy + oy);
    ctx.scale(1, -1);
    ctx.fillText('R', 0, 0);
    ctx.restore();

    /* Optional RELIER wordmark below monogram */
    if (opts.showWordmark) {
      const wFontSize = fontSize * 0.2;
      ctx.fillStyle = opts.color || '#ffffff';
      ctx.font = `700 ${wFontSize}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      /* Letter spacing via individual chars */
      const word = 'RELIER';
      const spacing = wFontSize * 0.55;
      const totalW = (word.length - 1) * spacing;
      word.split('').forEach((ch, i) => {
        ctx.fillText(ch, cx - totalW / 2 + i * spacing, cy + oy + fontSize * 0.68);
      });
    }
  }

  /* ---- Create Three.js CanvasTexture from monogram ---- */
  function makeTexture(opts) {
    const size = opts.texSize || 512;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    drawMonogram(c, opts);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  /* ---- Build a Three.js logo instance on a canvas element ---- */
  function createInstance(canvas, opts) {
    if (!canvas) return null;

    const w = canvas.clientWidth || canvas.width || 400;
    const h = canvas.clientHeight || canvas.height || 300;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: opts.alpha !== false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    renderer.outputEncoding = THREE.sRGBEncoding;
    if (opts.bgHex != null) renderer.setClearColor(opts.bgHex, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.01, 100);
    camera.position.z = opts.camZ || 5;

    /* Lighting */
    scene.add(new THREE.AmbientLight(0xffffff, opts.ambient || 0.65));

    const key = new THREE.DirectionalLight(0xffffff, opts.keyLight || 1.5);
    key.position.set(4, 5, 6);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xcccccc, 0.4);
    fill.position.set(-5, -2, 2);
    scene.add(fill);

    const rim = new THREE.PointLight(0xffffff, 0.35, 20);
    rim.position.set(0, 4, -4);
    scene.add(rim);

    const group = new THREE.Group();
    scene.add(group);

    /* Logo plane */
    const logoTex = makeTexture({
      texSize: 512,
      color: opts.logoColor || '#e8e8e6',
      bgColor: opts.drawBg ? opts.bgDrawColor : null,
      fontScale: 0.29,
      showWordmark: opts.showWordmark || false,
    });

    const planeSize = opts.planeSize || 3;
    const geo = new THREE.PlaneGeometry(planeSize, planeSize);
    const mat = new THREE.MeshStandardMaterial({
      map: logoTex,
      transparent: true,
      alphaTest: 0.05,
      metalness: opts.metalness || 0.35,
      roughness: opts.roughness || 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const plane = new THREE.Mesh(geo, mat);
    group.add(plane);

    /* Optional thin ring for feature section */
    if (opts.ring) {
      const ringGeo = new THREE.TorusGeometry(planeSize * 0.52, 0.018, 6, 90);
      const ringMat = new THREE.MeshStandardMaterial({
        color: opts.ringColor || 0x888880,
        metalness: 0.8,
        roughness: 0.2,
      });
      group.add(new THREE.Mesh(ringGeo, ringMat));
    }

    /* Resize observer */
    const ro = new ResizeObserver(() => {
      const nw = canvas.clientWidth;
      const nh = canvas.clientHeight;
      if (!nw || !nh) return;
      renderer.setSize(nw, nh, false);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    });
    ro.observe(canvas);

    return {
      renderer, scene, camera, group,
      rotSpeed:    opts.rotSpeed    || 0.006,
      floatAmp:    opts.floatAmp    || 0.09,
      floatSpeed:  opts.floatSpeed  || 0.65,
      parallax:    opts.parallax    || false,
      clock:       new THREE.Clock(),
      ro,
    };
  }

  /* ---- Render loop ---- */
  function startLoop() {
    if (rafRunning) return;
    rafRunning = true;
    (function tick() {
      requestAnimationFrame(tick);
      instances.forEach(inst => {
        if (!inst || !inst.renderer) return;
        const t = inst.clock.getElapsedTime();
        inst.group.rotation.y += inst.rotSpeed;
        inst.group.position.y = Math.sin(t * inst.floatSpeed) * inst.floatAmp;
        inst.renderer.render(inst.scene, inst.camera);
      });
    })();
  }

  /* ---- Mouse parallax for hero ---- */
  document.addEventListener('mousemove', function (e) {
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    instances.forEach(inst => {
      if (!inst || !inst.parallax || !inst.group) return;
      inst.group.rotation.x += (ny * 0.25 - inst.group.rotation.x) * 0.04;
      inst.group.rotation.y += (nx * 0.4  - inst.group.rotation.y) * 0.04;
    });
  }, { passive: true });

  /* ---- Helper ---- */
  function reg(canvas, opts) {
    const inst = createInstance(canvas, opts);
    if (!inst) return null;
    instances.push(inst);
    startLoop();
    return inst;
  }

  /* ---- Public API ---- */
  window.RelierLogo3D = {

    initHero: function (id, extra) {
      return reg(document.getElementById(id), Object.assign({
        alpha: false,
        bgHex:      0x0d0d0c,
        logoColor:  '#e8e8e6',
        planeSize:  4.6,
        camZ:       7.5,
        rotSpeed:   0.0035,
        floatAmp:   0.18,
        floatSpeed: 0.45,
        parallax:   true,
        metalness:  0.55,
        roughness:  0.3,
        ambient:    0.45,
        keyLight:   2.0,
      }, extra));
    },

    initFeature: function (id, extra) {
      return reg(document.getElementById(id), Object.assign({
        alpha: false,
        bgHex:      0x2a2a28,
        logoColor:  '#d4d4d0',
        planeSize:  5.2,
        camZ:       8.5,
        rotSpeed:   0.005,
        floatAmp:   0.22,
        floatSpeed: 0.55,
        ring:       true,
        ringColor:  0x555550,
        metalness:  0.45,
        roughness:  0.35,
      }, extra));
    },

    initShopHeader: function (id, extra) {
      return reg(document.getElementById(id), Object.assign({
        alpha:      true,
        logoColor:  '#1a1a18',
        planeSize:  3.2,
        camZ:       5.5,
        rotSpeed:   0.005,
        floatAmp:   0.07,
        floatSpeed: 0.75,
        metalness:  0.2,
        roughness:  0.6,
      }, extra));
    },

    initProduct: function (id, extra) {
      return reg(document.getElementById(id), Object.assign({
        alpha:      true,
        logoColor:  '#2a2a28',
        planeSize:  2.6,
        camZ:       4.5,
        rotSpeed:   0.005,
        floatAmp:   0.06,
        floatSpeed: 0.85,
        metalness:  0.2,
        roughness:  0.55,
      }, extra));
    },

    initSmall: function (id, extra) {
      return reg(document.getElementById(id), Object.assign({
        alpha:      true,
        logoColor:  '#d4d4d0',
        planeSize:  1.9,
        camZ:       3.2,
        rotSpeed:   0.009,
        floatAmp:   0.04,
        floatSpeed: 1.1,
        metalness:  0.3,
        roughness:  0.4,
      }, extra));
    },

    initCollectionCards: function () {
      document.querySelectorAll('.collection-logo-canvas').forEach(canvas => {
        const isDark = canvas.closest('.collection-card__image--dark') != null ||
                       canvas.closest('.collection-card__image')?.classList.contains('collection-card__image--dark');
        reg(canvas, {
          alpha:      true,
          logoColor:  isDark ? '#d4d4d0' : '#1a1a18',
          planeSize:  2.2,
          camZ:       3.8,
          rotSpeed:   0.007,
          floatAmp:   0.04,
          floatSpeed: 1.0,
          metalness:  0.25,
          roughness:  0.5,
        });
      });
    },

    destroy: function (inst) {
      if (!inst) return;
      const i = instances.indexOf(inst);
      if (i !== -1) instances.splice(i, 1);
      if (inst.ro) inst.ro.disconnect();
      if (inst.renderer) inst.renderer.dispose();
    },
  };

})();
