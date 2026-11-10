// Five BAZZ books standing on a lit stage. Hover lifts a book; click opens its page.
import * as THREE from './three.module.min.js';

function spine(title, bg, ink) {
  const c = document.createElement('canvas'); c.width = 96; c.height = 1024;
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 96, 1024);
  g.fillStyle = ink; g.fillRect(0, 60, 96, 3); g.fillRect(0, 960, 96, 3);
  g.save(); g.translate(58, 512); g.rotate(Math.PI / 2);
  g.font = '700 34px Arial, sans-serif'; g.textAlign = 'center'; g.fillText(title, 0, 0); g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function pages() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = '#EFE8DA'; g.fillRect(0, 0, 64, 256);
  g.strokeStyle = 'rgba(120,110,95,.35)';
  for (let i = 2; i < 64; i += 3) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function mountShelf(el, books) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch (e) { el.classList.add('no-webgl'); return; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  const W = 1.5, H = W * 1.414, D = 0.22;
  const loader = new THREE.TextureLoader();
  const group = new THREE.Group(); scene.add(group);
  const meshes = []; let loaded = 0;
  const pageTex = pages();

  books.forEach((b, i) => {
    const cover = loader.load(b.cover, () => { if (++loaded === books.length) el.classList.add('ready'); });
    cover.colorSpace = THREE.SRGBColorSpace; cover.anisotropy = 8;
    const m = (map, r = .5) => new THREE.MeshStandardMaterial({ map, roughness: r, metalness: .05 });
    const mats = [m(pageTex, .9), m(spine(b.title, b.color, b.ink), .45), m(pageTex, .9), m(pageTex, .9), m(cover, .38),
      new THREE.MeshStandardMaterial({ color: b.color, roughness: .5 })];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mats);
    mesh.castShadow = true;
    const n = books.length, a = (i - (n - 1) / 2);
    mesh.position.set(a * 1.6, H / 2 + 0.1, -Math.abs(a) * 0.45);
    mesh.rotation.y = -a * 0.22;
    mesh.userData = { url: b.url, baseY: H / 2 + 0.1, lift: 0, i };
    group.add(mesh); meshes.push(mesh);
  });

  const stage = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.8, 0.18, 120),
    new THREE.MeshStandardMaterial({ color: 0x1b2032, roughness: .35, metalness: .4 }));
  stage.position.set(0, -0.03, -0.6); stage.scale.set(1, 1, .42); stage.receiveShadow = true; scene.add(stage);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(5.62, 0.025, 12, 200),
    new THREE.MeshStandardMaterial({ color: 0xC9B48F, emissive: 0xC9B48F, emissiveIntensity: .6, metalness: .9, roughness: .25 }));
  rim.rotation.x = Math.PI / 2; rim.position.set(0, 0.065, -0.6); rim.scale.set(1, .42, 1); scene.add(rim);

  scene.add(new THREE.HemisphereLight(0x8fa0ff, 0x1a1408, .45));
  const key = new THREE.SpotLight(0xfff1d6, 260, 40, Math.PI / 5, .5, 1.5);
  key.position.set(2, 10, 7); key.target.position.set(0, 1, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  scene.add(key, key.target);
  const rimL = new THREE.SpotLight(0x6f84ff, 90, 30, Math.PI / 4, .6, 1.5); rimL.position.set(-7, 6, -4); scene.add(rimL);

  const N = 220, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 14; pos[i * 3 + 1] = Math.random() * 5; pos[i * 3 + 2] = (Math.random() - .5) * 5; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xE8D7B0, size: .025, transparent: true, opacity: .6, depthWrite: false }));
  scene.add(dust);

  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let hover = null, px = 0, py = 0;
  const pick = e => {
    const r = el.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(meshes)[0];
    return hit ? hit.object : null;
  };
  el.addEventListener('pointermove', e => {
    hover = pick(e); el.style.cursor = hover ? 'pointer' : 'default';
    const r = el.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - .5; py = (e.clientY - r.top) / r.height - .5;
    wake();
  });
  el.addEventListener('pointerleave', () => { hover = null; px = py = 0; wake(); });
  el.addEventListener('click', e => { const m = pick(e); if (m) (window.bazzGo || (u => location.href = u))(m.userData.url); });

  function resize() {
    const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); renderer.domElement.style.setProperty('width', w + 'px', 'important'); renderer.domElement.style.setProperty('height', h + 'px', 'important');
    camera.aspect = w / h;
    const z = Math.max(9.6, 4.3 / (Math.tan(THREE.MathUtils.degToRad(18)) * (w / h)));
    camera.position.set(0, 2.1, z); camera.lookAt(0, 1.25, 0); camera.updateProjectionMatrix(); wake();
  }
  new ResizeObserver(resize).observe(el);

  let visible = true, raf = null, last = 0, t0 = performance.now();
  new IntersectionObserver(es => { visible = es[0].isIntersecting; wake(); }).observe(el);
  document.addEventListener('visibilitychange', wake);
  function wake() { if (raf === null && visible && !document.hidden) raf = requestAnimationFrame(loop); }
  function loop(now) {
    raf = null;
    const dt = Math.min(50, now - (last || now)); last = now; const t = (now - t0) / 1000;
    const k = 1 - Math.pow(0.88, dt / 16.7);
    let moving = false;
    meshes.forEach(m => {
      const target = m === hover ? 0.35 : 0;
      m.userData.lift += (target - m.userData.lift) * k;
      if (Math.abs(target - m.userData.lift) > 0.001) moving = true;
      const bob = reduce ? 0 : Math.sin(t * 1.1 + m.userData.i) * 0.04;
      m.position.y = m.userData.baseY + m.userData.lift + bob;
    });
    group.rotation.y += ((reduce ? 0 : px * 0.25) - group.rotation.y) * k;
    camera.position.y += ((2.1 - py * 0.6) - camera.position.y) * k * .5; camera.lookAt(0, 1.25, 0);
    if (!reduce) dust.rotation.y = t * 0.03;
    renderer.render(scene, camera);
    if (visible && !document.hidden && (!reduce || moving)) raf = requestAnimationFrame(loop);
  }
  resize();
}
