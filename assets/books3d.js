// The BAZZ books as real 3D books floating in the night sky.
// Hover lifts a book and turns it to you; click opens its page.
import * as THREE from './three.module.min.js';

function spineTex(title, bg, ink) {
  const c = document.createElement('canvas'); c.width = 96; c.height = 1024;
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 96, 1024);
  g.fillStyle = ink; g.fillRect(0, 60, 96, 3); g.fillRect(0, 960, 96, 3);
  g.save(); g.translate(58, 512); g.rotate(Math.PI / 2);
  g.font = '700 34px Arial, sans-serif'; g.textAlign = 'center'; g.fillText(title, 0, 0); g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function pagesTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = '#EFE8DA'; g.fillRect(0, 0, 64, 256);
  g.strokeStyle = 'rgba(120,110,95,.35)';
  for (let i = 2; i < 64; i += 3) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
}

export function mountBooks(el, books, onOpen) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch (e) { return false; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xc8d2ff, 0x14100a, .9));
  const key = new THREE.DirectionalLight(0xfff1dc, 1.6); key.position.set(3, 6, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7f90ff, .9); rim.position.set(-6, 3, -5); scene.add(rim);

  const W = 1.5, H = W * 1.414, D = 0.2;
  const loader = new THREE.TextureLoader(), pages = pagesTex(), glow = glowTex();
  const items = [];
  books.forEach((b, i) => {
    const cover = loader.load(b.cover, () => wake()); cover.colorSpace = THREE.SRGBColorSpace; cover.anisotropy = 8;
    const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: .45, metalness: .05 }, o));
    const mats = [std({ map: pages, roughness: .9 }), std({ map: spineTex(b.title, b.color, b.ink) }), std({ map: pages, roughness: .9 }),
      std({ map: pages, roughness: .9 }), std({ map: cover, emissive: 0xffffff, emissiveMap: cover, emissiveIntensity: .22, roughness: .35 }), std({ color: b.color })];
    const book = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mats);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.8, W * 0.45),
      new THREE.MeshBasicMaterial({ map: glow, color: new THREE.Color(b.ink), transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
    pool.rotation.x = 0;
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.6, H * 1.9),
      new THREE.MeshBasicMaterial({ map: glow, color: new THREE.Color(b.ink), transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false }));
    const g = new THREE.Group(); g.add(halo, book, pool); scene.add(g);
    halo.position.z = -0.6;
    book.userData = { i, url: b.url };
    items.push({ g, book, pool, halo, base: new THREE.Vector3(), lift: 0, turn: 0, i });
  });

  // a few stars in front of the camera for depth
  const N = 160, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 16; pos[i * 3 + 1] = (Math.random() - .5) * 10; pos[i * 3 + 2] = -2 - Math.random() * 6; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xE8E4F0, size: .03, transparent: true, opacity: .7, depthWrite: false }));
  scene.add(stars);

  let layoutW = 1, layoutH = 1, cx = 0, cy = 0;
  function layout(aspect) {
    const n = items.length;
    if (aspect >= 0.95) {            // one row with a gentle arc
      const gap = 2.1;
      items.forEach((it, k) => { const a = k - (n - 1) / 2; it.base.set(a * gap, 0, -Math.abs(a) * 0.35); it.yaw = -a * 0.16; });
      layoutW = (n - 1) * gap + W * 1.6; layoutH = H * 1.7;
    } else {                         // phones: rows of 2, last one centred
      const gx = 1.95, gy = H + 1.05, rows = Math.ceil(n / 2);
      items.forEach((it, k) => {
        const r = Math.floor(k / 2), inRow = Math.min(2, n - r * 2), c = k % 2;
        it.base.set(inRow === 1 ? 0 : (c === 0 ? -gx / 2 : gx / 2), ((rows - 1) / 2 - r) * gy, 0); it.yaw = inRow === 1 ? 0 : (c === 0 ? .12 : -.12);
      });
      layoutW = gx + W * 1.5; layoutH = (rows - 1) * gy + H * 1.5;
    }
  }
  function resize() {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.setProperty('width', w + 'px', 'important'); renderer.domElement.style.setProperty('height', h + 'px', 'important');
    camera.aspect = w / h; layout(camera.aspect);
    const vf = THREE.MathUtils.degToRad(camera.fov / 2);
    const dH = (layoutH / 2) / Math.tan(vf), dW = (layoutW / 2) / (Math.tan(vf) * camera.aspect);
    camera.position.set(0, 0, Math.max(dH, dW) + 0.6); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); wake();
  }
  new ResizeObserver(resize).observe(el);

  const ray = new THREE.Raycaster(), m = new THREE.Vector2(); let hover = null, px = 0, py = 0, downX = 0, downY = 0;
  const meshes = items.map(it => it.book);
  const pick = e => { const r = el.getBoundingClientRect(); m.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(m, camera); const h = ray.intersectObjects(meshes)[0]; return h ? h.object : null; };
  el.addEventListener('pointermove', e => { hover = pick(e); el.style.cursor = hover ? 'pointer' : 'default'; const r = el.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - .5; py = (e.clientY - r.top) / r.height - .5; wake(); });
  el.addEventListener('pointerleave', () => { hover = null; px = py = 0; wake(); });
  el.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; });
  el.addEventListener('pointerup', e => { if (Math.hypot(e.clientX - downX, e.clientY - downY) > 10) return; const b = pick(e); if (b) onOpen(b.userData.url); });

  let visible = true, raf = null, last = 0; const t0 = performance.now();
  new IntersectionObserver(es => { visible = es[0].isIntersecting; wake(); }).observe(el);
  document.addEventListener('visibilitychange', wake);
  function wake() { if (raf === null && visible && !document.hidden) raf = requestAnimationFrame(loop); }
  function loop(now) {
    raf = null;
    const dt = Math.min(50, now - (last || now)); last = now; const t = (now - t0) / 1000;
    const k = 1 - Math.pow(0.88, dt / 16.7); let moving = false;
    items.forEach(it => {
      const on = hover === it.book;
      it.lift += ((on ? 1 : 0) - it.lift) * k; if (Math.abs((on ? 1 : 0) - it.lift) > .002) moving = true;
      const bob = reduce ? 0 : Math.sin(t * 1.1 + it.i * 1.3) * 0.06;
      it.g.position.set(it.base.x, it.base.y + bob + it.lift * 0.25, it.base.z + it.lift * 0.5);
      it.book.rotation.y = it.yaw * (1 - it.lift) + (reduce ? 0 : Math.sin(t * .6 + it.i) * 0.05);
      it.book.rotation.x = -0.04;
      it.pool.position.set(0, -H / 2 - 0.12 - bob, -0.15); it.pool.material.opacity = .22 + it.lift * .3;
      it.halo.material.opacity = .1 + it.lift * .18;
    });
    scene.rotation.y += ((reduce ? 0 : px * 0.18) - scene.rotation.y) * k * .6;
    scene.rotation.x += ((reduce ? 0 : py * 0.08) - scene.rotation.x) * k * .6;
    if (!reduce) stars.rotation.y = t * 0.01;
    renderer.render(scene, camera);
    if (visible && !document.hidden && (!reduce || moving)) raf = requestAnimationFrame(loop);
  }
  resize();
  el.classList.add('ready');
  return true;
}
