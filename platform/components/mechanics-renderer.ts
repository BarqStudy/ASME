import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/** Actual bevelled solid geometry. Loaded after hydration, with no controls. */
export function mountGear(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  camera.position.set(0, 0, 9.7);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xe7f5ff, 5);
  key.position.set(-3, 5, 7);
  const rim = new THREE.DirectionalLight(0x298cda, 4);
  rim.position.set(4, -2, 3);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.7));

  const shape = new THREE.Shape();
  const teeth = 24;
  // Narrow tooth tips and wider roots leave a clean, machined silhouette.
  for (let i = 0; i < teeth; i++) {
    for (const [fraction, radius] of [
      [0, 1.84],
      [0.18, 1.84],
      [0.32, 2.08],
      [0.65, 2.08],
      [0.82, 1.84],
    ] as const) {
      const a = ((i + fraction) * Math.PI * 2) / teeth;
      if (i === 0 && fraction === 0)
        shape.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
      else shape.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    }
  }
  shape.closePath();
  const bore = new THREE.Path();
  bore.absarc(0, 0, 0.48, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const hole = new THREE.Path();
    hole.absarc(
      Math.cos(a) * 1.22,
      Math.sin(a) * 1.22,
      0.245,
      0,
      Math.PI * 2,
      true,
    );
    shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.28,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    curveSegments: 40,
  });
  geometry.translate(0, 0, -0.14);
  const steel = new THREE.MeshStandardMaterial({
    color: 0xd6e6ef,
    metalness: 0.93,
    roughness: 0.24,
  });
  const edge = new THREE.MeshStandardMaterial({
    color: 0x6695b4,
    metalness: 0.85,
    roughness: 0.28,
  });
  const blue = new THREE.MeshStandardMaterial({
    color: 0x126aa4,
    metalness: 0.8,
    roughness: 0.25,
  });
  const assembly = new THREE.Group();
  assembly.rotation.set(0.5, -0.38, -0.15);
  const rotor = new THREE.Group();
  rotor.add(new THREE.Mesh(geometry, [steel, edge]));
  // Raised annular hub retains a real open bore through the centre.
  const hubShape = new THREE.Shape();
  hubShape.absarc(0, 0, 0.78, 0, Math.PI * 2, false);
  const hubBore = new THREE.Path();
  hubBore.absarc(0, 0, 0.48, 0, Math.PI * 2, true);
  hubShape.holes.push(hubBore);
  const hubGeometry = new THREE.ExtrudeGeometry(hubShape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelSize: 0.022,
    bevelThickness: 0.022,
    bevelSegments: 3,
    curveSegments: 64,
  });
  const hub = new THREE.Mesh(hubGeometry, blue);
  hub.position.z = 0.15;
  rotor.add(hub);
  const ringGeometry = new THREE.TorusGeometry(0.53, 0.018, 12, 96);
  const ring = new THREE.Mesh(ringGeometry, steel);
  ring.position.z = 0.27;
  rotor.add(ring);
  assembly.add(rotor);
  scene.add(assembly);

  let frame = 0,
    previous = 0,
    visible = true,
    lost = false,
    angle = -0.2;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const draw = (time: number) => {
    frame = 0;
    if (lost || !visible || document.hidden) {
      previous = 0;
      return;
    }
    if (!motion.matches)
      angle += Math.min((time - (previous || time)) / 1000, 0.05) * 0.22;
    previous = time;
    rotor.rotation.z = angle;
    renderer.render(scene, camera);
    if (!motion.matches) frame = requestAnimationFrame(draw);
  };
  const resume = () => {
    previous = 0;
    if (!frame) frame = requestAnimationFrame(draw);
  };
  const resize = new ResizeObserver(() => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    resume();
  });
  resize.observe(canvas);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) resume();
  });
  intersection.observe(canvas);
  const contextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
  };
  const contextRestored = () => {
    lost = false;
    resume();
  };
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("webglcontextrestored", contextRestored);
  document.addEventListener("visibilitychange", resume);
  motion.addEventListener("change", resume);
  resume();
  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    intersection.disconnect();
    document.removeEventListener("visibilitychange", resume);
    motion.removeEventListener("change", resume);
    canvas.removeEventListener("webglcontextlost", contextLost);
    canvas.removeEventListener("webglcontextrestored", contextRestored);
    geometry.dispose();
    hubGeometry.dispose();
    ringGeometry.dispose();
    steel.dispose();
    edge.dispose();
    blue.dispose();
    environment.dispose();
    renderer.dispose();
  };
}
