/* ============================================
   RELIER — 3D Logo Engine (Three.js)
   Renders the "RELIER" wordmark as a 3D
   extruded object on any canvas element.
   ============================================ */

(function () {
  'use strict';

  const THREE = window.THREE;
  if (!THREE) return;

  const instances = [];
  let rafId = null;

  /* ---- Shared assets ---- */
  let sharedFont = null;
  const fontCallbacks = [];
  let fontLoading = false;

  function loadFont(cb) {
    if (sharedFont) { cb(sharedFont); return; }
    fontCallbacks.push(cb);
    if (fontLoading) return;
    fontLoading = true;

    const loader = new THREE.FontLoader();
    /* Fallback: build a simple custom font-like geometry using shapes */
    loader.load(
      'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json',
      function (font) {
        sharedFont = font;
        fontCallbacks.forEach(fn => fn(font));
        fontCallbacks.length = 0;
      },
      undefined,
      function () {
        /* Font failed to load — use box-letter fallback */
        fontCallbacks.forEach(fn => fn(null));
        fontCallbacks.length = 0;
      }
    );
  }

  /* ---- Colour themes ---- */
  const themes = {
    dark: {
      background: 0x1a1a18,
      logoColor: 0xd4d4d0,
      emissive: 0x333330,
      envLight: 0x444440,
    },
    light: {
      background: 0xe8e8e6,
      logoColor: 0x1a1a18,
      emissive: 0x888884,
      envLight: 0xffffff,
    },
    transparent: {
      background: null,
      logoColor: 0xd4d4d0,
      emissive: 0x555550,
      envLight: 0xaaaaaa,
    },
  };

  /* ---- Create a single 3D logo instance ---- */
  function createLogoInstance(canvas, opts) {
    const theme = themes[opts.theme] || themes.dark;
    const width = canvas.clientWidth || canvas.width || 400;
    const height = canvas.clientHeight || canvas.height || 200;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: theme.background === null,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.outputEncoding = THREE.sRGBEncoding;
    if (theme.background !== null) renderer.setClearColor(theme.background, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, opts.camZ || 6);

    /* Lighting */
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dir1.position.set(5, 5, 5);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(theme.envLight, 0.6);
    dir2.position.set(-5, -3, 2);
    scene.add(dir2);
    const pointLight = new THREE.PointLight(0xffffff, 0.4, 20);
    pointLight.position.set(0, 3, 4);
    scene.add(pointLight);

    let logoMesh = null;
    let group = new THREE.Group();
    scene.add(group);

    /* Build geometry once font is ready */
    function buildLogo(font) {
      /* Remove old */
      while (group.children.length) group.remove(group.children[0]);

      if (font) {
        const textGeo = new THREE.TextGeometry(opts.text || 'RELIER', {
          font,
          size: opts.size || 0.7,
          height: opts.depth || 0.18,
          curveSegments: 12,
          bevelEnabled: true,
          bevelThickness: 0.025,
          bevelSize: 0.012,
          bevelSegments: 5,
        });

        textGeo.computeBoundingBox();
        const bb = textGeo.boundingBox;
        const cx = -(bb.max.x - bb.min.x) / 2;
        const cy = -(bb.max.y - bb.min.y) / 2;
        textGeo.translate(cx, cy, 0);

        const mat = new THREE.MeshStandardMaterial({
          color: theme.logoColor,
          emissive: theme.emissive,
          metalness: 0.4,
          roughness: 0.3,
        });

        logoMesh = new THREE.Mesh(textGeo, mat);
        group.add(logoMesh);
      } else {
        /* Fallback: simple block letters using boxes */
        buildFallbackLogo(group, theme);
      }
    }

    function buildFallbackLogo(g, t) {
      const mat = new THREE.MeshStandardMaterial({
        color: t.logoColor,
        emissive: t.emissive,
        metalness: 0.3,
        roughness: 0.4,
      });
      const letters = 'RELIER'.split('');
      const spacing = 0.9;
      const startX = -(letters.length - 1) * spacing * 0.5;
      letters.forEach((_, i) => {
        const geo = new THREE.BoxGeometry(0.65, 0.8, 0.15);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.x = startX + i * spacing;
        g.add(mesh);
      });
    }

    loadFont(buildLogo);

    /* Resize handler */
    const ro = new ResizeObserver(() => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(canvas);

    const inst = {
      renderer, scene, camera, group,
      rotSpeed: opts.rotSpeed || 0.004,
      floatSpeed: opts.floatSpeed || 0.8,
      floatAmp: opts.floatAmp || 0.06,
      mouseX: 0, mouseY: 0,
      clock: new THREE.Clock(),
      isHero: opts.isHero || false,
      ro,
    };
    return inst;
  }

  /* ---- Animation loop ---- */
  function tick(t) {
    rafId = requestAnimationFrame(tick);
    instances.forEach(inst => {
      if (!inst.renderer) return;
      const elapsed = inst.clock.getElapsedTime();

      if (inst.isHero) {
        inst.group.rotation.y += inst.rotSpeed;
        inst.group.rotation.x = Math.sin(elapsed * inst.floatSpeed) * 0.06;
        inst.group.position.y = Math.sin(elapsed * inst.floatSpeed) * inst.floatAmp;
      } else {
        inst.group.rotation.y += inst.rotSpeed;
        inst.group.position.y = Math.sin(elapsed * inst.floatSpeed) * inst.floatAmp;
      }

      inst.renderer.render(inst.scene, inst.camera);
    });
  }

  /* ---- Mouse parallax for hero ---- */
  document.addEventListener('mousemove', function (e) {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    instances.forEach(inst => {
      if (inst.isHero) {
        inst.group.rotation.x += (ny * 0.15 - inst.group.rotation.x) * 0.05;
        inst.group.rotation.y += (nx * 0.25 - inst.group.rotation.y) * 0.05;
      }
    });
  });

  /* ---- Public API ---- */
  window.RelierLogo3D = {

    /* Full-screen hero canvas with spinning logo */
    initHero: function (canvasId, opts) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const inst = createLogoInstance(canvas, {
        text: 'RELIER',
        size: 1.2,
        depth: 0.3,
        theme: 'dark',
        camZ: 7,
        rotSpeed: 0.003,
        floatAmp: 0.12,
        floatSpeed: 0.5,
        isHero: true,
        ...opts,
      });
      instances.push(inst);
      if (instances.length === 1) tick();
      return inst;
    },

    /* Feature section canvas */
    initFeature: function (canvasId, opts) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const inst = createLogoInstance(canvas, {
        text: 'RELIER',
        size: 1.6,
        depth: 0.4,
        theme: 'dark',
        camZ: 8,
        rotSpeed: 0.006,
        floatAmp: 0.15,
        floatSpeed: 0.6,
        ...opts,
      });
      instances.push(inst);
      if (instances.length === 1) tick();
      return inst;
    },

    /* Email / footer small canvases */
    initSmall: function (canvasId, opts) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const inst = createLogoInstance(canvas, {
        text: 'RELIER',
        size: 0.5,
        depth: 0.12,
        theme: 'transparent',
        camZ: 4,
        rotSpeed: 0.008,
        floatAmp: 0.04,
        floatSpeed: 1.0,
        ...opts,
      });
      instances.push(inst);
      if (instances.length === 1) tick();
      return inst;
    },

    /* Shop header canvas */
    initShopHeader: function (canvasId, opts) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const inst = createLogoInstance(canvas, {
        text: 'RELIER',
        size: 1.0,
        depth: 0.25,
        theme: 'light',
        camZ: 6,
        rotSpeed: 0.004,
        floatAmp: 0.08,
        floatSpeed: 0.7,
        ...opts,
      });
      instances.push(inst);
      if (instances.length === 1) tick();
      return inst;
    },

    /* Product page canvas */
    initProduct: function (canvasId, opts) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const inst = createLogoInstance(canvas, {
        text: 'RELIER',
        size: 0.8,
        depth: 0.2,
        theme: 'light',
        camZ: 5,
        rotSpeed: 0.005,
        floatAmp: 0.06,
        floatSpeed: 0.8,
        ...opts,
      });
      instances.push(inst);
      if (instances.length === 1) tick();
      return inst;
    },

    /* Collection card canvases */
    initCollectionCards: function () {
      document.querySelectorAll('.collection-logo-canvas').forEach(canvas => {
        const text = canvas.dataset.text || 'RELIER';
        const bgEl = canvas.closest('.collection-card__image');
        const isDark = bgEl && bgEl.classList.contains('collection-card__image--dark');
        const inst = createLogoInstance(canvas, {
          text,
          size: 0.45,
          depth: 0.1,
          theme: isDark ? 'dark' : 'light',
          camZ: 3.5,
          rotSpeed: 0.006,
          floatAmp: 0.04,
          floatSpeed: 1.0,
        });
        instances.push(inst);
      });
      if (instances.length > 0 && !rafId) tick();
    },

    destroy: function (inst) {
      if (!inst) return;
      const idx = instances.indexOf(inst);
      if (idx !== -1) instances.splice(idx, 1);
      if (inst.ro) inst.ro.disconnect();
      inst.renderer.dispose();
    },
  };

})();
