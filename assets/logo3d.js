// The BAZZ eagle as a gold medallion under a spotlight. Drag (or move the mouse) to turn it.
import * as THREE from './three.module.min.js';

const ROT = Math.PI / 2;
let faceCache = null;
function faceTextures(img) {
  if (faceCache) return faceCache;
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  // navy enamel disc
  const r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  r.addColorStop(0, '#1d2540'); r.addColorStop(1, '#0b0f1c'); g.fillStyle = r; g.fillRect(0, 0, S, S);
  // gold rings
  g.strokeStyle = '#D9B872'; g.lineWidth = 34; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 26, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 6; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 70, 0, Math.PI * 2); g.stroke();
  // eagle: keep only the gold pixels of the logo
  const t = document.createElement('canvas'); t.width = t.height = 512; const tg = t.getContext('2d'); tg.drawImage(img, 0, 0, 512, 512);
  const d = tg.getImageData(0, 0, 512, 512), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const lum = (p[i] + p[i + 1]) / 2 - p[i + 2]; p[i + 3] = Math.max(0, Math.min(255, (lum - 20) * 4)); p[i] = 230; p[i + 1] = 196; p[i + 2] = 120; }
  tg.putImageData(d, 0, 0);
  g.drawImage(t, S * .17, S * .15, S * .68, S * .68);
  // metalness map: gold parts metallic, enamel not
  const m = document.createElement('canvas'); m.width = m.height = S; const mg = m.getContext('2d');
  mg.fillStyle = '#000'; mg.fillRect(0, 0, S, S); mg.filter = 'brightness(0) invert(1)';
  mg.strokeStyle = '#fff'; mg.lineWidth = 34; mg.beginPath(); mg.arc(S / 2, S / 2, S / 2 - 26, 0, Math.PI * 2); mg.stroke();
  mg.lineWidth = 6; mg.beginPath(); mg.arc(S / 2, S / 2, S / 2 - 70, 0, Math.PI * 2); mg.stroke();
  mg.drawImage(t, S * .17, S * .15, S * .68, S * .68);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const metal = new THREE.CanvasTexture(m);
  for (const x of [map, metal]) { x.center.set(.5, .5); x.rotation = ROT; }
  faceCache = { map, metal };
  return faceCache;
}

