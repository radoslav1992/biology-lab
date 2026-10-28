// The 3D cell viewer on /cells/3d/: renderer, camera and orbit controls, cutaway, explode, labels, picking and keys.
// Loaded with a dynamic import only when the viewer is about to be seen, so Three.js never ships with other pages.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildCell, HOME_VIEW, explodeScale } from './cell3d-models.mjs';

const CORAL = new THREE.Color('#e2703a');
const BLACK = new THREE.Color(0, 0, 0);
// Clicks go through the see-through outer layers to the organelle behind them.
const SHELLS = new Set(['cell-membrane', 'cell-wall', 'cytoplasm']);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const approach = (v, target, dt, rate) => (Math.abs(target - v) < 1e-3 ? target : v + (target - v) * (1 - Math.exp(-dt * rate)));

/**
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {HTMLElement} o.stage            element whose size the canvas fills
 * @param {HTMLElement} o.labelLayer       absolutely positioned layer for the HTML labels
 * @param {Record<string, {id: string, name: string, color: string}[]>} o.structures  list order and names per cell
 * @param {{cell: string, explode: number, cut: boolean, labels: boolean, focus: string|null}} o.state
 * @param {boolean} o.reducedMotion
 * @param {(id: string|null, how: string) => void} o.onSelect   a structure was picked in the canvas or by keys
 * @param {() => void} o.onInteract       first drag, zoom or key press (auto-rotate stops)
 * @param {() => void} o.onReady          first frame drawn
 * @param {(error: Error) => void} o.onError
 */
