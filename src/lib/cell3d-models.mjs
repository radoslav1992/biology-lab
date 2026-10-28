// Procedural Three.js models of the animal and plant cells shown on /cells/3d/. Everything is generated here from
// primitives (no downloaded models or textures); anything repeated is instanced. The scene graph builds without a
// browser, so tests can check that every focusable structure exists in the model.
//
// buildCell(kind) returns { kind, root, parts, clip, update(explode) }. Each part is one focusable structure:
//   group     the Object3D holding its meshes (every mesh carries userData.part = id for picking)
//   pieces    rigid objects that slide by `delta` as the explode amount goes 0 → 1
//   sets      instanced organelles whose instances slide individually
//   anchor    where its label sits, at any explode amount
//   materials the materials tinted when the structure is selected
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

/** Small deterministic PRNG, so both models look the same on every visit and in tests. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const randomQuat = rand => new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * TAU, rand() * TAU, rand() * TAU));

// Colors follow the CellDiagram palette (C in CellDiagram.astro), tuned slightly for lighting.
export const PALETTE = {
  membrane: '#2f8a5b', membraneRim: '#b9f0c9', cytoplasm: '#f6e7bd',
  envelope: '#a678b8', nucleoplasm: '#ead9ef', pore: '#4a2357', chromatin: '#b98ac9', nucleolus: '#5b2f6b',
  roughEr: '#4b86b4', erRibosome: '#1f3a2e', smoothEr: '#8dbbe0', ribosome: '#21392d',
  golgi: '#fff3d6', golgiRim: '#356a94',
  mitoOuter: '#f6c453', mitoInner: '#eaa23c', cristae: '#a9761c',
  lysosome: '#ea8a5c', centriole: '#f2ead6',
  wall: '#4caf6e', wallRim: '#d4f5c4', wallInner: '#8fcfa5', vacuole: '#4b86b4', vacuoleRim: '#d6ebfa',
  chloroOuter: '#7fd09a', chloroInner: '#5aa877', grana: '#1f6b40',
};

// ---- materials -------------------------------------------------------------------------------------------------
const solid = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...opts });

/**
 * A see-through membrane: alpha and a rim color rise toward the silhouette (a cheap Fresnel term), so shells read as
 * soft glassy skins without transmission or extra render passes.
 */
