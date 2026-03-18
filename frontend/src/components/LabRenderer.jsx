import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import "./LabRenderer.css";

function getChemState(experimentId, completedSteps) {
  const done = (stepId) => completedSteps.includes(stepId);

  if (experimentId === "precipitation-reaction") {
    return {
      pH: done("observe-agcl") ? 5.9 : done("add-nacl") ? 6.5 : 6.9,
      volumeMl: done("pour-agno3") ? 18 : 0,
      reaction: done("observe-agcl")
        ? "White AgCl precipitate has settled at the bottom."
        : done("add-nacl")
          ? "AgNO3 + NaCl reacting. AgCl precipitate is forming."
          : "Add NaCl and then pour AgNO3 to start precipitation.",
      liquidColor: done("observe-agcl") ? "#dfe8f0" : "#eaf1ff",
    };
  }

  return {
    pH: 6.8,
    volumeMl: done("add-reagent-a") ? 8 : 0,
    reaction: "Interactive photorealistic chemistry bench ready.",
    liquidColor: "#e8f2ff",
  };
}

function createConcreteTexture({
  base = "#24282e",
  line = "#343940",
  noise = 0.18,
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = line;
  ctx.lineWidth = 4;
  for (let i = 0; i <= 1024; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  const amount = Math.floor(1024 * 1024 * noise * 0.02);
  for (let i = 0; i < amount; i += 1) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const alpha = 0.06 + Math.random() * 0.1;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCondensationNormalTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "rgb(128,128,255)";
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 520; i += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 1 + Math.random() * 4;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(150,170,255,0.45)");
    grad.addColorStop(1, "rgba(90,110,230,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

function RendererConfig({ containerRef }) {
  const { scene, gl, camera } = useThree();

  useEffect(() => {
    RectAreaLightUniformsLib.init();

    gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.physicallyCorrectLights = true;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.84;
    gl.outputColorSpace = THREE.SRGBColorSpace;

    scene.background = new THREE.Color(0x111827);

    const container = containerRef.current;
    if (container) {
      const width =
        container.clientWidth > 0
          ? container.clientWidth
          : Math.floor(window.innerWidth * 0.55);
      const height =
        container.clientHeight > 0
          ? container.clientHeight
          : Math.floor(window.innerHeight * 0.7);
      const safeWidth = Math.max(1, width);
      const safeHeight = Math.max(1, height);

      gl.setSize(safeWidth, safeHeight);
      camera.aspect = safeWidth / safeHeight;
      camera.updateProjectionMatrix();
    }
  }, [gl, scene, camera, containerRef]);

  return null;
}

function EnvironmentReflections() {
  const { scene, gl } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    let neutralEnv = null;

    try {
      neutralEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    } catch {
      const fallbackScene = new THREE.Scene();
      fallbackScene.background = new THREE.Color(0x334455);
      neutralEnv = pmrem.fromScene(fallbackScene).texture;
    }

    scene.environment = neutralEnv;

    return () => {
      scene.environment = null;
      neutralEnv?.dispose();
      pmrem.dispose();
    };
  }, [scene, gl]);

  return null;
}

function CameraBob() {
  const { camera } = useThree();
  const baseY = useRef(1.8);

  useEffect(() => {
    camera.position.set(0, 1.8, 3.5);
    camera.fov = 42;
    camera.lookAt(0, 0.5, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame(({ clock }) => {
    camera.position.y =
      baseY.current + Math.sin(clock.elapsedTime * 1.3) * 0.002;
  });

  return null;
}

function DustMotes() {
  const pointsRef = useRef(null);
  const count = 220;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 7.2;
      arr[i * 3 + 1] = 0.7 + Math.random() * 2.2;
      arr[i * 3 + 2] = -2.2 + Math.random() * 3.8;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.elapsedTime * 0.025;
    pointsRef.current.position.y =
      1.2 + Math.sin(clock.elapsedTime * 0.22) * 0.03;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={0xc7d2de}
        size={0.02}
        transparent
        opacity={0.16}
        depthWrite={false}
      />
    </points>
  );
}

function FloatingLabels({ containerRef, labels }) {
  const { scene, camera, gl } = useThree();
  const rendererRef = useRef(null);
  const labelObjectsRef = useRef([]);
  const upVec = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useEffect(() => {
    const renderer = new CSS2DRenderer();
    renderer.setSize(gl.domElement.clientWidth, gl.domElement.clientHeight);
    renderer.domElement.className = "css2d-layer";

    const container = containerRef.current;
    if (container) {
      container.appendChild(renderer.domElement);
    }

    rendererRef.current = renderer;

    labelObjectsRef.current = labels.map((label) => {
      const el = document.createElement("div");
      el.className = "chem-label";
      el.innerHTML = `<strong>${label.name}</strong><span>${label.concentration}</span><span>${label.volume}</span>`;
      const cssLabel = new CSS2DObject(el);
      cssLabel.position.copy(label.position);
      scene.add(cssLabel);
      return cssLabel;
    });

    const onResize = () => {
      if (!rendererRef.current) return;
      rendererRef.current.setSize(
        gl.domElement.clientWidth,
        gl.domElement.clientHeight,
      );
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      labelObjectsRef.current.forEach((obj) => {
        scene.remove(obj);
      });
      labelObjectsRef.current = [];

      if (rendererRef.current?.domElement.parentNode) {
        rendererRef.current.domElement.parentNode.removeChild(
          rendererRef.current.domElement,
        );
      }
      rendererRef.current = null;
    };
  }, [scene, camera, gl, containerRef, labels]);

  useFrame(() => {
    if (!rendererRef.current) return;

    labelObjectsRef.current.forEach((obj) => {
      const toCam = camera.position.clone().sub(obj.position).normalize();
      const angleFactor = Math.max(
        0,
        Math.min(1, (toCam.dot(upVec) - 0.08) / 0.45),
      );
      obj.element.style.opacity = angleFactor.toFixed(2);
    });

    rendererRef.current.render(scene, camera);
  });

  return null;
}

function PrecipitateParticles({ active, cloudinessRef }) {
  const pointsRef = useRef(null);
  const velocityRef = useRef([]);
  const baseYRef = useRef([]);
  const count = 360;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const velocities = [];
    const baseY = [];

    for (let i = 0; i < count; i += 1) {
      const x = (Math.random() - 0.5) * 0.6;
      const y = 0.78 + Math.random() * 0.5;
      const z = (Math.random() - 0.5) * 0.6;
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
      velocities.push(0);
      baseY.push(-0.22 + Math.random() * 0.06);
    }

    velocityRef.current = velocities;
    baseYRef.current = baseY;
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current || !active) return;
    const attr = pointsRef.current.geometry.attributes.position;

    for (let i = 0; i < count; i += 1) {
      const idx = i * 3 + 1;
      velocityRef.current[i] += 1.9 * delta;
      attr.array[idx] -= velocityRef.current[i] * delta;

      const floor = baseYRef.current[i];
      if (attr.array[idx] <= floor) {
        attr.array[idx] = floor;
        velocityRef.current[i] = 0;
      }
    }

    attr.needsUpdate = true;
    pointsRef.current.material.opacity = 0.08 + cloudinessRef.current * 0.75;
  });

  return (
    <points ref={pointsRef} position={[0, 0.22, 0]} visible={active}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={0xffffff}
        size={0.025}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </points>
  );
}

function LabScene({ onAction, pourSignal, chem }) {
  const agNo3LiquidRef = useRef(null);
  const reactionLiquidRef = useRef(null);
  const streamRef = useRef(null);

  const [isPouring, setIsPouring] = useState(false);
  const [precipitateActive, setPrecipitateActive] = useState(false);
  const pourProgressRef = useRef(0);
  const transferRatioRef = useRef(0);
  const cloudinessRef = useRef(0);
  const reactionFlashRef = useRef(0);

  const concreteWall = useMemo(
    () =>
      createConcreteTexture({ base: "#e8ecf0", line: "#d0d4d8", noise: 0.2 }),
    [],
  );
  const floorTexture = useMemo(
    () =>
      createConcreteTexture({ base: "#f0f4f8", line: "#e0e4e8", noise: 0.15 }),
    [],
  );
  const condensationNormal = useMemo(
    () => createCondensationNormalTexture(),
    [],
  );

  const glassMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xf4f6f8,
        metalness: 0,
        roughness: 0.04,
        transmission: 0.95,
        thickness: 1.05,
        ior: 1.5,
        transparent: true,
        opacity: 0.94,
        side: THREE.DoubleSide,
        envMapIntensity: 1.08,
        reflectivity: 0.55,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        attenuationColor: new THREE.Color(0xe4e7ea),
        attenuationDistance: 1.05,
      }),
    [],
  );

  const markingHeights = useMemo(() => [-0.26, -0.14, -0.02, 0.1, 0.22], []);

  const buretteMarkingHeights = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) =>
        Number((0.46 - i * 0.085).toFixed(3)),
      ),
    [],
  );

  const flaskProfile = useMemo(
    () => [
      new THREE.Vector2(0.06, -0.36),
      new THREE.Vector2(0.22, -0.31),
      new THREE.Vector2(0.26, -0.15),
      new THREE.Vector2(0.2, 0.08),
      new THREE.Vector2(0.11, 0.24),
      new THREE.Vector2(0.08, 0.4),
      new THREE.Vector2(0.07, 0.55),
    ],
    [],
  );

  useEffect(() => {
    if (!pourSignal) return;
    setIsPouring(true);
    setPrecipitateActive(false);
    cloudinessRef.current = 0;
    onAction?.();

    const settleTimer = setTimeout(() => {
      setIsPouring(false);
      setPrecipitateActive(true);
      reactionFlashRef.current = 1;
    }, 1800);

    return () => {
      clearTimeout(settleTimer);
    };
  }, [pourSignal, onAction]);

  useFrame((_, delta) => {
    if (condensationNormal) {
      condensationNormal.offset.x += delta * 0.01;
      condensationNormal.offset.y += delta * 0.006;
    }

    const targetPour = isPouring ? 1 : 0;
    const nextPour = THREE.MathUtils.damp(
      pourProgressRef.current,
      targetPour,
      3.2,
      delta,
    );
    pourProgressRef.current = nextPour;

    if (isPouring) {
      transferRatioRef.current = Math.min(
        1,
        transferRatioRef.current + delta * 0.22,
      );
    }

    if (agNo3LiquidRef.current) {
      agNo3LiquidRef.current.scale.y = 1 - transferRatioRef.current * 0.45;
    }

    if (reactionLiquidRef.current) {
      reactionLiquidRef.current.scale.y =
        0.62 + transferRatioRef.current * 0.33;
      reactionLiquidRef.current.position.y =
        -0.18 + transferRatioRef.current * 0.17;
      reactionLiquidRef.current.material.color.setStyle(
        transferRatioRef.current > 0.55
          ? `rgb(${214 + cloudinessRef.current * 10}, ${224 + cloudinessRef.current * 8}, ${236 + cloudinessRef.current * 6})`
          : chem.liquidColor,
      );
      reactionLiquidRef.current.material.opacity =
        0.52 + cloudinessRef.current * 0.2;
    }

    if (streamRef.current) {
      streamRef.current.visible = nextPour > 0.04;
      streamRef.current.scale.y = 0.35 + nextPour * 0.92;
      streamRef.current.material.opacity = nextPour * 0.5;
    }

    const targetCloud = precipitateActive ? 1 : nextPour * 0.35;
    cloudinessRef.current = THREE.MathUtils.damp(
      cloudinessRef.current,
      targetCloud,
      1.9,
      delta,
    );

    reactionFlashRef.current = Math.max(0, reactionFlashRef.current - delta);
  });

  return (
    <group>
      {/* Floor */}
      <mesh
        position={[0, -1.64, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color={0x0d0d0d} roughness={0.8} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 1.5, -1.5]}>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial color={0x1a2035} roughness={0.9} />
      </mesh>

      <mesh
        position={[-5.9, 2.5, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[9.2, 5]} />
        <meshStandardMaterial
          map={concreteWall}
          color={0xe5e9ed}
          roughness={0.88}
          metalness={0.02}
        />
      </mesh>

      {/* Main bench top */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[5, 0.08, 2]} />
        <meshStandardMaterial
          color={0x252b33}
          roughness={0.34}
          metalness={0.08}
          envMapIntensity={1.05}
        />
      </mesh>

      {/* Bench legs */}
      <mesh position={[-2.2, -0.84, -0.8]}>
        <boxGeometry args={[0.08, 1.6, 0.08]} />
        <meshStandardMaterial color={0x2a2f36} roughness={0.52} />
      </mesh>
      <mesh position={[2.2, -0.84, -0.8]}>
        <boxGeometry args={[0.08, 1.6, 0.08]} />
        <meshStandardMaterial color={0x2a2f36} roughness={0.52} />
      </mesh>
      <mesh position={[-2.2, -0.84, 0.8]}>
        <boxGeometry args={[0.08, 1.6, 0.08]} />
        <meshStandardMaterial color={0x2a2f36} roughness={0.52} />
      </mesh>
      <mesh position={[2.2, -0.84, 0.8]}>
        <boxGeometry args={[0.08, 1.6, 0.08]} />
        <meshStandardMaterial color={0x2a2f36} roughness={0.52} />
      </mesh>

      {/* Beakers */}
      <group position={[-1.2, 0.39, 0.1]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.22, 0.19, 0.7, 48, 1, true]} />
          <primitive object={glassMaterial} attach="material" />
        </mesh>
        <mesh position={[0, -0.35, 0]}>
          <circleGeometry args={[0.19, 48]} />
          <primitive object={glassMaterial} attach="material" />
        </mesh>
        <mesh ref={agNo3LiquidRef} position={[0, -0.35 + 0.125, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.25, 48]} />
          <meshPhysicalMaterial
            color={0x6da4d6}
            transmission={0.55}
            roughness={0.06}
            transparent
            opacity={0.8}
            ior={1.33}
            thickness={0.3}
          />
        </mesh>
        <mesh position={[0, -0.225, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.168, 40]} />
          <meshPhysicalMaterial
            color={0x7aaede}
            transmission={0.45}
            roughness={0.05}
            transparent
            opacity={0.76}
            ior={1.33}
          />
        </mesh>
        {markingHeights.map((y, i) => (
          <mesh key={`beaker-left-mark-${i}`} position={[0.19, y, 0]}>
            <boxGeometry args={[0.028, 0.004, 0.004]} />
            <meshStandardMaterial color={0xd5dde6} roughness={0.4} />
          </mesh>
        ))}
      </group>

      <group position={[1.2, 0.39, 0.1]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.22, 0.19, 0.7, 48, 1, true]} />
          <primitive object={glassMaterial} attach="material" />
        </mesh>
        <mesh position={[0, -0.35, 0]}>
          <circleGeometry args={[0.19, 48]} />
          <primitive object={glassMaterial} attach="material" />
        </mesh>
        <mesh position={[0, -0.35 + 0.1, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.2, 48]} />
          <meshPhysicalMaterial
            color={0xa8d1b0}
            transmission={0.55}
            roughness={0.06}
            transparent
            opacity={0.8}
            ior={1.33}
            thickness={0.3}
          />
        </mesh>
        <mesh position={[0, -0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.168, 40]} />
          <meshPhysicalMaterial
            color={0xb7ddbe}
            transmission={0.45}
            roughness={0.05}
            transparent
            opacity={0.76}
            ior={1.33}
          />
        </mesh>
        {markingHeights.map((y, i) => (
          <mesh key={`beaker-right-mark-${i}`} position={[0.19, y, 0]}>
            <boxGeometry args={[0.028, 0.004, 0.004]} />
            <meshStandardMaterial color={0xd5dde6} roughness={0.4} />
          </mesh>
        ))}
      </group>

      <mesh position={[0, 0.54, 0]} castShadow>
        <latheGeometry args={[flaskProfile, 64]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      <mesh ref={reactionLiquidRef} position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.17, 0.09, 0.18, 48]} />
        <meshPhysicalMaterial
          color={0xdfa6be}
          transmission={0.5}
          transparent={true}
          opacity={0.74}
          roughness={0.08}
          ior={1.33}
        />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.165, 40]} />
        <meshPhysicalMaterial
          color={0xe9b6cb}
          transmission={0.45}
          transparent
          opacity={0.72}
          roughness={0.05}
          ior={1.33}
        />
      </mesh>

      {/* Burette */}
      <mesh position={[0.8, 1.1, -0.3]}>
        <cylinderGeometry args={[0.016, 0.016, 2.2, 16]} />
        <meshStandardMaterial
          color={0x444444}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0.8, 1.3, -0.3]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 1.8, 32, 1, true]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0.8, 1.4, -0.3]}>
        <cylinderGeometry args={[0.016, 0.016, 1.4, 32]} />
        <meshPhysicalMaterial
          color={0xa5cda5}
          transmission={0.55}
          transparent={true}
          opacity={0.7}
          roughness={0.06}
          ior={1.33}
        />
      </mesh>
      {buretteMarkingHeights.map((y, i) => (
        <mesh key={`burette-mark-${i}`} position={[0.824, 1.3 + y, -0.3]}>
          <boxGeometry args={[0.014, 0.0028, 0.002]} />
          <meshStandardMaterial color={0xd7dfe7} roughness={0.38} />
        </mesh>
      ))}
      <mesh position={[0.8, 0.42, -0.3]} castShadow>
        <boxGeometry args={[0.08, 0.018, 0.018]} />
        <meshStandardMaterial
          color={0xc7ced4}
          metalness={0.55}
          roughness={0.38}
        />
      </mesh>
      <mesh position={[0.86, 0.4, -0.3]} castShadow>
        <coneGeometry args={[0.007, 0.1, 16]} />
        <meshStandardMaterial
          color={0xcfd6dc}
          metalness={0.34}
          roughness={0.32}
        />
      </mesh>
      <mesh castShadow position={[0.13, 1.22, 0]}>
        <boxGeometry args={[0.24, 0.08, 0.12]} />
        <meshStandardMaterial
          color={0xd5d9dd}
          roughness={0.45}
          metalness={0.82}
        />
      </mesh>
      <mesh position={[0.23, 1.08, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.013, 0.52, 20]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0.4, 0.63, 0]} castShadow>
        <cylinderGeometry args={[0.011, 0.008, 0.92, 20]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      <mesh position={[0.4, 0.15, 0]} castShadow>
        <coneGeometry args={[0.006, 0.12, 18]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>

      {/* Soft contact shadows on bench */}
      <mesh position={[-1.2, 0.042, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.14} />
      </mesh>
      <mesh position={[1.2, 0.042, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.14} />
      </mesh>
      <mesh position={[0, 0.042, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.34, 32]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.12} />
      </mesh>
      <mesh position={[0.8, 0.042, -0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.16, 32]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.1} />
      </mesh>

      <rectAreaLight
        color={0xffffff}
        intensity={1.9}
        width={6}
        height={4}
        position={[0, 4, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      <directionalLight
        color={0xffffff}
        intensity={0.48}
        position={[0, 3.1, 1.1]}
        castShadow
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-camera-near={0.5}
        shadow-camera-far={11}
        shadow-camera-left={-3.1}
        shadow-camera-right={3.1}
        shadow-camera-top={3}
        shadow-camera-bottom={-2.5}
        shadow-bias={-0.00015}
        shadow-normalBias={0.015}
      />

      <directionalLight
        color={0xffffff}
        intensity={0.2}
        position={[0, 1.9, 2.9]}
      />
      <ambientLight color={0xffffff} intensity={0.58} />
    </group>
  );
}

function CanvasResizeSync({ containerRef }) {
  const { gl, camera } = useThree();

  useEffect(() => {
    const syncSize = () => {
      const container = containerRef.current;
      if (!container) return;

      const width =
        container.clientWidth > 0
          ? container.clientWidth
          : Math.floor(window.innerWidth * 0.55);
      const height =
        container.clientHeight > 0
          ? container.clientHeight
          : Math.floor(window.innerHeight * 0.7);
      const safeWidth = Math.max(1, width);
      const safeHeight = Math.max(1, height);

      gl.setSize(safeWidth, safeHeight);
      camera.aspect = safeWidth / safeHeight;
      camera.updateProjectionMatrix();
    };

    syncSize();
    const rafId = window.requestAnimationFrame(syncSize);
    window.addEventListener("resize", syncSize);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", syncSize);
    };
  }, [gl, camera, containerRef]);

  return null;
}

export default function LabRenderer({
  experimentId,
  completedSteps,
  animating,
  expectedStepId,
  feedbackType,
  onDropEquipment,
  onAction,
}) {
  const canvasContainerRef = useRef(null);
  const [canvasHost, setCanvasHost] = useState(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [pourSignal, setPourSignal] = useState(0);

  const setCanvasContainerRef = useCallback((node) => {
    canvasContainerRef.current = node;
    setCanvasHost(node);
  }, []);

  useEffect(() => {
    if (!canvasHost) {
      setCanvasReady(false);
      return;
    }

    const updateReadyState = () => {
      const width = canvasHost.clientWidth;
      const height = canvasHost.clientHeight;
      setCanvasReady(width > 0 && height > 0);
    };

    updateReadyState();

    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateReadyState);
      observer.observe(canvasHost);
    }

    const rafId = window.requestAnimationFrame(updateReadyState);
    window.addEventListener("resize", updateReadyState);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateReadyState);
      observer?.disconnect();
    };
  }, [canvasHost]);

  const chem = useMemo(
    () => getChemState(experimentId, completedSteps, animating),
    [experimentId, completedSteps, animating],
  );

  const labels = useMemo(
    () => [
      {
        name: "AgNO3",
        concentration: "0.1M",
        volume: `${(12 - Math.min(12, pourSignal * 0.6)).toFixed(1)} mL`,
        position: new THREE.Vector3(-1.25, 1.95, 0.22),
      },
      {
        name: "NaCl",
        concentration: "0.1M",
        volume: "12.0 mL",
        position: new THREE.Vector3(1.25, 1.95, 0.22),
      },
      {
        name: "Reaction Vessel",
        concentration: "AgCl formation",
        volume: `${(6 + Math.min(12, pourSignal * 0.6)).toFixed(1)} mL`,
        position: new THREE.Vector3(0, 2.05, 0),
      },
    ],
    [pourSignal],
  );

  const onWorkspaceDrop = (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;

    try {
      const payload = JSON.parse(raw);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      onDropEquipment?.(payload.equipmentId, {
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(7, Math.min(92, y)),
      });
    } catch {
      // Ignore malformed payloads from drag source.
    }
  };

  const triggerPour = () => {
    setPourSignal((v) => v + 1);
  };

  return (
    <div className="lab-renderer-shell">
      <div
        className={`lab-renderer ${feedbackType === "error" ? "is-error" : ""} ${feedbackType === "success" ? "is-success" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onWorkspaceDrop}
      >
        <div className="chem-panels">
          <div className="metric-card">
            <span className="metric-label">pH Meter</span>
            <div className="ph-meter-shell">
              <div
                className="ph-meter-marker"
                style={{
                  left: `calc(${(chem.pH / 14) * 100}% - 6px)`,
                  backgroundColor: chem.liquidColor,
                }}
              />
            </div>
            <span className="metric-value">{chem.pH.toFixed(1)} / 14</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Volume</span>
            <span className="metric-value">{chem.volumeMl.toFixed(1)} mL</span>
          </div>
          <div className="metric-card wide">
            <span className="metric-label">Reaction</span>
            <span className="metric-value">{chem.reaction}</span>
          </div>
        </div>

        <div
          className="lab-canvas"
          id="lab-canvas-container"
          ref={setCanvasContainerRef}
        >
          <button type="button" className="pour-button" onClick={triggerPour}>
            Pour AgNO3
          </button>

          {canvasReady ? (
            <Canvas
              shadows
              dpr={[1, 2]}
              gl={{ antialias: true }}
              camera={{
                position: [0, 1.8, 3.5],
                fov: 44,
                near: 0.1,
                far: 100,
              }}
            >
              <RendererConfig containerRef={canvasContainerRef} />
              <EnvironmentReflections />
              <CanvasResizeSync containerRef={canvasContainerRef} />
              <CameraBob />

              <LabScene
                chem={chem}
                pourSignal={pourSignal}
                onAction={() => onAction?.(expectedStepId)}
              />

              <OrbitControls
                target={[0, 0.5, 0]}
                enableDamping
                dampingFactor={0.05}
                minDistance={2}
                maxDistance={6}
                maxPolarAngle={Math.PI / 2.1}
                minPolarAngle={0.55}
              />

              <FloatingLabels
                containerRef={canvasContainerRef}
                labels={labels}
              />
            </Canvas>
          ) : null}
        </div>
      </div>
    </div>
  );
}