const LITE = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
export function mountLogo(el, opts = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch (e) { el.classList.add('no-webgl'); return; }
  renderer.setPixelRatio(Math.min(LITE ? 1.5 : 2, devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  // soft studio reflections so the gold reads as metal
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x05070d);
  const panel = (col, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m); };
  panel(0xfff1d6, 0, 8, 2, 10, 4); panel(0xffe2a8, 7, 2, 5, 3, 8); panel(0x6f84ff, -8, 1, -2, 3, 6); panel(0xffffff, 0, 0, 9, 4, 2);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(envScene, 0.04).texture; pmrem.dispose();

  const R = 1.6, T = 0.24;
  const gold = new THREE.MeshStandardMaterial({ color: 0xD9B872, metalness: 1, roughness: .28 });
  const faceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: .32 });
  const coin = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, T, LITE ? 72 : 128, 1, false), [gold, faceMat, faceMat]);
  body.rotation.x = Math.PI / 2; coin.add(body);
  // ribbed outer edge
  const edge = new THREE.Mesh(new THREE.TorusGeometry(R, T / 2 + .02, LITE ? 14 : 24, LITE ? 96 : 160), gold); coin.add(edge);
  const img = new Image();
  img.onload = () => { const { map, metal } = faceTextures(img); faceMat.map = map; faceMat.metalnessMap = metal; faceMat.needsUpdate = true; el.classList.add('ready'); wake(); };
  img.src = opts.logo || 'assets/eagle-512.jpg';
  const pivot = new THREE.Group(); pivot.add(coin); pivot.position.y = 1.75; scene.add(pivot);

  // lights + a real spotlight beam from above
  scene.add(new THREE.HemisphereLight(0x8fa0ff, 0x1a1408, .3));
  const spot = new THREE.SpotLight(0xffe7b8, 260, 30, Math.PI / 10, .4, 1.3);
  spot.position.set(0, 10, 2.5); spot.target = pivot; scene.add(spot, spot.target);
  const rimL = new THREE.SpotLight(0x6f84ff, 60, 25, Math.PI / 6, .6, 1.6); rimL.position.set(-6, 4, -3); rimL.target = pivot; scene.add(rimL);
  const beamCol = new THREE.Color(0xffe7b8);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, 10.5, 64, 1, true), new THREE.ShaderMaterial({
    uniforms: { uCol: { value: beamCol }, uT: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `varying float vY; varying float vF; varying vec3 vP; void main(){ vY = uv.y; vP = position; vec3 n = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.);
      vF = pow(abs(dot(n, normalize(-mv.xyz))), 1.8); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uCol; uniform float uT; varying float vY; varying float vF; varying vec3 vP;
      void main(){ float shimmer = .85 + .15*sin(vP.y*2.5 - uT*1.3 + vP.x*3.);
        float a = smoothstep(0., .3, vY) * (.55 + .45 * vY) * vF * .5 * shimmer; gl_FragColor = vec4(uCol * a, a); }` }));
  beam.position.set(0, 5.15, 0.9); beam.rotation.x = -0.17; scene.add(beam);
  const poolC = document.createElement('canvas'); poolC.width = poolC.height = 256;
  { const g = poolC.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.45, 'rgba(255,255,255,.3)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); }
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(poolC), color: beamCol, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = -0.2; scene.add(pool);

  const N = LITE ? 120 : 240, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 6; pos[i * 3 + 1] = Math.random() * 6; pos[i * 3 + 2] = (Math.random() - .5) * 4; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xF2DDA8, size: .03, transparent: true, opacity: .75, depthWrite: false }));
  scene.add(dust);

  if (opts.bare) { beam.visible = false; pool.visible = false; dust.visible = false; }

  // interaction: drag to spin (with momentum); otherwise the coin follows the mouse a little
  let rotY = opts.rotY ?? -0.35, rotX = 0, vel = 0, dragging = false, lastX = 0, lastY = 0, tiltX = 0, tiltY = 0, userT = 0;
  el.style.cursor = 'grab'; el.style.touchAction = 'pan-y';
  el.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; vel = 0; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; wake(); });
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect(); tiltY = ((e.clientX - r.left) / r.width - .5); tiltX = ((e.clientY - r.top) / r.height - .5);
    if (dragging) { const dx = (e.clientX - lastX) * 0.012; rotY += dx; vel = dx; rotX = Math.max(-.6, Math.min(.6, rotX + (e.clientY - lastY) * 0.006)); lastX = e.clientX; lastY = e.clientY; userT = performance.now(); }
    wake();
  });
  const end = () => { dragging = false; el.style.cursor = 'grab'; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', () => { tiltX = tiltY = 0; wake(); });

  function resize() {
    const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false);
    renderer.domElement.style.setProperty('width', w + 'px', 'important'); renderer.domElement.style.setProperty('height', h + 'px', 'important');
    camera.aspect = w / h; camera.position.set(0, 2.2, w / h < 0.8 ? 12 : 9.5); camera.lookAt(0, 1.7, 0); camera.updateProjectionMatrix(); wake();
  }
  new ResizeObserver(resize).observe(el);

  let visible = true, raf = null, last = 0; const t0 = performance.now();
  new IntersectionObserver(es => { visible = es[0].isIntersecting; wake(); }).observe(el);
  document.addEventListener('visibilitychange', wake);
  function wake() { if (raf === null && visible && !document.hidden) raf = requestAnimationFrame(loop); }
  let drawn = 0, dead = false;
  function loop(now) {
    raf = null; if (dead) return;
    if (LITE && now - drawn < 30 && !dragging) { raf = requestAnimationFrame(loop); return; }
    drawn = now;
    const dt = Math.min(50, now - (last || now)); last = now; const t = (now - t0) / 1000;
    if (!dragging) {
      rotY += vel; vel *= Math.pow(0.95, dt / 16.7);
      if (!reduce && Math.abs(vel) < 0.002 && now - userT > 2000) rotY += dt * 0.00035;
      rotX += (tiltX * 0.5 - rotX) * 0.04;
    }
    pivot.rotation.set(rotX, rotY + tiltY * 0.5, 0);
    if (!reduce) pivot.position.y = 1.75 + Math.sin(t * 1.2) * 0.07;
    beam.material.uniforms.uT.value = t;
    if (!reduce) dust.rotation.y = t * 0.04;
    renderer.render(scene, camera);
    if (visible && !document.hidden && (!reduce || dragging || Math.abs(vel) > 0.001)) raf = requestAnimationFrame(loop);
  }
  resize();
  return () => { dead = true; if (raf !== null) cancelAnimationFrame(raf); renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {} renderer.domElement.remove(); };
}
