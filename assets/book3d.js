// 3D book on a lit stage. Usage: mountBook(containerEl, { interactive, autoRotate })
import * as THREE from './three.module.min.js';

function spineTexture(title) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 1024;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 128, 0);
  grd.addColorStop(0, '#141826'); grd.addColorStop(.5, '#26304f'); grd.addColorStop(1, '#141826');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 1024);
  g.fillStyle = '#C9B48F'; g.fillRect(0, 70, 128, 3); g.fillRect(0, 950, 128, 3);
  g.save(); g.translate(76, 512); g.rotate(Math.PI / 2);
  g.fillStyle = '#F6F2EA'; g.font = '600 46px Georgia, serif'; g.textAlign = 'center';
  g.fillText(title || 'AI for Beginners', 0, 0);
  g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function backTexture(l1, l2) {
  const c = document.createElement('canvas'); c.width = 724; c.height = 1024;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 724, 1024);
  grd.addColorStop(0, '#1F2433'); grd.addColorStop(1, '#2E3A6B');
  g.fillStyle = grd; g.fillRect(0, 0, 724, 1024);
  g.strokeStyle = 'rgba(201,180,143,.6)'; g.lineWidth = 3; g.strokeRect(40, 40, 644, 944);
  g.fillStyle = '#C9B48F'; g.font = '600 40px Georgia, serif'; g.textAlign = 'center';
  g.fillText(l1 || '9 problems. 9 fixes.', 362, 430);
  g.fillStyle = '#F6F2EA'; g.font = '28px Arial, sans-serif';
  g.fillText(l2 || 'Plus 100 copy-paste prompts', 362, 490);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function pagesTexture(vertical) {
  const c = document.createElement('canvas'); c.width = vertical ? 64 : 1024; c.height = vertical ? 1024 : 64;
  const g = c.getContext('2d'); g.fillStyle = '#EFE8DA'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(120,110,95,.35)'; g.lineWidth = 1;
  for (let i = 2; i < (vertical ? 64 : 64); i += 3) {
    g.beginPath();
    if (vertical) { g.moveTo(i, 0); g.lineTo(i, 1024); } else { g.moveTo(0, i); g.lineTo(1024, i); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function mountBook(el, opts = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) { el.classList.add('no-webgl'); return; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 1.6, 9.5);

  // book: 1 x 1.414 x 0.2
  const W = 2.2, H = W * 1.414, D = 0.32;
  const loader = new THREE.TextureLoader();
  const cover = loader.load(opts.cover || 'assets/cover.jpg', () => el.classList.add('ready'));
  cover.colorSpace = THREE.SRGBColorSpace; cover.anisotropy = 8;
  const mat = (map, rough = .55) => new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: .05 });
  const mats = [
    mat(pagesTexture(true), .9),   // +x right edge (pages)
    mat(spineTexture(opts.title), .45),      // -x spine
    mat(pagesTexture(false), .9),  // +y top
    mat(pagesTexture(false), .9),  // -y bottom
    mat(cover, .38),               // +z front
    mat(backTexture(opts.back1, opts.back2), .45),       // -z back
  ];
  const book = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mats);
  book.castShadow = true;
  const pivot = new THREE.Group(); pivot.add(book); pivot.position.y = H / 2 + 0.06; scene.add(pivot);

  // stage
  const stageMat = new THREE.MeshStandardMaterial({ color: 0x1b2032, roughness: .35, metalness: .4 });
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.75, 0.18, 96), stageMat);
  stage.position.y = -0.03; stage.receiveShadow = true; scene.add(stage);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.022, 12, 160),
    new THREE.MeshStandardMaterial({ color: 0xC9B48F, emissive: 0xC9B48F, emissiveIntensity: .6, metalness: .9, roughness: .25 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.065; scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0c0f1a, roughness: .9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.12; floor.receiveShadow = true; // floor not added: page background shows through

  // lights
  scene.add(new THREE.HemisphereLight(0x8fa0ff, 0x1a1408, .35));
  const key = new THREE.SpotLight(0xfff1d6, 120, 30, Math.PI / 7, .45, 1.6);
  key.position.set(3.5, 8, 5); key.target = pivot; key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004;
  scene.add(key, key.target);
  const rimL = new THREE.SpotLight(0x6f84ff, 70, 25, Math.PI / 6, .6, 1.6);
  rimL.position.set(-5, 5, -3); rimL.target = pivot; scene.add(rimL);
  const fill = new THREE.PointLight(0xC9B48F, 6, 12); fill.position.set(-2.5, 1.2, 3.5); scene.add(fill);

  // light cones (visible beams)
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1d6, transparent: true, opacity: .05, side: THREE.DoubleSide, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9, 48, 1, true), beamMat);
  // visible beam removed; the glow is done in CSS

  // dust particles
  const N = 260, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i*3] = (Math.random()-.5)*8; pos[i*3+1] = Math.random()*6; pos[i*3+2] = (Math.random()-.5)*6; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xE8D7B0, size: .025, transparent: true, opacity: .7, depthWrite: false }));
  scene.add(dust);

  // glass display case
  const GW = W + 0.7, GH = H + 0.75, GD = D + 1.1;
  const glass = new THREE.Group();
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xdfe8ff, transparent: true, opacity: .16, roughness: .04, metalness: 0,
    clearcoat: 1, clearcoatRoughness: .05, side: THREE.DoubleSide, depthWrite: false });
  const box = new THREE.Mesh(new THREE.BoxGeometry(GW, GH, GD), glassMat);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xF6F2EA, transparent: true, opacity: .55 });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(GW, GH, GD)), edgeMat);
  const capMat = new THREE.MeshStandardMaterial({ color: 0xC9B48F, metalness: .9, roughness: .25, transparent: true, opacity: 1 });
  const cap = new THREE.Mesh(new THREE.BoxGeometry(GW + 0.08, 0.06, GD + 0.08), capMat); cap.position.y = GH / 2 + 0.03;
  // diagonal highlight streaks on the front glass
  const streakMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .1, depthWrite: false });
  const s1 = new THREE.Mesh(new THREE.PlaneGeometry(0.25, GH * 1.1), streakMat); s1.position.set(-GW * 0.22, 0, GD / 2 + 0.002); s1.rotation.z = -0.35;
  const s2 = new THREE.Mesh(new THREE.PlaneGeometry(0.08, GH * 1.1), streakMat); s2.position.set(-GW * 0.05, 0, GD / 2 + 0.002); s2.rotation.z = -0.35;
  glass.add(box, edges, cap, s1, s2);
  glass.position.y = GH / 2 + 0.07; scene.add(glass);
  // gold base plate under the case
  const plate = new THREE.Mesh(new THREE.BoxGeometry(GW + 0.12, 0.05, GD + 0.12), capMat.clone());
  plate.position.y = 0.09; scene.add(plate);

  // interaction: click the glass to lift it, then drag the book
  let opened = false, openT = 0;
  let targetY = -0.45, targetX = 0, rotY = -0.45, rotX = 0, dragging = false, lastX = 0, lastY = 0, userTurned = 0, downX = 0, downY = 0;
  const hint = el.querySelector('.hint');
  const setHint = txt => { if (hint) hint.textContent = txt; };
  setHint(matchMedia('(pointer: coarse)').matches ? 'Tap the glass to open it' : 'Click the glass to open it');
  el.style.cursor = 'pointer';
  el.setAttribute('tabindex', '0');
  function openCase() {
    if (opened) return; opened = true; openT = performance.now(); el.style.cursor = 'grab';
    setHint(matchMedia('(pointer: coarse)').matches ? 'Drag to turn the book' : 'Drag to turn the book');
    el.classList.add('opened');
  }
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCase(); } });
  el.addEventListener('pointerdown', e => {
    downX = e.clientX; downY = e.clientY;
    if (!opened) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing';
  });
  el.addEventListener('pointermove', e => {
    if (!dragging) return;
    targetY += (e.clientX - lastX) * 0.01; targetX = Math.max(-.45, Math.min(.45, targetX + (e.clientY - lastY) * 0.005));
    lastX = e.clientX; lastY = e.clientY; userTurned = performance.now();
  });
  el.addEventListener('pointerup', e => {
    if (!opened && Math.hypot(e.clientX - downX, e.clientY - downY) < 8) openCase();
    dragging = false; if (opened) el.style.cursor = 'grab';
  });
  el.addEventListener('pointercancel', () => { dragging = false; });
  if (opened || opts.startOpen) openCase();
  addEventListener('pointermove', e => {
    if (dragging) return;
    const r = el.getBoundingClientRect();
    camera.userData.px = ((e.clientX - r.left) / r.width - .5);
    camera.userData.py = ((e.clientY - r.top) / r.height - .5);
  }, { passive: true });

  function resize() {
    const w = el.clientWidth, h = el.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.position.z = w / h < 0.8 ? 14 : 10.5;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(el); resize();

  let visible = true, last = 0, t0 = performance.now();
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(loop); }).observe(el);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) requestAnimationFrame(loop); });

  function loop(now) {
    if (!visible || document.hidden) return;
    const dt = Math.min(50, now - (last || now)); last = now;
    const t = (now - t0) / 1000;
    if (!reduce && opts.autoRotate !== false && !dragging && now - userTurned > 2500) targetY += dt * 0.00018;
    const k = 1 - Math.pow(0.9, dt / 16.7);
    rotY += (targetY - rotY) * k; rotX += (targetX - rotX) * k;
    pivot.rotation.y = rotY; pivot.rotation.x = rotX;
    if (!reduce) pivot.position.y = H / 2 + 0.06 + Math.sin(t * 1.1) * 0.05;
    const px = camera.userData.px || 0, py = camera.userData.py || 0;
    camera.position.x += (px * 1.2 - camera.position.x) * .05;
    camera.position.y += (1.6 - py * .6 - camera.position.y) * .05;
    camera.lookAt(0, H / 2 + .1, 0);
    if (!reduce) { dust.rotation.y = t * 0.03; dust.position.y = Math.sin(t * .3) * .1; }
    if (opened && glass.visible) {
      const p = Math.min(1, (now - openT) / 1400), e = 1 - Math.pow(1 - p, 3);
      glass.position.y = GH / 2 + 0.07 + e * 6;
      glass.rotation.y = e * 0.25;
      glassMat.opacity = .16 * (1 - e); edgeMat.opacity = .55 * (1 - e); capMat.opacity = 1 - e; streakMat.opacity = .1 * (1 - e);
      if (p >= 1) glass.visible = false;
    }
    renderer.render(scene, camera);
    if (!reduce || dragging || (opened && glass.visible)) requestAnimationFrame(loop);
    else setTimeout(() => requestAnimationFrame(loop), 200);
  }
  requestAnimationFrame(loop);
}