function glass(color, rim, { min = 0.06, max = 0.7, rimMix = 0.6, power = 2.2, side = THREE.FrontSide } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0, transparent: true, depthWrite: false, side });
  const uniforms = { uRim: { value: new THREE.Color(rim) }, uMin: { value: min }, uMax: { value: max }, uRimMix: { value: rimMix }, uPower: { value: power } };
  m.userData.glass = uniforms;
  m.userData.base = { rim: uniforms.uRim.value.clone(), min, max };
  m.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = 'uniform vec3 uRim;\nuniform float uMin, uMax, uRimMix, uPower;\n' + shader.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
      float cellFres = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), uPower);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, uRim, cellFres * uRimMix);
      gl_FragColor.a = mix(uMin, uMax, cellFres) * opacity;`);
  };
  m.customProgramCacheKey = () => 'cell3d-glass';
  return m;
}

// ---- geometry helpers ------------------------------------------------------------------------------------------
/**
 * A closed surface given as a map from unit directions (point + unit normal), built as a whole sphere or as its top or
 * bottom half. Normals come from the map, not from the mesh, so two halves meet without a lighting seam.
 */
function shell(map, { half = 'full', w = 64, h = 32, inset = 0 } = {}) {
  const g = new THREE.SphereGeometry(1, w, half === 'full' ? h : h / 2, 0, TAU, half === 'bottom' ? Math.PI / 2 : 0, half === 'full' ? Math.PI : Math.PI / 2);
  const pos = g.attributes.position, nor = g.attributes.normal;
  const u = new THREE.Vector3(), p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    u.fromBufferAttribute(pos, i).normalize();
    map(u, p, n);
    p.addScaledVector(n, -inset);
    pos.setXYZ(i, p.x, p.y, p.z);
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  g.deleteAttribute('uv');
  return g;
}
/** A soft, slightly lumpy ellipsoid: normals by finite differences of the same function. */
function blobMap(radii, amp, seed) {
  const noise = d => Math.sin(3.1 * d.x + seed) * Math.sin(2.7 * d.y + seed * 1.7) * Math.sin(3.4 * d.z + seed * 0.6) + 0.5 * Math.sin(5.3 * d.x + 2.2 * d.z + seed) * Math.sin(4.1 * d.y - seed);
  const at = (d, out) => { const s = 1 + amp * noise(d); return out.set(d.x * radii.x * s, d.y * radii.y * s, d.z * radii.z * s); };
  const t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), q = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), d2 = new THREE.Vector3();
  const e = 1e-3;
  return (u, outP, outN) => {
    at(u, outP);
    t1.set(0, 1, 0);
    if (Math.abs(u.y) > 0.9) t1.set(1, 0, 0);
    t1.cross(u).normalize();
    t2.crossVectors(u, t1);
    at(q.copy(u).addScaledVector(t1, e).normalize(), a);
    at(q.copy(u).addScaledVector(t1, -e).normalize(), b);
    at(q.copy(u).addScaledVector(t2, e).normalize(), c);
    at(q.copy(u).addScaledVector(t2, -e).normalize(), d2);
    outN.crossVectors(a.sub(b), c.sub(d2)).normalize();
    if (outN.dot(outP) < 0) outN.negate();
  };
}
/** A rounded box (superellipsoid) for the plant cell wall, with exact normals from its implicit equation. */
function boxMap(ax, by, cz, p = 0.32) {
  const sp = (x, k) => Math.sign(x) * Math.abs(x) ** k;
  return (u, outP, outN) => {
    outP.set(ax * sp(u.x, p), by * sp(u.y, p), cz * sp(u.z, p));
    outN.set(sp(u.x, 2 - p) / ax, sp(u.y, 2 - p) / by, sp(u.z, 2 - p) / cz).normalize();
  };
}
/** Surface point and normal of a map in a given direction (used to place organelles against the wall). */
function surfaceAt(map, dir) {
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  map(dir.clone().normalize(), p, n);
  return { p, n };
}
/** Paint a geometry with one vertex color (so differently colored pieces can merge into one mesh). */
function paint(g, color) {
  const c = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(arr, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}
const merge = list => mergeGeometries(list.every(g => g.index) ? list : list.map(g => (g.index ? g.toNonIndexed() : g)), false);
/** Ribosome: a large and a small subunit, merged into one tiny geometry for instancing. */
function ribosomeGeometry() {
  const big = new THREE.SphereGeometry(1, 7, 5);
  const small = new THREE.SphereGeometry(0.72, 6, 4).translate(0.25, 0.95, 0);
  // both indexed, so the merged particle keeps shared vertices (~80 instead of ~280)
  big.deleteAttribute('uv');
  small.deleteAttribute('uv');
  return merge([big, small]);
}
/** A capsule profile (for mitochondria), as points for a lathe around Y. */
function capsuleProfile(r, halfLength, steps = 7) {
  const pts = [];
  for (let i = 0; i <= steps; i++) { const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(1e-3, r * Math.cos(a)), -halfLength + r * Math.sin(a))); }
  for (let i = 1; i <= 3; i++) pts.push(new THREE.Vector2(r, -halfLength + (2 * halfLength * i) / 4));
  for (let i = 0; i <= steps; i++) { const a = (i / steps) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(1e-3, r * Math.cos(a)), halfLength + r * Math.sin(a))); }
  return pts;
}
/** A lens profile (for chloroplasts): an ellipse, flattened along Y. */
function lensProfile(R, H, steps = 14) {
  const pts = [];
  for (let i = 0; i <= steps; i++) { const t = -Math.PI / 2 + (i / steps) * Math.PI; pts.push(new THREE.Vector2(Math.max(1e-3, R * Math.cos(t)), H * Math.sin(t))); }
  return pts;
}

// ---- explode layout --------------------------------------------------------------------------------------------
// The default view (the viewer starts here and returns on Reset). Explode directions are chosen in this view's screen
// space, so the pulled-apart clusters fan out around the nucleus instead of hiding behind one another.
export const HOME_VIEW = { azimuth: 0.72, polar: 1.12 };
// Root scale while exploded, so the pulled-apart cell still fits the same frame.
export const explodeScale = e => 1 / (1 + 0.62 * e);
/** A world direction that points `angle` degrees round the screen (0 = right, 90 = up) and `depth` toward the viewer. */
function fan(angle, depth = 0.25) {
  const a = THREE.MathUtils.degToRad(angle), az = HOME_VIEW.azimuth;
  const right = V(Math.cos(az), 0, -Math.sin(az)), toward = V(Math.sin(az), 0, Math.cos(az));
  return right.multiplyScalar(Math.cos(a)).add(V(0, Math.sin(a) * 0.85, 0)).addScaledVector(toward, depth).normalize();
}
const fanBy = (angle, dist, depth) => fan(angle, depth).multiplyScalar(dist);

// ---- parts -----------------------------------------------------------------------------------------------------
/** Instanced organelles that share one set of transforms; each instance slides by its own delta when exploding. */
class InstancedSet {
  constructor(transforms) {
    this.items = transforms.map(t => ({ position: t.position.clone(), quaternion: t.quaternion.clone(), scale: t.scale.clone(), delta: new THREE.Vector3() }));
    this.meshes = [];
    this._m = new THREE.Matrix4();
    this._t = new THREE.Matrix4();
    this._p = new THREE.Vector3();
  }
  /** Add an InstancedMesh; `locals` repeats sub-pieces (e.g. microtubules) inside every instance. */
  mesh(geometry, material, locals = null) {
    const mesh = new THREE.InstancedMesh(geometry, material, this.items.length * (locals ? locals.length : 1));
    mesh.frustumCulled = false;
    this.meshes.push({ mesh, locals });
    return mesh;
  }
  apply(e) {
    const { _m: m, _t: t, _p: p } = this;
    this.items.forEach((it, i) => {
      m.compose(p.copy(it.position).addScaledVector(it.delta, e), it.quaternion, it.scale);
      for (const { mesh, locals } of this.meshes) {
        if (locals) locals.forEach((l, j) => mesh.setMatrixAt(i * locals.length + j, t.multiplyMatrices(m, l)));
        else mesh.setMatrixAt(i, m);
      }
    });
    for (const { mesh } of this.meshes) { mesh.instanceMatrix.needsUpdate = true; mesh.boundingSphere = null; }
  }
  centroid() { return this.items.reduce((c, it) => c.add(it.position), new THREE.Vector3()).divideScalar(this.items.length); }
}

function makePart(id, root) {
  const group = new THREE.Group();
  group.name = id;
  root.add(group);
  return { id, group, pieces: [], sets: [], materials: [], anchor: null, size: 2 };
}
const piece = (part, object, delta) => { part.group.add(object); part.pieces.push({ object, home: object.position.clone(), delta }); return object; };
/** Explode deltas for a cluster: it moves `dist` along `dir`, its members spreading (s > 1) or gathering (s < 1). */
function clusterDeltas(set, dir, dist, s = 1, center = set.centroid()) {
  const move = dir.clone().normalize().multiplyScalar(dist);
  for (const it of set.items) it.delta.copy(move).addScaledVector(it.position.clone().sub(center), s - 1);
}
/**
 * Where a structure's label goes. `point` (an offset from one piece, or from one instance of a set) is a spot on the
 * structure that an assembled-view callout line points at; `label` is where the label floats when exploded.
 */
function anchorOn(target, { point = V(0, 0, 0), label = V(0, 1, 0), index = 0 } = {}) {
  const base = (e, out) => {
    if (target instanceof InstancedSet) { const it = target.items[index]; return out.copy(it.position).addScaledVector(it.delta, e); }
    return out.copy(target.home).addScaledVector(target.delta, e);
  };
  return { at: (e, out) => base(e, out).add(label), point: (e, out) => base(e, out).add(point) };
}
/** The instance farthest along a direction: a stable, outward-facing place for a cluster's label. */
const outermost = (set, dir) => set.items.reduce((best, it, i) => (it.position.dot(dir) > set.items[best].position.dot(dir) ? i : best), 0);

// ---- shared organelle builders ---------------------------------------------------------------------------------
function buildMembrane(part, map, clipPlanes, { lift, glassOpts, color = PALETTE.membrane, rim = PALETTE.membraneRim, inset = 0, layers = 2, renderOrder = 10 }) {
  const outer = glass(color, rim, { ...glassOpts, side: THREE.FrontSide });
  const inner = glass(color, rim, { min: 0.03, max: 0.4, rimMix: 0.5, power: 2.6, side: THREE.FrontSide });
  for (const m of [outer, inner]) { m.clippingPlanes = clipPlanes; m.clipIntersection = true; part.materials.push(m); }
  const halves = {};
  for (const half of ['top', 'bottom']) {
    const g = new THREE.Group();
    const a = new THREE.Mesh(shell(map, { half, inset }), outer);
    a.renderOrder = renderOrder;
    g.add(a);
    if (layers > 1) { const b = new THREE.Mesh(shell(map, { half, inset: inset + 0.22 }), inner); b.renderOrder = renderOrder - 1; g.add(b); }
    halves[half] = piece(part, g, V(0, half === 'top' ? lift : -lift, 0));
  }
  return halves;
}
function buildCytoplasm(part, map, clipPlanes, { lift, inset }) {
  // Seen from inside: the far wall of the cell, tinted like cytoplasm, sits behind the organelles.
  const m = glass(PALETTE.cytoplasm, '#fff8e8', { min: 0.42, max: 0.62, rimMix: 0.2, power: 1.5, side: THREE.BackSide });
  m.clippingPlanes = clipPlanes;
  m.clipIntersection = true;
  part.materials.push(m);
  const halves = {};
  for (const half of ['top', 'bottom']) {
    const mesh = new THREE.Mesh(shell(map, { half, inset, w: 48, h: 24 }), m);
    mesh.renderOrder = 1;
    halves[half] = piece(part, mesh, V(0, half === 'top' ? lift : -lift, 0));
  }
  return halves;
}
/** Nucleus: double envelope (two shells) with pores and chromatin; the envelope splits open when exploded. */
function buildNucleus(nucleusPart, nucleolusPart, { center, r, clipPlanes, delta, split, seed }) {
  const rand = rng(seed);
  const hub = new THREE.Group();
  hub.position.copy(center);
  piece(nucleusPart, hub, delta);
  const map = blobMap(V(r, r * 0.94, r), 0.025, seed);
  const outerM = solid(PALETTE.envelope, { roughness: 0.45, side: THREE.FrontSide });
  const innerM = solid(PALETTE.nucleoplasm, { roughness: 0.8, side: THREE.BackSide });
  const poreM = solid(PALETTE.pore, { roughness: 0.6 });
  for (const m of [outerM, innerM, poreM]) { m.clippingPlanes = clipPlanes; m.clipIntersection = true; nucleusPart.materials.push(m); }
  const pore = new THREE.TorusGeometry(0.17, 0.06, 6, 12);
  const halves = [];
  for (const half of ['top', 'bottom']) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(shell(map, { half, w: 48, h: 32 }), outerM));
    g.add(new THREE.Mesh(shell(map, { half, w: 48, h: 32, inset: 0.24 }), innerM));
    // Pores: a Fibonacci spiral over the half, each ring lying flat on the surface.
    const n = 44, mats = [];
    for (let i = 0; i < n; i++) {
      const y = 1 - (i + 0.5) / n, rr = Math.sqrt(1 - y * y), a = i * 2.39996 + rand() * 0.4;
      const u = V(Math.cos(a) * rr, half === 'top' ? y : -y, Math.sin(a) * rr);
      if (Math.abs(u.y) < 0.06) continue;
      const { p, n: nn } = surfaceAt(map, u);
      mats.push(new THREE.Matrix4().compose(p.addScaledVector(nn, 0.02), new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), nn), V(1, 1, 1)));
    }
    const pores = new THREE.InstancedMesh(pore, poreM, mats.length);
    mats.forEach((m, i) => pores.setMatrixAt(i, m));
    g.add(pores);
    hub.add(g);
    halves.push(g);
    nucleusPart.pieces.push({ object: g, home: g.position.clone(), delta: V(0, half === 'top' ? split : -split, 0) });
  }
  // Chromatin: a few loose threads in the nucleoplasm.
  const chromM = solid(PALETTE.chromatin, { roughness: 0.7 });
  nucleusPart.materials.push(chromM);
  const threads = [];
  for (let k = 0; k < 4; k++) {
    const pts = [];
    let p = V((rand() - 0.5) * r, (rand() - 0.5) * r * 0.8, (rand() - 0.5) * r);
    for (let i = 0; i < 9; i++) { pts.push(p.clone()); p.add(V(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(r * 0.55)); if (p.length() > r * 0.68) p.multiplyScalar((r * 0.6) / p.length()); }
    threads.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.07, 5, false));
  }
  const chrom = new THREE.Mesh(merge(threads), chromM);
  hub.add(chrom);
  // Nucleolus: its own focusable structure, riding with the nucleus.
  const nucleolusM = solid(PALETTE.nucleolus, { roughness: 0.85 });
  nucleolusPart.materials.push(nucleolusM);
  const nr = r * 0.32;
  const nGeo = shell(blobMap(V(nr, nr, nr), 0.09, seed + 3), { w: 28, h: 18 });
  const nucleolus = new THREE.Mesh(nGeo, nucleolusM);
  nucleolus.position.copy(center).add(V(r * 0.14, r * 0.1, r * 0.16));
  piece(nucleolusPart, nucleolus, delta.clone());
  nucleusPart.anchor = anchorOn(nucleusPart.pieces[0], { point: V(-r * 0.55, -r * 0.45, r * 0.55), label: V(r * 0.15, r * 1.02 + split, 0) });
  nucleusPart.size = r * 1.6;
  nucleolusPart.anchor = anchorOn(nucleolusPart.pieces[0], { label: V(0, nr + 0.35, 0) });
  nucleolusPart.size = r;
  return { hub, map };
}
/** Rough ER: curved cisternae wrapped around the nucleus, studded with (instanced) ribosomes. */
function buildRoughER(part, ribosomeGeo, { center, radii, phi, theta, delta, seed, perSheet = 70 }) {
  const rand = rng(seed);
  const sheetM = solid(PALETTE.roughEr, { roughness: 0.5, side: THREE.DoubleSide });
  const riboM = solid(PALETTE.erRibosome, { roughness: 0.7 });
  part.materials.push(sheetM, riboM);
  const group = new THREE.Group();
  group.position.copy(center);
  const sheets = [], ribos = [];
  const dirAt = (ph, th) => V(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th));
  radii.forEach((R, k) => {
    const g = new THREE.SphereGeometry(R, 40, 20, phi[0], phi[1] - phi[0], theta[0], theta[1] - theta[0]);
    const pos = g.attributes.position, d = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      d.fromBufferAttribute(pos, i).normalize();
      const ph = Math.atan2(d.z, -d.x), th = Math.acos(THREE.MathUtils.clamp(d.y, -1, 1));
      d.multiplyScalar(R + 0.14 * Math.sin(6 * ph + k * 1.7) * Math.sin(5 * th + k));
      pos.setXYZ(i, d.x, d.y, d.z);
    }
    g.computeVertexNormals();
    g.deleteAttribute('uv');
    sheets.push(g);
    for (let i = 0; i < perSheet; i++) {
      const ph = phi[0] + rand() * (phi[1] - phi[0]), th = theta[0] + rand() * (theta[1] - theta[0]);
      const side = rand() < 0.7 ? 1 : -1, rr = R + 0.14 * Math.sin(6 * ph + k * 1.7) * Math.sin(5 * th + k) + side * 0.13;
      ribos.push(new THREE.Matrix4().compose(dirAt(ph, th).multiplyScalar(rr), randomQuat(rand), V(0.085, 0.085, 0.085)));
    }
  });
  group.add(new THREE.Mesh(merge(sheets), sheetM));
  const rib = new THREE.InstancedMesh(ribosomeGeo, riboM, ribos.length);
  ribos.forEach((m, i) => rib.setMatrixAt(i, m));
  group.add(rib);
  const pc = piece(part, group, delta);
  const mid = dirAt((phi[0] + phi[1]) / 2, (theta[0] + theta[1]) / 2 - 0.35).multiplyScalar(radii[radii.length - 1] + 0.4);
  part.anchor = anchorOn(part.pieces[part.pieces.length - 1], { point: mid, label: mid.clone().add(V(0, 0.9, 0)) });
  part.size = radii[radii.length - 1] * 1.2;
  return pc;
}
/** Smooth ER: a small network of branching tubules (no ribosomes). */
function buildSmoothER(part, paths, { delta, radius = 0.17 }) {
  const m = solid(PALETTE.smoothEr, { roughness: 0.45 });
  part.materials.push(m);
  const geos = [];
  for (const pts of paths) {
    const vs = pts.map(p => V(...p));
    geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(vs), 40, radius, 7, false));
    for (const end of [vs[0], vs[vs.length - 1]]) geos.push(new THREE.SphereGeometry(radius, 8, 6).translate(end.x, end.y, end.z));
  }
  geos.forEach(g => g.deleteAttribute('uv'));
  const mesh = new THREE.Mesh(merge(geos), m);
  const box = new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position);
  const c = box.getCenter(new THREE.Vector3());
  mesh.geometry.translate(-c.x, -c.y, -c.z);
  mesh.position.copy(c);
  piece(part, mesh, delta);
  part.anchor = anchorOn(part.pieces[part.pieces.length - 1], { label: V(0, box.getSize(new THREE.Vector3()).y / 2 + 0.4, 0) });
  part.size = box.getSize(new THREE.Vector3()).length() * 0.7;
}
/** Golgi: a stack of curved cisternae (cream, with the diagram's blue rims) plus vesicles budding from the ends. */
function golgiGeometry(seed, scale = 1) {
  const rand = rng(seed);
  const geos = [];
  const widths = [2.0, 1.95, 1.82, 1.62, 1.36];
  const cream = new THREE.Color(PALETTE.golgi), rim = new THREE.Color(PALETTE.golgiRim);
  widths.forEach((w, i) => {
    const g = new THREE.SphereGeometry(1, 36, 12);
    const pos = g.attributes.position, colors = new Float32Array(pos.count * 3), c = new THREE.Color();
    const y0 = (i - 2) * 0.36;
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      const X = x * w, Z = z * w * 0.62;
      // swollen rims, a gentle curve (concave side up: the trans face), and the diagram's colors
      const swell = 1 + 0.5 * Math.max(0, Math.abs(x) - 0.6);
      pos.setXYZ(k, X, y0 + y * 0.12 * swell + 0.55 * (X / 2) ** 2, Z);
      c.copy(cream).lerp(rim, (1 - THREE.MathUtils.smoothstep(Math.abs(y), 0.15, 0.62)) * 0.85);
      c.toArray(colors, k * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.deleteAttribute('uv');
    g.computeVertexNormals();
    geos.push(g);
  });
  // vesicles: a few arriving at the cis face (below), more budding off the trans face and the swollen ends
  for (let i = 0; i < 12; i++) {
    const side = rand() < 0.5 ? -1 : 1, trans = i >= 4;
    const x = trans ? side * (1.4 + rand() * 1.0) : (rand() - 0.5) * 2.6;
    const y = trans ? 0.6 + rand() * 1.0 : -1.1 - rand() * 0.5;
    const r = 0.13 + rand() * 0.1;
    geos.push(paint(new THREE.SphereGeometry(r, 10, 8).translate(x, y + 0.55 * (x / 2) ** 2 * (trans ? 1 : 0), (rand() - 0.5) * 1.6), i % 3 ? PALETTE.golgi : PALETTE.golgiRim));
  }
  const g = merge(geos.map(x => (x.attributes.uv ? (x.deleteAttribute('uv'), x) : x)));
  if (scale !== 1) g.scale(scale, scale, scale);
  return g;
}
function buildGolgi(part, stacks, seed) {
  const m = solid('#ffffff', { vertexColors: true, roughness: 0.5 });
  part.materials.push(m);
  stacks.forEach(({ position, facing, delta, scale = 1 }, i) => {
    const mesh = new THREE.Mesh(golgiGeometry(seed + i, scale), m);
    mesh.position.copy(position);
    mesh.quaternion.setFromUnitVectors(V(0, 1, 0), facing.clone().normalize());
    mesh.rotateY(0.6 * i);
    piece(part, mesh, delta);
  });
  part.anchor = anchorOn(part.pieces[0], { label: V(0, 1.9 * (stacks[0].scale || 1), 0) });
  part.size = 4.5;
}
/** Mitochondria: capsules cut open along one side to show the folded inner membrane (cristae). */
function buildMitochondria(part, transforms, { dir, dist, spread = 0.6, seed }) {
  const rand = rng(seed);
  const r = 0.55, L = 0.85, open = 1.45 * Math.PI;
  const outerG = new THREE.LatheGeometry(capsuleProfile(r, L), 24, 0, open);
  const innerParts = [paint(new THREE.LatheGeometry(capsuleProfile(r * 0.8, L), 24, 0, open), PALETTE.mitoInner)];
  const ri = r * 0.8;
  for (let y = -L - ri * 0.55, k = 0; y <= L + ri * 0.55; y += 0.3, k++) {
    const R = Math.abs(y) > L ? Math.sqrt(Math.max(0, ri * ri - (Math.abs(y) - L) ** 2)) : ri;
    if (R < 0.12) continue;
    const start = (k % 2 ? 0 : Math.PI) + (rand() - 0.5) * 0.6;
    const c = new THREE.CircleGeometry(R * 0.97, 14, start, Math.PI * 0.95);
    c.rotateX(-Math.PI / 2).rotateZ((rand() - 0.5) * 0.25).translate(0, y, 0);
    innerParts.push(paint(c, PALETTE.cristae));
  }
  outerG.deleteAttribute('uv');
  const set = new InstancedSet(transforms);
  const outerM = solid(PALETTE.mitoOuter, { roughness: 0.42, side: THREE.DoubleSide });
  const innerM = solid('#ffffff', { vertexColors: true, roughness: 0.6, side: THREE.DoubleSide });
  part.materials.push(outerM, innerM);
  part.group.add(set.mesh(outerG, outerM), set.mesh(merge(innerParts), innerM));
  part.sets.push(set);
  clusterDeltas(set, dir, dist, spread);
  part.anchor = anchorOn(set, { label: V(0, 1.4, 0), index: outermost(set, dir) });
  part.size = 6;
  return set;
}
function buildLysosomes(part, transforms, { dir, dist, spread = 0.6 }) {
  const g = shell(blobMap(V(1, 1, 1), 0.06, 4.2), { w: 20, h: 14 });
  const set = new InstancedSet(transforms);
  const m = solid(PALETTE.lysosome, { roughness: 0.35 });
  part.materials.push(m);
  part.group.add(set.mesh(g, m));
  part.sets.push(set);
  clusterDeltas(set, dir, dist, spread);
  part.anchor = anchorOn(set, { label: V(0, 1.0, 0), index: outermost(set, dir) });
  part.size = 5;
}
/** Free ribosomes: hundreds of instanced two-subunit particles scattered through the cytoplasm. */
function buildRibosomes(part, ribosomeGeo, points, { dir, dist, gather = 0.3, seed }) {
  const rand = rng(seed);
  const set = new InstancedSet(points.map(p => ({ position: p, quaternion: randomQuat(rand), scale: V(0.1, 0.1, 0.1) })));
  const m = solid(PALETTE.ribosome, { roughness: 0.7 });
  part.materials.push(m);
  part.group.add(set.mesh(ribosomeGeo, m));
  part.sets.push(set);
  clusterDeltas(set, dir, dist, gather);
  part.anchor = anchorOn(set, { label: V(0, 0.5, 0), index: outermost(set, dir) });
  part.size = 5;
}
/** Centrioles: two cylinders at right angles, each a ring of nine microtubule triplets. */
function buildCentrioles(part, { position, delta }) {
  const tube = new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6, 1);
  tube.deleteAttribute('uv');
  const locals = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * TAU, base = V(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3), t = V(-Math.sin(a + 0.5), 0, Math.cos(a + 0.5));
    for (let j = -1; j <= 1; j++) locals.push(new THREE.Matrix4().makeTranslation(base.x + t.x * j * 0.095, 0, base.z + t.z * j * 0.095));
  }
  const set = new InstancedSet([
    { position: position.clone(), quaternion: new THREE.Quaternion(), scale: V(1, 1, 1) },
    { position: position.clone().add(V(0.75, 0.15, 0.35)), quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0.3)), scale: V(1, 1, 1) },
  ]);
  const m = solid(PALETTE.centriole, { roughness: 0.4 });
  part.materials.push(m);
  part.group.add(set.mesh(tube, m, locals));
  set.items.forEach(it => it.delta.copy(delta));
  part.sets.push(set);
  part.anchor = anchorOn(set, { point: V(0.3, 0.2, 0.1), label: V(0.3, 1.1, 0) });
  part.size = 3;
}
/** Chloroplasts: lens-shaped, cut open on one side to show the grana (stacks of thylakoid discs). */
function buildChloroplasts(part, transforms, { dir, dist, spread }) {
  const R = 1.5, H = 0.62, open = 1.42 * Math.PI;
  const outerG = new THREE.LatheGeometry(lensProfile(R, H), 26, 0, open);
  const innerG = new THREE.LatheGeometry(lensProfile(R - 0.12, H - 0.1), 26, 0, open);
  outerG.deleteAttribute('uv');
  innerG.deleteAttribute('uv');
  const disc = new THREE.CylinderGeometry(0.26, 0.26, 0.075, 16, 1);
  const grana = [];
  const stacks = [[0, 0], [0.78, 0.25], [-0.72, 0.3], [0.2, -0.78], [-0.3, 0.8], [0.62, -0.52], [-0.78, -0.42]];
  stacks.forEach(([x, z], i) => {
    const r = Math.hypot(x, z), room = (H - 0.16) * Math.sqrt(Math.max(0, 1 - (r / (R - 0.12)) ** 2));
    const n = Math.max(2, Math.min(6, Math.floor((room * 2) / 0.12)));
    for (let k = 0; k < n; k++) grana.push(paint(disc.clone().translate(x, (k - (n - 1) / 2) * 0.12, z), PALETTE.grana));
    if (i > 0) {
      // stroma lamellae: thin membranes linking each stack to the central one
      const len = r, lam = new THREE.BoxGeometry(len, 0.025, 0.1).translate(len / 2, 0, 0);
      lam.rotateY(-Math.atan2(z, x));
      grana.push(paint(lam, '#2f8a5b'));
    }
  });
  const set = new InstancedSet(transforms);
  const outerM = solid(PALETTE.chloroOuter, { roughness: 0.45, side: THREE.DoubleSide });
  const innerM = solid(PALETTE.chloroInner, { roughness: 0.6, side: THREE.DoubleSide });
  const granaM = solid('#ffffff', { vertexColors: true, roughness: 0.55 });
  part.materials.push(outerM, innerM, granaM);
  part.group.add(set.mesh(outerG, outerM), set.mesh(innerG, innerM), set.mesh(merge(grana), granaM));
  part.sets.push(set);
  clusterDeltas(set, dir, dist, spread);
  part.anchor = anchorOn(set, { label: V(0, 1.2, 0), index: outermost(set, dir) });
  part.size = 8;
}

// ---- the two cells ---------------------------------------------------------------------------------------------
function clipSet() {
  // Three planes; with clipIntersection only the region behind all three is removed (a wedge cut toward the viewer).
  return { shell: [new THREE.Plane(), new THREE.Plane(), new THREE.Plane()], nucleus: [new THREE.Plane(), new THREE.Plane(), new THREE.Plane()] };
}

function inEllipsoid(p, c, r, k = 1) { const d = p.clone().sub(c); return (d.x / r.x) ** 2 + (d.y / r.y) ** 2 + (d.z / r.z) ** 2 < k * k; }

function animalCell() {
  const root = new THREE.Group();
  const clip = clipSet();
  const parts = new Map();
  const add = id => { const p = makePart(id, root); parts.set(id, p); return p; };
  const R = V(10, 8.2, 9.4);
  const membraneMap = blobMap(R, 0.045, 1.3);
  const ribosomeGeo = ribosomeGeometry();

  const nucleus = add('nucleus'), nucleolus = add('nucleolus');
  const N = V(-1.0, 0.3, -0.8), NR = 3.1;
  buildNucleus(nucleus, nucleolus, { center: N, r: NR, clipPlanes: clip.nucleus, delta: V(0, 0, 0), split: 2.0, seed: 11 });
  nucleus.clipCenter = N;

  buildRoughER(add('rough-er'), ribosomeGeo, { center: N, radii: [NR + 0.7, NR + 1.3, NR + 1.9, NR + 2.5], phi: [-1.25, 1.1], theta: [0.6, 2.35], delta: fanBy(178, 7.5, 0.15), seed: 21 });
  buildSmoothER(add('smooth-er'), [
    [[-5.8, -2.6, 0.8], [-5.0, -3.4, 1.8], [-5.6, -4.2, 2.8], [-4.4, -4.8, 3.6], [-3.2, -4.4, 4.6], [-2.2, -5.0, 5.2]],
    [[-5.0, -3.4, 1.8], [-4.0, -3.0, 2.4], [-3.4, -3.8, 3.2], [-2.4, -3.4, 3.8], [-1.6, -4.0, 4.4]],
    [[-5.6, -4.2, 2.8], [-6.3, -4.6, 3.4], [-5.6, -5.0, 4.0], [-4.8, -5.5, 4.6]],
    [[-3.4, -3.8, 3.2], [-3.8, -4.8, 2.2], [-3.0, -5.6, 1.6], [-2.0, -5.2, 1.0]],
    [[-4.4, -4.8, 3.6], [-4.6, -3.9, 4.8], [-3.8, -3.2, 5.6], [-2.8, -2.4, 6.0]],
  ], { delta: fanBy(-140, 7.5, 0.5) });
  const G = V(3.5, 1.9, -2.9);
  buildGolgi(add('golgi-apparatus'), [{ position: G, facing: G.clone().sub(N), delta: fanBy(40, 7.5, -0.1) }], 31);

  const rand = rng(41);
  const mitoAt = [V(6.0, -0.8, 1.2), V(4.4, -3.4, 3.6), V(6.4, 1.8, -1.2), V(2.6, 2.8, 4.6), V(4.8, 1.0, 4.4), V(1.0, -4.4, 4.4), V(7.0, -2.8, -1.6)];
  buildMitochondria(add('mitochondrion'), mitoAt.map(p => ({ position: p, quaternion: randomQuat(rand), scale: V(1, 0.85 + rand() * 0.4, 1) })), { dir: fan(-4, 0.25), dist: 8.5, spread: 0.6, seed: 42 });
  const lysoAt = [V(2.8, -5.2, 2.4), V(5.2, -4.6, 0.2), V(3.6, -1.6, 6.4), V(0.4, -2.2, 6.8), V(7.0, -0.4, 3.6), V(2.0, -6.0, -0.6)];
  buildLysosomes(add('lysosome'), lysoAt.map((p, i) => ({ position: p, quaternion: randomQuat(rand), scale: V(1, 1, 1).multiplyScalar(0.5 + ((i * 37) % 10) / 40) })), { dir: fan(-42, 0.5), dist: 8.5, spread: 0.6 });
  buildCentrioles(add('centrioles'), { position: V(2.0, -2.5, -1.6), delta: fanBy(-88, 6.5, 0.7) });

  // Free ribosomes: scattered through the cytoplasm, outside the nucleus.
  const pts = [];
  const rr = rng(51);
  while (pts.length < 320) {
    const p = V((rr() * 2 - 1) * R.x, (rr() * 2 - 1) * R.y, (rr() * 2 - 1) * R.z);
    if (!inEllipsoid(p, V(0, 0, 0), R, 0.86) || p.distanceTo(N) < NR + 0.45) continue;
    pts.push(p);
  }
  buildRibosomes(add('ribosome'), ribosomeGeo, pts, { dir: fan(138, 0.2), dist: 8.5, gather: 0.3, seed: 52 });

  const cyto = add('cytoplasm');
  const cytoHalves = buildCytoplasm(cyto, membraneMap, clip.shell, { lift: 9.5, inset: 0.45 });
  cyto.anchor = anchorOn(cyto.pieces.find(p => p.object === cytoHalves.bottom), { point: V(1.5, -R.y * 0.6, 4.2), label: V(1.5, -R.y * 0.6, 4.2) });
  cyto.size = 12;
  const membrane = add('cell-membrane');
  const memHalves = buildMembrane(membrane, membraneMap, clip.shell, { lift: 9.5, glassOpts: { min: 0.16, max: 0.86, rimMix: 0.65, power: 2.0 } });
  const memPoint = surfaceAt(membraneMap, V(-0.72, 0.22, 0.62)).p;
  membrane.anchor = anchorOn(membrane.pieces.find(p => p.object === memHalves.top), { point: memPoint, label: memPoint.clone().add(V(0, 0.6, 0)) });
  membrane.size = 14;
  return { kind: 'animal', root, parts, clip, radius: 11, shellCenter: V(0, 0, 0), cutLevel: -0.2 * R.y, top: R.y * 1.1 };
}

function plantCell() {
  const root = new THREE.Group();
  const clip = clipSet();
  const parts = new Map();
  const add = id => { const p = makePart(id, root); parts.set(id, p); return p; };
  const A = 13, B = 8.4, Cz = 8.4;
  const wallMap = boxMap(A, B, Cz, 0.32);
  const ribosomeGeo = ribosomeGeometry();

  const wall = add('cell-wall');
  const wallHalves = buildMembrane(wall, wallMap, clip.shell, { lift: 11.5, color: PALETTE.wall, rim: PALETTE.wallRim, glassOpts: { min: 0.16, max: 0.9, rimMix: 0.55, power: 1.8 }, renderOrder: 12 });
  // the wall's inner face, seen from inside the cell
  const wallInnerM = glass(PALETTE.wallInner, PALETTE.wallRim, { min: 0.3, max: 0.55, rimMix: 0.3, power: 1.5, side: THREE.BackSide });
  wallInnerM.clippingPlanes = clip.shell;
  wallInnerM.clipIntersection = true;
  wall.materials.push(wallInnerM);
  for (const half of ['top', 'bottom']) { const m = new THREE.Mesh(shell(wallMap, { half, inset: 0.55 }), wallInnerM); m.renderOrder = 0; wallHalves[half].add(m); }
  const wallPoint = surfaceAt(wallMap, V(-0.45, 0.3, 0.84)).p;
  wall.anchor = anchorOn(wall.pieces.find(p => p.object === wallHalves.top), { point: wallPoint, label: wallPoint.clone().add(V(0, 0.6, 0)) });
  wall.size = 18;

  const membrane = add('cell-membrane');
  const memMap = boxMap(A - 0.75, B - 0.75, Cz - 0.75, 0.34);
  const memHalves = buildMembrane(membrane, memMap, clip.shell, { lift: 8, glassOpts: { min: 0.03, max: 0.5, rimMix: 0.55, power: 2.4 }, layers: 1, renderOrder: 11 });
  const memPoint = surfaceAt(memMap, V(0.45, -0.4, 0.8)).p;
  membrane.anchor = anchorOn(membrane.pieces.find(p => p.object === memHalves.bottom), { point: memPoint, label: memPoint.clone().add(V(0, -0.2, 0)) });
  membrane.size = 16;
  const cyto = add('cytoplasm');
  const cytoHalves = buildCytoplasm(cyto, memMap, clip.shell, { lift: 8, inset: 0.3 });
  cyto.anchor = anchorOn(cyto.pieces.find(p => p.object === cytoHalves.bottom), { point: V(-4.5, -(B - 1) * 0.75, 4.5), label: V(-4.5, -(B - 1) * 0.75, 4.5) });
  cyto.size = 16;

  // Central vacuole: a big watery sac (tonoplast) filling most of the cell.
  const vac = add('central-vacuole');
  const VC = V(1.9, 0, 0), VR = V(7.3, 5.3, 5.1);
  const vacMap = blobMap(VR, 0.05, 7.7);
  const vFront = glass(PALETTE.vacuole, PALETTE.vacuoleRim, { min: 0.14, max: 0.72, rimMix: 0.6, power: 2.0, side: THREE.FrontSide });
  const vBack = glass(PALETTE.vacuole, PALETTE.vacuoleRim, { min: 0.2, max: 0.35, rimMix: 0.2, power: 1.5, side: THREE.BackSide });
  vac.materials.push(vFront, vBack);
  const vg = new THREE.Group();
  vg.position.copy(VC);
  const vb = new THREE.Mesh(shell(vacMap, { w: 56, h: 32 }), vBack);
  vb.renderOrder = 3;
  const vf = new THREE.Mesh(vb.geometry, vFront);
  vf.renderOrder = 4;
  vg.add(vb, vf);
  piece(vac, vg, V(0, 0, 0));
  vac.anchor = anchorOn(vac.pieces[0], { point: V(1.5, VR.y * 0.35, VR.z * 0.7), label: V(2.5, VR.y * 0.95, 1.5) });
  vac.size = 12;

  const nucleus = add('nucleus'), nucleolus = add('nucleolus');
  const N = V(-8.9, 0.5, 0.9), NR = 2.45;
  buildNucleus(nucleus, nucleolus, { center: N, r: NR, clipPlanes: clip.nucleus, delta: fanBy(182, 9, 0.1), split: 1.6, seed: 61 });
  nucleus.clipCenter = N;

  buildRoughER(add('rough-er'), ribosomeGeo, { center: N, radii: [NR + 0.6, NR + 1.15, NR + 1.7], phi: [Math.PI / 2 - 0.62, Math.PI / 2 + 0.62], theta: [0.65, 2.3], delta: fanBy(128, 9, 0.45), seed: 71, perSheet: 55 });
  buildSmoothER(add('smooth-er'), [
    [[-10.4, -1.6, -2.4], [-9.6, -2.6, -3.2], [-8.4, -2.2, -4.0], [-7.4, -3.0, -4.6], [-6.2, -2.6, -5.4]],
    [[-9.6, -2.6, -3.2], [-10.2, -3.6, -4.0], [-9.2, -4.4, -4.6], [-8.0, -4.2, -5.2]],
    [[-8.4, -2.2, -4.0], [-8.8, -1.0, -4.8], [-7.8, -0.4, -5.6], [-6.6, -0.8, -6.0]],
  ], { delta: fanBy(-132, 9, -0.2), radius: 0.16 });
  buildGolgi(add('golgi-apparatus'), [
    { position: V(-4.6, -5.4, 3.8), facing: V(0.2, -1, 0.5), delta: fanBy(-112, 6.5, 0.5), scale: 0.72 },
    { position: V(-3.6, 5.2, -4.2), facing: V(0.1, 1, -0.6), delta: fanBy(112, 6.5, -0.3), scale: 0.68 },
  ], 81);

  const rand = rng(91);
  const mitoAt = [V(8.4, -5.6, 4.4), V(10.4, 3.6, -4.0), V(-2.6, -6.0, -4.6), V(3.2, 6.2, 4.4), V(-5.6, 1.6, -6.4)];
  buildMitochondria(add('mitochondrion'), mitoAt.map(p => ({ position: p, quaternion: randomQuat(rand), scale: V(1, 0.85 + rand() * 0.3, 1) })), { dir: fan(-28, 0.3), dist: 10, spread: 0.55, seed: 92 });

  // Chloroplasts line the cytoplasm just inside the membrane, lying flat against it.
  const chloro = [];
  const avoid = [N, ...mitoAt, V(-4.6, -5.4, 3.8), V(-3.6, 5.2, -4.2)];
  const n = 40;
  for (let i = 0; i < n && chloro.length < 16; i++) {
    const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996;
    const { p, n: nn } = surfaceAt(memMap, V(Math.cos(a) * r, y, Math.sin(a) * r));
    p.addScaledVector(nn, -1.2);
    if (avoid.some(q => q.distanceTo(p) < 3.6) || chloro.some(c => c.position.distanceTo(p) < 3.9)) continue;
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), nn);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), rand() * TAU));
    chloro.push({ position: p, quaternion: q, scale: V(1.25, 1, 0.85).multiplyScalar(0.92 + rand() * 0.16) });
  }
  buildChloroplasts(add('chloroplast'), chloro, { dir: fan(62, 0.35), dist: 10, spread: 0.42 });

  const pts = [];
  const rr = rng(101);
  while (pts.length < 240) {
    const p = V((rr() * 2 - 1) * A, (rr() * 2 - 1) * B, (rr() * 2 - 1) * Cz);
    const inside = Math.abs(p.x / (A - 1.2)) ** 5 + Math.abs(p.y / (B - 1.2)) ** 5 + Math.abs(p.z / (Cz - 1.2)) ** 5 < 1;
    if (!inside || inEllipsoid(p, VC, VR, 1.1) || p.distanceTo(N) < NR + 0.4 || chloro.some(c => c.position.distanceTo(p) < 1.5)) continue;
    pts.push(p);
  }
  buildRibosomes(add('ribosome'), ribosomeGeo, pts, { dir: fan(18, -0.1), dist: 10.5, gather: 0.28, seed: 102 });
  return { kind: 'plant', root, parts, clip, radius: 14.5, shellCenter: V(0, 0, 0), cutLevel: -0.15 * B, top: B * 1.15 };
}

/** Build one cell model. `kind` is 'animal' or 'plant'. */
export function buildCell(kind) {
  const cell = kind === 'plant' ? plantCell() : animalCell();
  for (const part of cell.parts.values()) {
    part.group.traverse(o => { if (o.isMesh) o.userData.part = part.id; });
  }
  // Bound ER ribosomes light up with the free ones when "Ribosomes" is selected.
  const rer = cell.parts.get('rough-er'), ribo = cell.parts.get('ribosome');
  if (rer && ribo) ribo.alsoMaterials = rer.materials.filter(m => m.color.getHexString() === new THREE.Color(PALETTE.erRibosome).getHexString());
  cell.update = e => {
    for (const part of cell.parts.values()) {
      for (const pc of part.pieces) pc.object.position.copy(pc.home).addScaledVector(pc.delta, e);
      for (const set of part.sets) set.apply(e);
    }
  };
  cell.update(0);
  return cell;
}
