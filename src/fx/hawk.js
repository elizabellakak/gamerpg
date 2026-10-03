// Glowing hawk companion (Pacheon Hawk skills): low-poly body, feathered wings that flap, tail fan.
import * as THREE from 'three';

let geos = null;
function buildGeos() {
  // body: lathe profile along +Z (beak forward)
  const prof = [[0, -0.34], [0.05, -0.3], [0.09, -0.18], [0.1, -0.02], [0.085, 0.1], [0.06, 0.18], [0.045, 0.24], [0, 0.3]].map(([r, z]) => new THREE.Vector2(r, z));
  const body = new THREE.LatheGeometry(prof, 10).rotateX(Math.PI / 2);
  const head = new THREE.SphereGeometry(0.065, 10, 8).translate(0, 0.03, 0.27);
  const beak = new THREE.ConeGeometry(0.022, 0.08, 6).rotateX(Math.PI / 2).translate(0, 0.02, 0.36);
  // wing: feathered outline in XZ (x outward), extruded thin
  const s = new THREE.Shape();
  s.moveTo(0, 0.08); s.quadraticCurveTo(0.25, 0.16, 0.55, 0.08); s.lineTo(0.68, -0.02);
  for (let i = 0; i < 5; i++) { const x = 0.68 - i * 0.14; s.lineTo(x - 0.05, -0.12 - (i % 2) * 0.03); s.lineTo(x - 0.1, -0.06); }
  s.lineTo(0, -0.1); s.closePath();
  const wing = new THREE.ExtrudeGeometry(s, { depth: 0.015, bevelEnabled: false }).rotateX(Math.PI / 2);
  const t = new THREE.Shape();
  t.moveTo(-0.04, 0); t.lineTo(-0.12, -0.2); t.lineTo(-0.04, -0.17); t.lineTo(0, -0.22); t.lineTo(0.04, -0.17); t.lineTo(0.12, -0.2); t.lineTo(0.04, 0); t.closePath();
  const tail = new THREE.ExtrudeGeometry(t, { depth: 0.012, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, 0, -0.28);
  geos = { body, head, beak, wing, tail };
}

export function createHawk(color, color2, { dark = false } = {}) {
  if (!geos) buildGeos();
  const c1 = new THREE.Color(color), c2 = new THREE.Color(color2);
  const mat = new THREE.MeshStandardMaterial({ color: dark ? 0x1a1420 : c1.clone().multiplyScalar(0.5), emissive: c1, emissiveIntensity: dark ? 0.5 : 0.9, roughness: 0.5, flatShading: true, transparent: true, opacity: 1 });
  const wingMat = new THREE.MeshStandardMaterial({ color: dark ? 0x241830 : c2.clone().multiplyScalar(0.5), emissive: c2, emissiveIntensity: dark ? 0.6 : 1.0, roughness: 0.5, flatShading: true, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(geos.body, mat), head = new THREE.Mesh(geos.head, mat), beak = new THREE.Mesh(geos.beak, wingMat), tail = new THREE.Mesh(geos.tail, wingMat);
  const wl = new THREE.Group(), wr = new THREE.Group();
  const ml = new THREE.Mesh(geos.wing, wingMat), mr = new THREE.Mesh(geos.wing, wingMat);
  mr.scale.x = -1;
  wl.add(ml); wr.add(mr);
  wl.position.set(0.06, 0.04, 0.05); wr.position.set(-0.06, 0.04, 0.05);
  g.add(body, head, beak, tail, wl, wr);
  g.scale.setScalar(1.15);
  let ph = Math.random() * 6;
  return {
    group: g, mat, wingMat,
    flap(dt, speed = 1) {
      ph += dt * 11 * speed;
      const a = Math.sin(ph) * 0.75;
      wl.rotation.z = a; wr.rotation.z = -a;
      tail.rotation.x = Math.sin(ph * 0.5) * 0.15;
    },
    setOpacity(k) { mat.opacity = k; wingMat.opacity = 0.95 * k; },
    dispose() { mat.dispose(); wingMat.dispose(); },
  };
}