export function createViewer(o) {
  const { canvas, stage, labelLayer, structures, reducedMotion } = o;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: dpr < 1.5, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.localClippingEnabled = true;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#fff6e6', '#204a38', 1.5));
  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(9, 14, 11);
  const fill = new THREE.DirectionalLight('#d6ecff', 0.9);
  fill.position.set(-12, 3, -4);
  const rim = new THREE.DirectionalLight('#ffe2c8', 1.2);
  rim.position.set(-2, -6, -14);
  scene.add(key, fill, rim);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 500);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.085;
  controls.enablePan = false;
  controls.enableZoom = false; // switched on at the first press on the canvas, so scrolling the page never zooms by accident
  controls.rotateSpeed = 0.75;
  controls.zoomSpeed = 0.8;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI - 0.15;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 1.1;
  canvas.style.touchAction = 'pan-y'; // vertical swipes still scroll the page on phones; sideways drags turn the cell

  // Leader lines: from where each structure sits in the cell to where its label floats when exploded.
  const leaderGeo = new THREE.BufferGeometry();
  const leaders = new THREE.LineSegments(leaderGeo, new THREE.LineDashedMaterial({ color: '#d0ed9a', dashSize: 0.32, gapSize: 0.22, transparent: true, opacity: 0, depthWrite: false }));
  leaders.frustumCulled = false;
  leaders.renderOrder = 20;
  scene.add(leaders);

  const cells = {};
  let cell = null;
  let labels = new Map();
  const state = { cell: o.state.cell, labels: o.state.labels !== false, selected: null, hovered: null };
  const explode = { value: o.state.explode, target: o.state.explode };
  const cut = { value: o.state.cut ? 1 : 0, target: o.state.cut ? 1 : 0 };
  const intro = { value: reducedMotion ? 1 : 0 };
  let fly = null, dirty = true, interacted = false, active = true, raf = 0, last = 0, readySent = false, pulse = 0;
  let baseDistance = 40;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();

  // ---- camera framing -----------------------------------------------------------------------------------------
  const HOME = HOME_VIEW;
  /** Camera distance that fits the whole cell into a view `width` pixels wide (the stage width by default). */
  function fitDistance(width = stage.clientWidth, phone = width < stage.clientHeight) {
    const r = cell ? cell.radius : 12;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * Math.max(1, width) / Math.max(1, stage.clientHeight));
    // Portrait phones: the round cells leave slack top and bottom, so frame a little tighter.
    return (r * (phone ? 0.9 : 0.98)) / Math.sin(Math.min(vfov, hfov) / 2);
  }
  function homePosition(out) {
    return out.setFromSphericalCoords(baseDistance, HOME.polar, HOME.azimuth);
  }
  function resetView(animate = !reducedMotion) {
    baseDistance = fitDistance();
    controls.minDistance = baseDistance * 0.3;
    controls.maxDistance = baseDistance * 2.2;
    const to = homePosition(new THREE.Vector3());
    if (animate) fly = { t: 0, dur: 0.75, fromPos: camera.position.clone(), toPos: to, fromTarget: controls.target.clone(), toTarget: new THREE.Vector3() };
    else { camera.position.copy(to); controls.target.set(0, 0, 0); controls.update(); }
    dirty = true;
  }
  // Room taken by the info card on the left of the stage: the view shifts right by half of it.
  let inset = 0, insetTarget = 0;
  function applyInset() {
    const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
    camera.aspect = (w + inset) / h;
    if (inset > 0.5) camera.setViewOffset(w + inset, h, 0, 0, w, h);
    else camera.clearViewOffset();
    // ...and zooms out just enough for the cell to fit the space left beside the card.
    camera.zoom = inset > 0.5 ? Math.min(1, fitDistance(w) / (1.06 * fitDistance(Math.max(w - inset, w * 0.4), false))) : 1;
    camera.updateProjectionMatrix();
  }
  function resize() {
    const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
    renderer.setSize(w, h, false);
    applyInset();
    const d = fitDistance();
    if (!interacted && !fly) { baseDistance = d; homePosition(camera.position); controls.target.set(0, 0, 0); controls.update(); }
    baseDistance = d;
    controls.minDistance = d * 0.3;
    controls.maxDistance = d * 2.2;
    dirty = true;
  }

  // ---- cells and labels ---------------------------------------------------------------------------------------
  const SVGNS = 'http://www.w3.org/2000/svg';
  let calloutSvg = null, calloutLines = new Map();
  function buildLabels() {
    labelLayer.textContent = '';
    labels = new Map();
    calloutLines = new Map();
    calloutSvg = document.createElementNS(SVGNS, 'svg');
    calloutSvg.setAttribute('class', 'c3d-callouts');
    labelLayer.append(calloutSvg);
    for (const s of structures[state.cell] || []) {
      if (!cell.parts.has(s.id)) continue;
      const el = document.createElement('button');
      el.type = 'button';
      el.tabIndex = -1; // the list beside the canvas is the keyboard path; labels are a mouse and touch shortcut
      el.className = 'c3d-label';
      el.dataset.part = s.id;
      el.style.setProperty('--c', s.color);
      el.innerHTML = '<span class="c3d-dot" aria-hidden="true"></span>';
      el.append(s.name);
      el.addEventListener('click', () => { o.onSelect(s.id, 'label'); });
      labelLayer.append(el);
      labels.set(s.id, el);
      const line = document.createElementNS(SVGNS, 'g');
      line.append(document.createElementNS(SVGNS, 'path'), document.createElementNS(SVGNS, 'circle'));
      line.lastChild.setAttribute('r', '3');
      calloutSvg.append(line);
      calloutLines.set(s.id, line);
    }
    measureLabels();
    const n = labels.size;
    leaderGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
  }
  function setCell(kind) {
    if (!cells[kind]) cells[kind] = buildCell(kind);
    if (cell) scene.remove(cell.root);
    const prevSelected = state.selected;
    if (prevSelected) highlight(prevSelected, false);
    state.cell = kind;
    cell = cells[kind];
    scene.add(cell.root);
    buildLabels();
    state.selected = prevSelected && cell.parts.has(prevSelected) ? prevSelected : null;
    if (state.selected) highlight(state.selected, true);
    if (!reducedMotion) intro.value = 0.0;
    resize();
    resetView(false);
    dirty = true;
  }

  // ---- highlight ----------------------------------------------------------------------------------------------
  function materialsOf(id) {
    const p = cell && cell.parts.get(id);
    return p ? [...p.materials, ...(p.alsoMaterials || [])] : [];
  }
  function highlight(id, on, strength = 1) {
    for (const m of materialsOf(id)) {
      const g = m.userData.glass;
      if (g) {
        g.uRim.value.copy(on ? CORAL : m.userData.base.rim);
        g.uMax.value = on ? Math.min(1, m.userData.base.max + 0.15) : m.userData.base.max;
        g.uMin.value = on ? Math.min(0.6, m.userData.base.min + 0.08 * strength) : m.userData.base.min;
      } else if (m.emissive) {
        m.emissive.copy(on ? CORAL : BLACK);
        m.emissiveIntensity = on ? 0.45 * strength : 1;
      }
    }
  }
  function select(id, { flyTo = true } = {}) {
    if (state.selected === id) return;
    if (state.selected) highlight(state.selected, false);
    state.selected = id && cell.parts.has(id) ? id : null;
    if (state.selected) {
      highlight(state.selected, true);
      if (flyTo) focusOn(state.selected);
    }
    for (const [pid, el] of labels) el.classList.toggle('is-selected', pid === state.selected);
    dirty = true;
  }
  function focusOn(id) {
    const part = cell.parts.get(id);
    if (!part) return;
    // A gentle nudge toward the structure: the orbit target moves a quarter of the way there, so the whole cell stays
    // in view, and the camera keeps its distance.
    const center = cell.root.localToWorld(part.anchor.point(explode.target, new THREE.Vector3()));
    const toTarget = center.multiplyScalar(part.size > 9 ? 0 : 0.25);
    const toPos = camera.position.clone().sub(controls.target).add(toTarget);
    if (reducedMotion) { controls.target.copy(toTarget); camera.position.copy(toPos); controls.update(); }
    else fly = { t: 0, dur: 0.7, fromPos: camera.position.clone(), toPos, fromTarget: controls.target.clone(), toTarget };
    dirty = true;
  }

  // ---- cutaway ------------------------------------------------------------------------------------------------
  // A wedge facing the viewer is removed from the membrane (and wall), and from the nucleus so the nucleolus shows.
  function updateClip(scale) {
    const c = smooth(0, 1, cut.value);
    const az = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z) + 0.38;
    const a = tmp.set(Math.sin(az + Math.PI / 4), 0, Math.cos(az + Math.PI / 4));
    const b = tmp2.set(Math.sin(az - Math.PI / 4), 0, Math.cos(az - Math.PI / 4));
    const [p1, p2, p3] = cell.clip.shell;
    p1.normal.copy(a).negate(); p1.constant = 0;
    p2.normal.copy(b).negate(); p2.constant = 0;
    p3.normal.set(0, -1, 0);
    p3.constant = THREE.MathUtils.lerp(cell.top + 30, cell.cutLevel, c) * scale;
    const nucleus = cell.parts.get('nucleus');
    const hub = nucleus.pieces[0].object;
    const center = cell.root.localToWorld(tmp3.copy(hub.position));
    const r = nucleus.size / 1.6;
    const [n1, n2, n3] = cell.clip.nucleus;
    n1.normal.copy(a).negate(); n1.constant = a.dot(center);
    n2.normal.copy(b).negate(); n2.constant = b.dot(center);
    n3.normal.set(0, -1, 0);
    n3.constant = center.y + THREE.MathUtils.lerp(r * 3, -0.12 * r, c) * scale;
  }

  // ---- per-frame state ----------------------------------------------------------------------------------------
  function applyScene() {
    const e = explode.value;
    const scale = explodeScale(e) * (0.9 + 0.1 * smooth(0, 1, intro.value));
    cell.root.scale.setScalar(scale);
    cell.root.updateMatrixWorld(true);
    cell.update(e);
    updateClip(scale);
    if (state.selected && !reducedMotion) highlight(state.selected, true, 0.75 + 0.25 * Math.sin(pulse * 3.2));
  }
  function measureLabels() {
    for (const el of labels.values()) if (el.offsetWidth) { el.dataset.w = String(el.offsetWidth); el.dataset.h = String(el.offsetHeight); }
  }
  const toScreen = (world, w, h, out) => { const v = tmp3.copy(world).project(camera); out.x = ((v.x + 1) / 2) * w; out.y = ((1 - v.y) / 2) * h; out.z = v.z; return out; };
  /**
   * Labels. Assembled, they sit in two columns beside the cell like a textbook diagram, each with a line to its
   * structure; as the cell explodes they glide to float above their own organelles and the lines become dashed 3D
   * leader lines from where each structure started.
   */
  function updateLabelsAndLeaders() {
    const e = explode.value;
    const w = stage.clientWidth, h = stage.clientHeight;
    const pos = leaderGeo.attributes.position;
    const spread = smooth(0.08, 0.55, e);
    const items = [];
    let i = 0;
    for (const [id, el] of labels) {
      const part = cell.parts.get(id);
      const from = cell.root.localToWorld(part.anchor.at(0, tmp));
      pos.setXYZ(i * 2, from.x, from.y, from.z);
      const to = cell.root.localToWorld(part.anchor.at(e, tmp));
      pos.setXYZ(i * 2 + 1, to.x, to.y, to.z);
      i++;
      const float = toScreen(to, w, h, {});
      const point = toScreen(cell.root.localToWorld(part.anchor.point(e, tmp2)), w, h, {});
      const strong = id === state.selected || id === state.hovered;
      // While the info card covers part of the stage, only the selected (or hovered) structure keeps its label.
      const on = ((state.labels && !insetTarget) || strong) && float.z < 1 && point.z < 1;
      if (!el.dataset.w) measureLabels();
      items.push({ id, el, line: calloutLines.get(id), float, point, strong, on, lw: Number(el.dataset.w), lh: Number(el.dataset.h) });
    }
    pos.needsUpdate = true;
    leaderGeo.computeBoundingSphere();
    leaders.computeLineDistances();
    leaders.material.opacity = (state.labels ? 0.85 : 0) * spread;
    leaders.visible = leaders.material.opacity > 0.01;

    // Callout columns, only for labels that are switched on together (a lone hovered label just floats).
    const center = toScreen(cell.root.getWorldPosition(new THREE.Vector3()), w, h, {});
    const rightEdge = toScreen(tmp.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(cell.radius * cell.root.scale.x * 0.95).add(cell.root.getWorldPosition(tmp2)), w, h, {});
    const R = Math.abs(rightEdge.x - center.x);
    const columns = state.labels && !insetTarget ? items.filter(it => it.on) : [];
    const gap = Math.max(...items.map(it => it.lh), 22) + 6;
    // Split at the median so both columns get about half the labels.
    const byX = [...columns].sort((a, b) => a.point.x - b.point.x);
    byX.forEach((it, k) => { it.side = k < Math.ceil(byX.length / 2) ? -1 : 1; });
    for (const side of [-1, 1]) {
      const col = columns.filter(it => it.side === side).sort((a, b) => a.point.y - b.point.y);
      let y = -Infinity;
      for (const it of col) { it.cy = Math.max(it.point.y, y + gap); y = it.cy; }
      let limit = h - 12 - gap / 2;
      for (let k = col.length - 1; k >= 0; k--) { col[k].cy = Math.min(col[k].cy, limit); limit = col[k].cy - gap; }
      for (const it of col) {
        it.cy = Math.max(it.cy, 12 + gap / 2);
        const x = side < 0 ? Math.max(8 + it.lw, center.x - R - 16) : Math.min(w - 8 - it.lw, center.x + R + 16);
        it.cx = side < 0 ? x - it.lw : x;
        it.edge = x;
      }
    }
    for (const it of items) {
      it.fx = it.float.x - it.lw / 2;
      it.fy = it.float.y - it.lh - 6;
      const k = it.cx === undefined ? 1 : spread;
      it.x = it.cx === undefined ? it.fx : it.cx + (it.fx - it.cx) * k;
      it.y = it.cx === undefined ? it.fy : it.cy - it.lh / 2 + (it.fy - (it.cy - it.lh / 2)) * k;
      it.x = Math.min(Math.max(it.x, inset + 4), w - it.lw - 4);
    }
    // Nudge overlapping labels apart (floating labels of neighboring clusters can collide).
    const shown = items.filter(it => it.on);
    for (let pass = 0; pass < 6; pass++) {
      let moved = false;
      for (let a = 0; a < shown.length; a++) for (let b = a + 1; b < shown.length; b++) {
        const A = shown[a], B = shown[b];
        const ox = Math.min(A.x + A.lw, B.x + B.lw) - Math.max(A.x, B.x), oy = Math.min(A.y + A.lh, B.y + B.lh) - Math.max(A.y, B.y);
        if (ox <= 0 || oy <= 0) continue;
        const push = oy / 2 + 2, up = A.y < B.y || (A.y === B.y && a < b) ? A : B, down = up === A ? B : A;
        up.y -= push;
        down.y += push;
        moved = true;
      }
      if (!moved) break;
    }
    for (const it of items) {
      it.y = Math.min(Math.max(it.y, 4), h - it.lh - 4);
      const { el, line, x, y } = it;
      const floatX = it.fx, floatY = it.fy, k = it.cx === undefined ? 1 : spread;
      el.style.opacity = it.on ? '1' : '0';
      el.style.visibility = it.on ? 'visible' : 'hidden';
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.classList.toggle('is-hovered', it.id === state.hovered);
      const lineOn = it.on && it.cx !== undefined && spread < 0.98;
      if (lineOn) {
        const ex = it.edge + (floatX + (it.side > 0 ? 0 : it.lw) - it.edge) * k, ey = it.cy + (floatY + it.lh / 2 - it.cy) * k;
        const bend = it.side < 0 ? ex + 10 : ex - 10;
        line.firstChild.setAttribute('d', `M${it.point.x.toFixed(1)} ${it.point.y.toFixed(1)}L${bend.toFixed(1)} ${ey.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}`);
        line.lastChild.setAttribute('cx', it.point.x.toFixed(1));
        line.lastChild.setAttribute('cy', it.point.y.toFixed(1));
        line.style.opacity = String(1 - spread);
      } else line.style.opacity = '0';
      line.classList.toggle('is-selected', it.id === state.selected);
    }
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
    last = t;
    let changed = dirty;
    if (fly) {
      fly.t = Math.min(1, fly.t + dt / fly.dur);
      const k = smooth(0, 1, fly.t);
      camera.position.lerpVectors(fly.fromPos, fly.toPos, k);
      controls.target.lerpVectors(fly.fromTarget, fly.toTarget, k);
      if (fly.t >= 1) fly = null;
      changed = true;
    }
    if (controls.update(dt)) changed = true;
    for (const tw of [explode, cut]) {
      if (tw.value !== tw.target) { tw.value = reducedMotion ? tw.target : approach(tw.value, tw.target, dt, 5.5); changed = true; }
    }
    if (intro.value < 1) { intro.value = Math.min(1, intro.value + dt / 0.9); changed = true; }
    if (inset !== insetTarget) { inset = reducedMotion ? insetTarget : approach(inset, insetTarget, dt, 7); if (Math.abs(inset - insetTarget) < 0.5) inset = insetTarget; applyInset(); changed = true; }
    if (state.selected && !reducedMotion) { pulse += dt; changed = true; }
    if (hoverPending) { hoverPending = false; updateHover(); }
    if (!changed) return;
    dirty = false;
    applyScene();
    renderer.render(scene, camera);
    updateLabelsAndLeaders();
    if (!readySent) { readySent = true; o.onReady?.(); }
  }
  function start() { if (!raf && active) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function setActive(on) { active = on; if (on) { dirty = true; start(); } else stop(); }

  // ---- picking --------------------------------------------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let pointer = null, hoverPending = false, down = null;
  const isClipped = hit => {
    const m = hit.object.material;
    if (!m.clippingPlanes || !m.clippingPlanes.length) return false;
    return m.clippingPlanes.every(p => p.distanceToPoint(hit.point) < 0);
  };
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(cell.root, true).filter(h => h.object.userData.part && h.object.visible && !isClipped(h));
    if (!hits.length) return null;
    const inner = hits.find(h => !SHELLS.has(h.object.userData.part));
    return (inner || hits[0]).object.userData.part;
  }
  function updateHover() {
    if (!pointer) return;
    const id = pick(pointer.x, pointer.y);
    if (id !== state.hovered) {
      state.hovered = id;
      canvas.style.cursor = id ? 'pointer' : 'grab';
      dirty = true;
    }
  }
  const markInteracted = () => {
    if (interacted) return;
    interacted = true;
    controls.autoRotate = false;
    controls.enableZoom = true;
    o.onInteract?.();
  };
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; markInteracted(); });
  canvas.addEventListener('pointerup', e => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), quick = performance.now() - down.t < 600;
    down = null;
    if (moved < 7 && quick) { const id = pick(e.clientX, e.clientY); o.onSelect(id, 'canvas'); }
  });
  canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { pointer = { x: e.clientX, y: e.clientY }; hoverPending = true; start(); } });
  canvas.addEventListener('pointerleave', () => { pointer = null; if (state.hovered) { state.hovered = null; dirty = true; } });
  controls.addEventListener('start', markInteracted);
  canvas.addEventListener('keydown', e => {
    const k = e.key;
    let handled = true;
    if (k === 'ArrowLeft') controls.rotateLeft(0.2);
    else if (k === 'ArrowRight') controls.rotateLeft(-0.2);
    else if (k === 'ArrowUp') controls.rotateUp(0.15);
    else if (k === 'ArrowDown') controls.rotateUp(-0.15);
    else if (k === '+' || k === '=') zoom(0.85);
    else if (k === '-' || k === '_') zoom(1 / 0.85);
    else if (k === 'Home' || k === '0') resetView();
    else if (k === 'Escape') o.onSelect(null, 'key');
    else if (k === 'Enter' || k === ' ') step(e.shiftKey ? -1 : 1);
    else handled = false;
    if (handled) { e.preventDefault(); markInteracted(); dirty = true; start(); }
  });
  function zoom(factor) {
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
    camera.position.copy(controls.target).add(offset);
    dirty = true;
  }
  function step(dir) {
    const list = (structures[state.cell] || []).map(s => s.id).filter(id => cell.parts.has(id));
    const i = list.indexOf(state.selected);
    const next = list[(i + dir + list.length) % list.length] ?? list[0];
    o.onSelect(next, 'key');
  }

  // ---- lifecycle ------------------------------------------------------------------------------------------------
  const ro = new ResizeObserver(() => { resize(); start(); });
  ro.observe(stage);
  const io = new IntersectionObserver(entries => { const vis = entries[entries.length - 1].isIntersecting; setActive(vis && !document.hidden); }, { rootMargin: '100px' });
  io.observe(stage);
  const onVisibility = () => setActive(!document.hidden);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); stop(); o.onError?.(new Error('WebGL context lost')); });

  setCell(state.cell);
  document.fonts?.ready.then(() => { measureLabels(); dirty = true; start(); });
  if (o.state.focus) select(o.state.focus, { flyTo: true });
  start();

  return {
    setCell(kind) { if (kind !== state.cell) { setCell(kind); start(); } },
    setExplode(v) { explode.target = Math.min(1, Math.max(0, v)); if (reducedMotion) explode.value = explode.target; dirty = true; start(); },
    setCut(on) { cut.target = on ? 1 : 0; if (reducedMotion) cut.value = cut.target; dirty = true; start(); },
    setLabels(on) { state.labels = on; dirty = true; start(); },
    resize() { measureLabels(); resize(); start(); },
    setInset(px) { insetTarget = Math.max(0, px || 0); dirty = true; start(); },
    select(id, opts) { select(id, opts); start(); },
    resetView() { markInteracted(); resetView(); start(); },
    stopAutoRotate: markInteracted,
    get state() { return { cell: state.cell, explode: explode.target, cut: cut.target > 0.5, labels: state.labels, focus: state.selected }; },
    dispose() {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      controls.dispose();
      renderer.dispose();
    },
  };
}
