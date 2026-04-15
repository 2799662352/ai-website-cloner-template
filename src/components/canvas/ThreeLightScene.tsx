"use client";

import { useRef, useEffect, memo } from "react";
import * as THREE from "three";

type LightDirection = "left" | "top" | "right" | "front" | "bottom" | "back";

interface ThreeLightSceneProps {
  direction: LightDirection;
  brightness: number;
  color: string;
  viewMode: "perspective" | "front";
  width?: number;
  height?: number;
}

const DIR_AZ_EL: Record<LightDirection, [number, number]> = {
  left: [180, 0],
  top: [0, 90],
  right: [0, 0],
  front: [90, 0],
  bottom: [0, -90],
  back: [270, 0],
};

const SHELL_VERT = `
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vNormal = -normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const SHELL_FRAG = `
uniform vec3 baseColor;
uniform float shadowIntensity;
uniform float centerAlpha;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  float nDotV = max(dot(vNormal, vViewDir), 0.0);
  float edge = pow(1.0 - nDotV, 2.0);
  vec3 col = mix(baseColor, vec3(0.0), edge * 0.5);
  float a = centerAlpha + edge * shadowIntensity;
  gl_FragColor = vec4(col, a);
}
`;

const CONE_VERT = `
varying vec2 vUv;
varying float vHeight;
void main() {
  vUv = uv;
  vHeight = (position.y + 3.0) / 6.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CONE_FRAG = `
uniform vec3 lightColor;
uniform float opacity;
uniform float time;
varying vec2 vUv;
varying float vHeight;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  float falloff = pow(vHeight, 2.5);
  float lat = abs(vUv.x - 0.5) * 2.0;
  float core = pow(1.0 - lat, 4.0);
  float fringe = pow(1.0 - lat, 0.8);
  float grain = hash(vUv + time * 0.05) * 0.12;
  vec3 base = mix(lightColor, vec3(1.0), pow(vHeight, 8.0) * 0.8);
  float a = (core * 2.0 + fringe * 2.0) * falloff * opacity;
  a *= (0.9 + grain);
  a *= smoothstep(0.0, 0.15, vHeight);
  gl_FragColor = vec4(base, a);
}
`;

const DOT_VERT = `
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const DOT_FRAG = `
uniform vec3 dotColor;
uniform float dotOpacity;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  float nDotV = max(dot(vNormal, vViewDir), 0.0);
  float edge = pow(1.0 - nDotV, 1.5);
  float a = dotOpacity * (0.5 + 0.5 * nDotV);
  gl_FragColor = vec4(dotColor, a);
}
`;

const R = 6.06;
const SNAP_POINTS: [number, number][] = [];
for (let el = -60; el <= 90; el += 30) {
  const step = el === 90 || el === -90 ? 360 : 45;
  for (let az = 0; az < 360; az += step) {
    SNAP_POINTS.push([az, el]);
  }
}

function azElToPos(az: number, el: number, r: number): THREE.Vector3 {
  const a = (az * Math.PI) / 180;
  const e = (el * Math.PI) / 180;
  return new THREE.Vector3(
    r * Math.cos(e) * Math.sin(a),
    r * Math.sin(e),
    r * Math.cos(e) * Math.cos(a),
  );
}

function ThreeLightSceneInner({
  direction,
  brightness,
  color,
  viewMode,
  width = 200,
  height = 200,
}: ThreeLightSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    lightGroup: THREE.Group;
    bulb: THREE.Mesh;
    cone: THREE.Mesh;
    pointLight: THREE.PointLight;
    coneMat: THREE.ShaderMaterial;
    shellMat: THREE.ShaderMaterial;
    frameId: number;
    tAz: number;
    tEl: number;
    dispAz: number;
    dispEl: number;
    startTime: number;
    dragging: boolean;
    dragStart: { x: number; y: number };
    camAz: number;
    camEl: number;
  } | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x1a1a1a, 1);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
    camera.position.set(11, 8, 10);
    camera.lookAt(0, 0, 0);

    const shellMat = new THREE.ShaderMaterial({
      vertexShader: SHELL_VERT,
      fragmentShader: SHELL_FRAG,
      uniforms: {
        baseColor: { value: new THREE.Color(0xcccccc) },
        shadowIntensity: { value: 0.85 },
        centerAlpha: { value: 0.08 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
    });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), shellMat);
    scene.add(shell);

    const gridMat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.06, transparent: true });
    const eqGeo = new THREE.BufferGeometry();
    const eqPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      eqPts.push(new THREE.Vector3(R * Math.sin(a), 0, R * Math.cos(a)));
    }
    eqGeo.setFromPoints(eqPts);
    scene.add(new THREE.Line(eqGeo, gridMat));

    for (let elev = -60; elev <= 60; elev += 30) {
      if (elev === 0) continue;
      const pts: THREE.Vector3[] = [];
      const r2 = R * Math.cos((elev * Math.PI) / 180);
      const y = R * Math.sin((elev * Math.PI) / 180);
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(r2 * Math.sin(a), y, r2 * Math.cos(a)));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      scene.add(new THREE.Line(g, gridMat.clone()));
    }

    for (let az = 0; az < 360; az += 45) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const e = ((i / 64) * 180 - 90) * (Math.PI / 180);
        const a = (az * Math.PI) / 180;
        pts.push(new THREE.Vector3(R * Math.cos(e) * Math.sin(a), R * Math.sin(e), R * Math.cos(e) * Math.cos(a)));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      scene.add(new THREE.Line(g, gridMat.clone()));
    }

    SNAP_POINTS.forEach(([az, elv]) => {
      const dotMat = new THREE.ShaderMaterial({
        vertexShader: DOT_VERT,
        fragmentShader: DOT_FRAG,
        uniforms: {
          dotColor: { value: new THREE.Color(0xffffff) },
          dotOpacity: { value: 0.25 },
        },
        transparent: true,
        depthWrite: false,
      });
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), dotMat);
      const p = azElToPos(az, elv, R);
      dot.position.copy(p);
      scene.add(dot);
    });

    const targetGeo = new THREE.BoxGeometry(2.2, 2.2, 0.08);
    const targetMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.5,
      metalness: 0.05,
    });
    const target = new THREE.Mesh(targetGeo, targetMat);
    scene.add(target);

    const iconCanvas = document.createElement("canvas");
    iconCanvas.width = 64;
    iconCanvas.height = 64;
    const ctx = iconCanvas.getContext("2d")!;
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(10, 10, 44, 44);
    ctx.beginPath();
    ctx.arc(22, 22, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(54, 38);
    ctx.lineTo(38, 22);
    ctx.lineTo(10, 54);
    ctx.stroke();
    const iconMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 1.0),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(iconCanvas), transparent: true }),
    );
    iconMesh.position.z = 0.05;
    target.add(iconMesh);

    const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.1, transparent: true });
    target.add(new THREE.LineSegments(new THREE.EdgesGeometry(targetGeo), edgesMat));

    scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    const pointLight = new THREE.PointLight(0xffffff, 3, 0);
    scene.add(pointLight);

    const lightGroup = new THREE.Group();
    scene.add(lightGroup);

    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 48, 48), bulbMat);
    lightGroup.add(bulb);

    const coneMat = new THREE.ShaderMaterial({
      vertexShader: CONE_VERT,
      fragmentShader: CONE_FRAG,
      uniforms: {
        lightColor: { value: new THREE.Color(0xffffff) },
        opacity: { value: 0.5 },
        time: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.5, 6, 128, 1, true), coneMat);
    lightGroup.add(cone);

    const [initAz, initEl] = DIR_AZ_EL[direction];

    let frameId = 0;
    const startTime = performance.now();
    const state = {
      renderer,
      scene,
      camera,
      lightGroup,
      bulb,
      cone,
      pointLight,
      coneMat,
      shellMat,
      frameId: 0,
      tAz: initAz,
      tEl: initEl,
      dispAz: initAz,
      dispEl: initEl,
      startTime,
      dragging: false,
      dragStart: { x: 0, y: 0 },
      camAz: 45,
      camEl: 30,
    };

    function updateLightPosition() {
      const az = (state.dispAz * Math.PI) / 180;
      const el = (state.dispEl * Math.PI) / 180;
      const dist = R;
      const x = dist * Math.cos(el) * Math.sin(az);
      const y = dist * Math.sin(el);
      const z = dist * Math.cos(el) * Math.cos(az);

      state.pointLight.position.set(x, y, z);
      state.bulb.position.set(x, y, z);

      state.cone.position.set(x / 2, y / 2, z / 2);
      state.cone.lookAt(0, 0, 0);
      state.cone.rotateX(Math.PI / 2);
    }

    function updateCameraFromOrbit() {
      const az = (state.camAz * Math.PI) / 180;
      const el = (state.camEl * Math.PI) / 180;
      const camDist = 17;
      state.camera.position.set(
        camDist * Math.cos(el) * Math.sin(az),
        camDist * Math.sin(el),
        camDist * Math.cos(el) * Math.cos(az),
      );
      state.camera.lookAt(0, 0, 0);
    }

    updateLightPosition();
    updateCameraFromOrbit();

    const animate = () => {
      state.frameId = requestAnimationFrame(animate);
      const t = (performance.now() - state.startTime) / 1000;
      state.coneMat.uniforms.time.value = t;

      const lerp = 0.12;
      state.dispAz += (state.tAz - state.dispAz) * lerp;
      state.dispEl += (state.tEl - state.dispEl) * lerp;
      updateLightPosition();

      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = state;

    const onDown = (e: PointerEvent) => {
      state.dragging = true;
      state.dragStart = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!state.dragging) return;
      const dx = e.clientX - state.dragStart.x;
      const dy = e.clientY - state.dragStart.y;
      state.dragStart = { x: e.clientX, y: e.clientY };
      state.camAz -= dx * 0.5;
      state.camEl = Math.max(-80, Math.min(80, state.camEl + dy * 0.5));
      updateCameraFromOrbit();
    };
    const onUp = (e: PointerEvent) => {
      state.dragging = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    const canvas = renderer.domElement;
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onUp);

    return () => {
      cancelAnimationFrame(state.frameId);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onUp);
      renderer.dispose();
      el.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, [width, height]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sceneRef.current) return;
    const s = sceneRef.current;
    const [az, el] = DIR_AZ_EL[direction];
    s.tAz = az;
    s.tEl = el;
  }, [direction]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const s = sceneRef.current;
    const intensity = 0.5 + (brightness / 4) * 4;
    s.pointLight.intensity = intensity;
    s.coneMat.uniforms.opacity.value = 0.3 + (brightness / 4) * 0.3;
  }, [brightness]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const s = sceneRef.current;
    const c = new THREE.Color(color);
    s.pointLight.color.copy(c);
    (s.bulb.material as THREE.MeshBasicMaterial).color.copy(c);
    s.coneMat.uniforms.lightColor.value.copy(c);
  }, [color]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const s = sceneRef.current;
    if (viewMode === "front") {
      s.camAz = 90;
      s.camEl = 0;
    } else {
      s.camAz = 45;
      s.camEl = 30;
    }
    const az = (s.camAz * Math.PI) / 180;
    const el = (s.camEl * Math.PI) / 180;
    const camDist = 17;
    s.camera.position.set(
      camDist * Math.cos(el) * Math.sin(az),
      camDist * Math.sin(el),
      camDist * Math.cos(el) * Math.cos(az),
    );
    s.camera.lookAt(0, 0, 0);
  }, [viewMode]);

  return (
    <div
      ref={mountRef}
      style={{ width, height, borderRadius: 12, overflow: "hidden", cursor: "grab" }}
    />
  );
}

export const ThreeLightScene = memo(ThreeLightSceneInner);
