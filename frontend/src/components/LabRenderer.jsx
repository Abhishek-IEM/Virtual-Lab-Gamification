import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import "./LabRenderer.css";

function InitialCameraPose() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(1.7, 3.15, 7.05);
    camera.lookAt(0, 0.2, 0);
    camera.fov = 52;
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

function getChemState(experimentId, completedSteps, animating) {
  const done = (stepId) => completedSteps.includes(stepId);

  if (experimentId === "acid-base-titration") {
    const volumeMl = done("titrate-naoh")
      ? 24.7
      : done("add-phenolphthalein")
        ? 4.2
        : 0;
    const pH = done("observe-endpoint")
      ? 8.2
      : done("titrate-naoh")
        ? 7.1
        : 1.2;
    const liquidColor = done("observe-endpoint")
      ? "#f4b7d2"
      : done("add-phenolphthalein")
        ? "#e9f7ff"
        : "#d5f1ff";

    return {
      pH,
      volumeMl,
      liquidColor,
      reaction: done("observe-endpoint")
        ? "Endpoint reached: faint permanent pink."
        : animating === "burette-drops"
          ? "NaOH dispensing from burette."
          : "Prepare titration setup.",
    };
  }

  if (experimentId === "ph-indicator-testing") {
    const pH = done("record-ph") ? 9.4 : done("add-methyl-orange") ? 6.8 : 4.2;
    const liquidColor = done("add-methyl-orange")
      ? "#ffd96a"
      : done("add-phenolphthalein")
        ? "#f5e7f2"
        : "#e4f6ff";

    return {
      pH,
      volumeMl: done("prepare-sample") ? 12 : 0,
      liquidColor,
      reaction: done("record-ph")
        ? "Indicator response recorded against pH scale."
        : "Add indicators dropwise and compare colors.",
    };
  }

  if (experimentId === "precipitation-reaction") {
    return {
      pH: 6.8,
      volumeMl: done("pour-agno3") ? 18 : 0,
      liquidColor: "#e8f2ff",
      reaction: done("observe-agcl")
        ? "White AgCl precipitate clearly visible."
        : done("add-nacl")
          ? "Double displacement started. AgCl forming."
          : "Add NaCl to silver nitrate to trigger precipitation.",
    };
  }

  if (experimentId === "neutralization-reaction") {
    return {
      pH: done("check-ph-neutral") ? 7.0 : done("add-base") ? 7.6 : 1.4,
      volumeMl: done("add-base") ? 20 : done("add-acid") ? 10 : 0,
      liquidColor: done("add-base") ? "#f6fdff" : "#e7f6ff",
      reaction: done("check-ph-neutral")
        ? "Neutralization complete. pH close to 7."
        : "Mix acid and base, then stir for uniform reaction.",
    };
  }

  if (experimentId === "filtration-process") {
    return {
      pH: 6.9,
      volumeMl: done("collect-filtrate")
        ? 13.5
        : done("pour-mixture")
          ? 4.8
          : 0,
      liquidColor: "#dff5ff",
      reaction: done("collect-filtrate")
        ? "Clear filtrate collected. Residue remains on paper."
        : "Pour mixture slowly into filter cone.",
    };
  }

  return {
    pH: done("add-acid-gas") ? 3.4 : 6.5,
    volumeMl: done("add-reagent-a") ? 8 : 0,
    liquidColor: done("add-reagent-b") ? "#74d0b8" : "#75b9ff",
    reaction: done("add-acid-gas")
      ? "CO2 bubbles visible after carbonate + acid reaction."
      : done("add-reagent-b")
        ? "Color changed due to chemical mixing."
        : "Add reagents to begin mixing reaction.",
  };
}

function createVerticalGradientTexture(topColor, bottomColor) {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 256;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, bottomColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 8, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createLabelTexture(text, options = {}) {
  const {
    width = 256,
    height = 96,
    bg = "rgba(250, 252, 255, 0.92)",
    border = "rgba(35, 52, 75, 0.4)",
    textColor = "#20324a",
    font = "600 42px Segoe UI",
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = 4;

  const radius = 14;
  ctx.beginPath();
  ctx.moveTo(radius, 2);
  ctx.lineTo(width - radius, 2);
  ctx.quadraticCurveTo(width - 2, 2, width - 2, radius);
  ctx.lineTo(width - 2, height - radius);
  ctx.quadraticCurveTo(width - 2, height - 2, width - radius, height - 2);
  ctx.lineTo(radius, height - 2);
  ctx.quadraticCurveTo(2, height - 2, 2, height - radius);
  ctx.lineTo(2, radius);
  ctx.quadraticCurveTo(2, 2, radius, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = textColor;
  ctx.fillText(text, width / 2, height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createScratchTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 512, 512);
  ctx.strokeStyle = "rgba(150, 170, 195, 0.18)";
  ctx.lineWidth = 1;

  for (let i = 0; i < 170; i += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const len = 10 + Math.random() * 36;
    const angle = -0.22 + Math.random() * 0.44;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

function createSurfaceTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 1024, 512);
  grad.addColorStop(0, "#dedfe3");
  grad.addColorStop(0.5, "#e8eaee");
  grad.addColorStop(1, "#dadde2");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.fillStyle = "rgba(112, 122, 136, 0.08)";
  for (let i = 0; i < 240; i += 1) {
    const x = Math.random() * 1024;
    const y = Math.random() * 512;
    const r = Math.random() * 1.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.8, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createBackdropTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 900;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, 900);
  grad.addColorStop(0, "#f5f7fa");
  grad.addColorStop(0.65, "#eef2f6");
  grad.addColorStop(1, "#e9edf1");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1600, 900);

  ctx.strokeStyle = "rgba(185, 194, 205, 0.18)";
  ctx.lineWidth = 2;
  for (let y = 120; y < 900; y += 120) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1600, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createTileTexture() {
  const tileCanvas = document.createElement("canvas");
  tileCanvas.width = 256;
  tileCanvas.height = 256;

  const ctx = tileCanvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#f0f0ec";
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "#ccccc0";
  ctx.lineWidth = 2;

  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  const tileTexture = new THREE.CanvasTexture(tileCanvas);
  tileTexture.wrapS = THREE.RepeatWrapping;
  tileTexture.wrapT = THREE.RepeatWrapping;
  tileTexture.repeat.set(6, 4);
  tileTexture.colorSpace = THREE.SRGBColorSpace;
  return tileTexture;
}

function RebuiltLabScene({ onAction, chem, animating }) {
  const hclBeakerRef = useRef(null);
  const indicatorBeakerRef = useRef(null);
  const naohBeakerRef = useRef(null);

  const leftLiquidRef = useRef(null);
  const rightLiquidRef = useRef(null);
  const flaskLiquidRef = useRef(null);
  const dropletRef = useRef(null);
  const pourStreamRef = useRef(null);
  const avatarHeadRef = useRef(null);

  const LEFT_X = -2.5;
  const RIGHT_X = 2.5;
  const GLASS_Z = 0.72;
  const LABEL_Z = 1.38;

  const GLASS = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xffffff),
        transmission: 0.95,
        opacity: 0.1,
        transparent: true,
        roughness: 0.05,
        metalness: 0,
        ior: 1.5,
        thickness: 0.5,
        side: THREE.DoubleSide,
        envMapIntensity: 2.6,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
      }),
    [],
  );

  useEffect(() => {
    const hclBeaker = hclBeakerRef.current;
    const indicatorBeaker = indicatorBeakerRef.current;
    const naohBeaker = naohBeakerRef.current;

    if (!hclBeaker || !indicatorBeaker || !naohBeaker) return;

    hclBeaker.material = GLASS;
    indicatorBeaker.material = GLASS;
    naohBeaker.material = GLASS;
  }, [GLASS]);

  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.95,
        roughness: 0.05,
        metalness: 0,
        ior: 1.5,
        thickness: 0.4,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        envMapIntensity: 2.9,
        clearcoat: 1,
      }),
    [],
  );

  const tableTexture = useMemo(() => createSurfaceTexture(), []);

  const beakerInnerRadius = 0.5;
  const beakerHeight = 1.9;

  const liquidHClMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xecf4ff,
        roughness: 0.02,
        metalness: 0.04,
        transparent: true,
        opacity: 0.62,
        transmission: 0.9,
        ior: 1.338,
        thickness: 0.7,
      }),
    [],
  );

  const liquidIndicatorMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xd6e6ff,
        roughness: 0.02,
        metalness: 0,
        transparent: true,
        opacity: 0.6,
        transmission: 0.84,
        thickness: 0.68,
      }),
    [],
  );

  const liquidNaOHMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0x92c4ff,
        roughness: 0.02,
        metalness: 0.04,
        transparent: true,
        opacity: 0.66,
        transmission: 0.88,
        ior: 1.338,
        thickness: 0.75,
      }),
    [],
  );

  const flaskBaseColor = useMemo(
    () => new THREE.Color(chem?.liquidColor || "#c9f5ff"),
    [chem?.liquidColor],
  );
  const flaskTopHex = useMemo(
    () =>
      `#${flaskBaseColor.clone().lerp(new THREE.Color("#ffffff"), 0.3).getHexString()}`,
    [flaskBaseColor],
  );
  const flaskBottomHex = useMemo(
    () => `#${flaskBaseColor.clone().multiplyScalar(0.78).getHexString()}`,
    [flaskBaseColor],
  );
  const flaskMeniscusHex = useMemo(
    () =>
      `#${flaskBaseColor.clone().lerp(new THREE.Color("#ffffff"), 0.42).getHexString()}`,
    [flaskBaseColor],
  );

  const tileTexture = useMemo(() => createTileTexture(), []);
  const rodScratchTexture = useMemo(() => createScratchTexture(), []);

  const hclLabelTexture = useMemo(
    () =>
      createLabelTexture("AgNO3", {
        bg: "rgba(0, 0, 0, 0.62)",
        border: "rgba(255, 255, 255, 0.22)",
        textColor: "#eff6ff",
        font: "600 34px Inter",
      }),
    [],
  );
  const naohLabelTexture = useMemo(
    () =>
      createLabelTexture("NaCl", {
        bg: "rgba(0, 0, 0, 0.62)",
        border: "rgba(255, 255, 255, 0.22)",
        textColor: "#eff6ff",
        font: "600 34px Inter",
        width: 280,
      }),
    [],
  );
  const indicatorLabelTexture = useMemo(
    () =>
      createLabelTexture("Indicator", {
        width: 300,
        bg: "rgba(0, 0, 0, 0.62)",
        border: "rgba(255, 255, 255, 0.22)",
        textColor: "#eff6ff",
        font: "600 32px Inter",
      }),
    [],
  );

  const flaskProfile = useMemo(
    () => [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.62, 0),
      new THREE.Vector2(0.86, 0.35),
      new THREE.Vector2(0.98, 0.95),
      new THREE.Vector2(0.78, 1.55),
      new THREE.Vector2(0.27, 2.02),
      new THREE.Vector2(0.27, 2.55),
    ],
    [],
  );

  const beakerMarks = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        y: -1.01 + i * 0.13,
        major: i % 3 === 0,
      })),
    [],
  );

  const buretteMarks = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => ({
        y: 2.52 - i * 0.14,
        major: i % 5 === 0,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pouringActive =
      animating === "burette-drops" || animating?.includes("pour") || false;

    if (leftLiquidRef.current) {
      leftLiquidRef.current.rotation.z = Math.sin(t * 1.1) * 0.008;
      leftLiquidRef.current.position.y = -0.6 + Math.sin(t * 1.15) * 0.007;
    }

    if (rightLiquidRef.current) {
      rightLiquidRef.current.rotation.z = Math.cos(t * 1.15) * 0.008;
      rightLiquidRef.current.position.y = -0.6 + Math.cos(t * 1.2) * 0.007;
    }

    if (flaskLiquidRef.current) {
      flaskLiquidRef.current.rotation.z = Math.sin(t * 1.4) * 0.012;
      flaskLiquidRef.current.position.y = -0.86 + Math.sin(t * 1.3) * 0.009;
    }

    if (dropletRef.current) {
      const cycle = (t * 0.75) % 1;
      dropletRef.current.position.y = -0.15 - cycle * 0.86;
      dropletRef.current.visible = cycle < 0.9;
      const s = 0.86 + (1 - cycle) * 0.22;
      dropletRef.current.scale.set(s, s, s);
    }

    if (pourStreamRef.current) {
      const streamPulse = 0.7 + Math.sin(t * 10) * 0.08;
      pourStreamRef.current.scale.y = pouringActive ? streamPulse : 0.04;
      pourStreamRef.current.material.opacity = pouringActive ? 0.32 : 0.06;
    }

    if (avatarHeadRef.current) {
      avatarHeadRef.current.rotation.y = Math.sin(t * 0.24) * 0.04;
      avatarHeadRef.current.position.y = 1.02;
    }
  });

  return (
    <group>
      <mesh position={[0, 1.45, -5.8]}>
        <planeGeometry args={[15, 10]} />
        <meshStandardMaterial color={0x1f2632} roughness={0.9} metalness={0} />
      </mesh>

      <mesh position={[0, -1.25, 0]} receiveShadow>
        <boxGeometry args={[11.8, 0.26, 5.6]} />
        <meshPhysicalMaterial
          map={tableTexture}
          roughnessMap={tableTexture}
          color={0x192334}
          roughness={0.52}
          metalness={0.3}
          clearcoat={0.24}
          clearcoatRoughness={0.42}
          envMapIntensity={1.2}
        />
      </mesh>

      <mesh position={[0, -1.106, 0]} receiveShadow>
        <boxGeometry args={[11.5, 0.02, 5.35]} />
        <meshPhysicalMaterial
          color={0x202c3f}
          roughness={0.24}
          metalness={0.42}
          clearcoat={0.9}
          clearcoatRoughness={0.12}
          transparent
          opacity={0.45}
          envMapIntensity={1.45}
        />
      </mesh>

      <mesh position={[0, -1.08, 2.68]} receiveShadow>
        <boxGeometry args={[11.8, 0.08, 0.18]} />
        <meshStandardMaterial color={0xcdd2d9} roughness={0.8} />
      </mesh>

      <mesh position={[LEFT_X, -1.22, GLASS_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.68, 48]} />
        <meshStandardMaterial color={0x000000} transparent opacity={0.12} />
      </mesh>

      <mesh
        position={[RIGHT_X, -1.22, GLASS_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.68, 48]} />
        <meshStandardMaterial color={0x000000} transparent opacity={0.12} />
      </mesh>

      <mesh position={[0, -1.22, 0.82]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.66, 48]} />
        <meshStandardMaterial color={0x000000} transparent opacity={0.12} />
      </mesh>

      <mesh position={[0, -1.22, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.02, 48]} />
        <meshStandardMaterial color={0x000000} transparent opacity={0.09} />
      </mesh>

      <mesh ref={hclBeakerRef} position={[LEFT_X, -0.15, GLASS_Z]} castShadow>
        <cylinderGeometry args={[0.62, 0.57, 1.9, 48]} />
        <primitive object={GLASS} attach="material" />
      </mesh>

      <mesh position={[-2.44, 0.58, 1.16]}>
        <boxGeometry args={[0.02, 1.36, 0.02]} />
        <meshStandardMaterial color={0xffffff} transparent opacity={0.28} />
      </mesh>

      <mesh position={[LEFT_X, 0.8, GLASS_Z]}>
        <torusGeometry args={[0.46, 0.03, 12, 64]} />
        <primitive object={glassMat} attach="material" />
      </mesh>

      {[1, 2, 3].map((i) => (
        <mesh
          key={`left-ring-${i}`}
          position={[LEFT_X, -1.1 + (i * 1.9) / 4, GLASS_Z + 0.02]}
        >
          <torusGeometry args={[0.47, 0.005, 4, 32, Math.PI * 0.3]} />
          <meshStandardMaterial color={0xffffff} transparent opacity={0.4} />
        </mesh>
      ))}

      {beakerMarks.map((mark, idx) => (
        <mesh
          key={`left-beaker-mark-${idx}`}
          position={[LEFT_X + 0.02, mark.y, 1.3]}
        >
          <boxGeometry args={[mark.major ? 0.2 : 0.12, 0.005, 0.01]} />
          <meshStandardMaterial color={0x223248} transparent opacity={0.78} />
        </mesh>
      ))}

      <mesh ref={leftLiquidRef} position={[LEFT_X, -0.6, GLASS_Z]}>
        <cylinderGeometry
          args={[
            beakerInnerRadius * 0.95,
            beakerInnerRadius * 0.95,
            beakerHeight * 0.45,
            32,
          ]}
        />
        <primitive object={liquidHClMat} attach="material" />
      </mesh>

      <mesh position={[LEFT_X, -0.17, GLASS_Z]}>
        <cylinderGeometry args={[0.47, 0.5, 0.02, 48]} />
        <meshPhysicalMaterial
          color={0xe8f2ff}
          transparent
          opacity={0.56}
          transmission={0.8}
          roughness={0.06}
        />
      </mesh>

      <sprite position={[LEFT_X, 1.25, LABEL_Z]} scale={[0.82, 0.3, 1]}>
        <spriteMaterial map={hclLabelTexture} transparent depthWrite={false} />
      </sprite>

      <mesh position={[LEFT_X - 0.28, 1.25, LABEL_Z + 0.01]}>
        <circleGeometry args={[0.045, 20]} />
        <meshBasicMaterial color={0xdbe9ff} transparent opacity={0.92} />
      </mesh>

      <mesh ref={naohBeakerRef} position={[RIGHT_X, -0.15, GLASS_Z]} castShadow>
        <cylinderGeometry args={[0.62, 0.57, 1.9, 48]} />
        <primitive object={GLASS} attach="material" />
      </mesh>

      <mesh position={[2.44, 0.58, 1.16]}>
        <boxGeometry args={[0.02, 1.36, 0.02]} />
        <meshStandardMaterial color={0xffffff} transparent opacity={0.28} />
      </mesh>

      <mesh position={[RIGHT_X, 0.8, GLASS_Z]}>
        <torusGeometry args={[0.46, 0.03, 12, 64]} />
        <primitive object={glassMat} attach="material" />
      </mesh>

      {[1, 2, 3].map((i) => (
        <mesh
          key={`right-ring-${i}`}
          position={[RIGHT_X, -1.1 + (i * 1.9) / 4, GLASS_Z + 0.02]}
        >
          <torusGeometry args={[0.47, 0.005, 4, 32, Math.PI * 0.3]} />
          <meshStandardMaterial color={0xffffff} transparent opacity={0.4} />
        </mesh>
      ))}

      {beakerMarks.map((mark, idx) => (
        <mesh
          key={`right-beaker-mark-${idx}`}
          position={[RIGHT_X - 0.02, mark.y, 1.3]}
        >
          <boxGeometry args={[mark.major ? 0.2 : 0.12, 0.005, 0.01]} />
          <meshStandardMaterial color={0x223248} transparent opacity={0.78} />
        </mesh>
      ))}

      <mesh ref={rightLiquidRef} position={[RIGHT_X, -0.6, GLASS_Z]}>
        <cylinderGeometry
          args={[
            beakerInnerRadius * 0.95,
            beakerInnerRadius * 0.95,
            beakerHeight * 0.45,
            32,
          ]}
        />
        <primitive object={liquidNaOHMat} attach="material" />
      </mesh>

      <mesh position={[RIGHT_X, -0.17, GLASS_Z]}>
        <cylinderGeometry args={[0.47, 0.5, 0.02, 48]} />
        <meshPhysicalMaterial
          color={0xcae6ff}
          transparent
          opacity={0.58}
          transmission={0.85}
          roughness={0.06}
        />
      </mesh>

      <sprite position={[RIGHT_X, 1.25, LABEL_Z]} scale={[1.05, 0.3, 1]}>
        <spriteMaterial map={naohLabelTexture} transparent depthWrite={false} />
      </sprite>

      <mesh position={[RIGHT_X - 0.37, 1.25, LABEL_Z + 0.01]}>
        <circleGeometry args={[0.045, 20]} />
        <meshBasicMaterial color={0x8ec4ff} transparent opacity={0.92} />
      </mesh>

      <mesh
        ref={indicatorBeakerRef}
        position={[0, -1.02, 0.82]}
        onClick={onAction}
        castShadow
      >
        <latheGeometry args={[flaskProfile, 64]} />
        <primitive object={GLASS} attach="material" />
      </mesh>

      <mesh position={[0, 0.92, 0.82]}>
        <torusGeometry args={[0.27, 0.03, 12, 64]} />
        <primitive object={glassMat} attach="material" />
      </mesh>

      {[1, 2, 3].map((i) => (
        <mesh
          key={`center-ring-${i}`}
          position={[0.38, -1.04 + (i * 1.72) / 4, 0.96]}
        >
          <torusGeometry args={[0.22, 0.005, 4, 32, Math.PI * 0.3]} />
          <meshStandardMaterial color={0xffffff} transparent opacity={0.4} />
        </mesh>
      ))}

      <mesh position={[-0.06, -0.18, 1.32]}>
        <boxGeometry args={[0.02, 1.65, 0.02]} />
        <meshStandardMaterial color={0xffffff} transparent opacity={0.3} />
      </mesh>

      <mesh ref={flaskLiquidRef} position={[0, -0.86, 0.82]}>
        <cylinderGeometry args={[0.44, 0.42, 0.5, 64]} />
        <primitive object={liquidIndicatorMat} attach="material" />
      </mesh>

      <mesh position={[0, -0.54, 0.82]}>
        <cylinderGeometry args={[0.5, 0.53, 0.02, 48]} />
        <meshStandardMaterial
          color={flaskMeniscusHex}
          transparent
          opacity={0.72}
          roughness={0.1}
        />
      </mesh>

      <mesh position={[0, -1.09, 0.82]}>
        <sphereGeometry args={[0.44, 32, 16]} />
        <meshStandardMaterial
          color={flaskBottomHex}
          transparent
          opacity={0.2}
        />
      </mesh>

      <sprite position={[0, 1.24, 1.38]} scale={[1.2, 0.3, 1]}>
        <spriteMaterial
          map={indicatorLabelTexture}
          transparent
          depthWrite={false}
        />
      </sprite>

      <mesh position={[-0.51, 1.24, 1.39]}>
        <circleGeometry args={[0.045, 20]} />
        <meshBasicMaterial color={0xd6e6ff} transparent opacity={0.92} />
      </mesh>

      <mesh position={[0.83, -0.18, 0.82]}>
        <boxGeometry args={[0.18, 1.58, 0.02]} />
        <meshStandardMaterial color={0xf7f8fb} transparent opacity={0.22} />
      </mesh>

      {Array.from({ length: 9 }).map((_, idx) => (
        <mesh
          key={`flask-mark-${idx}`}
          position={[0.87, -0.88 + idx * 0.18, 0.83]}
        >
          <boxGeometry args={[0.14, 0.005, 0.01]} />
          <meshStandardMaterial color={0x26364c} transparent opacity={0.75} />
        </mesh>
      ))}

      <mesh position={[0, -1.12, -0.52]} receiveShadow>
        <boxGeometry args={[1.7, 0.12, 0.92]} />
        <meshStandardMaterial
          color={0xbac1cc}
          roughness={0.58}
          metalness={0.35}
        />
      </mesh>

      <mesh position={[0, 1.88, -0.52]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 5.6, 20]} />
        <meshStandardMaterial
          color={0xb1bac5}
          roughness={0.45}
          metalness={0.55}
        />
      </mesh>

      <mesh position={[0, 2.64, -0.52]} castShadow>
        <boxGeometry args={[1.02, 0.08, 0.1]} />
        <meshStandardMaterial
          color={0xaab2bf}
          roughness={0.48}
          metalness={0.48}
        />
      </mesh>

      <mesh position={[0, 1.06, -0.52]} castShadow>
        <cylinderGeometry args={[0.032, 0.032, 3.46, 20]} />
        <primitive object={glassMat} attach="material" />
      </mesh>

      <mesh position={[-0.03, 2.27, -0.49]}>
        <boxGeometry args={[0.012, 0.3, 0.018]} />
        <meshStandardMaterial color={0xffffff} transparent opacity={0.32} />
      </mesh>

      {buretteMarks.map((mark, idx) => (
        <mesh key={`burette-mark-${idx}`} position={[0.07, mark.y, -0.16]}>
          <boxGeometry args={[mark.major ? 0.12 : 0.07, 0.004, 0.01]} />
          <meshStandardMaterial color={0x223248} transparent opacity={0.8} />
        </mesh>
      ))}

      <mesh position={[0, -0.72, -0.52]} castShadow>
        <boxGeometry args={[0.2, 0.06, 0.18]} />
        <meshStandardMaterial
          color={0x8592a3}
          roughness={0.45}
          metalness={0.4}
        />
      </mesh>

      <mesh position={[0, -0.8, -0.34]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 0.23, 16]} />
        <meshStandardMaterial color={0xf1f6ff} transparent opacity={0.2} />
      </mesh>

      <mesh ref={dropletRef} position={[0, -0.2, -0.24]} castShadow>
        <sphereGeometry args={[0.028, 24, 24]} />
        <meshPhysicalMaterial
          color={0xdff2ff}
          transmission={0.92}
          roughness={0.03}
          thickness={0.2}
          transparent
          opacity={0.65}
        />
      </mesh>

      <mesh ref={pourStreamRef} position={[0, -0.45, -0.35]} castShadow>
        <cylinderGeometry args={[0.018, 0.012, 0.64, 20]} />
        <meshPhysicalMaterial
          color={0xe0f2ff}
          transparent
          opacity={0.06}
          transmission={0.9}
          roughness={0.02}
          thickness={0.25}
        />
      </mesh>

      <group position={[1.18, -0.69, 0.78]} rotation={[0.14, 0.24, 0.18]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.03, 0.03, 2.42, 24]} />
          <meshPhysicalMaterial
            color={0xeef4ff}
            transparent
            opacity={0.45}
            transmission={0.9}
            roughness={0.06}
            thickness={0.22}
            normalMap={rodScratchTexture}
            clearcoat={1}
            clearcoatRoughness={0.07}
          />
        </mesh>
      </group>

      <group position={[4.1, -1.02, -1.2]}>
        <mesh castShadow position={[0, 0.45, 0]}>
          <capsuleGeometry args={[0.24, 1.25, 8, 16]} />
          <meshStandardMaterial
            color={0xecf1fb}
            roughness={0.6}
            metalness={0.02}
          />
        </mesh>
        <mesh castShadow position={[0, 1.02, 0.02]} ref={avatarHeadRef}>
          <sphereGeometry args={[0.18, 24, 24]} />
          <meshStandardMaterial color={0xcfa58f} roughness={0.68} />
        </mesh>
        <mesh castShadow position={[0, 0.78, 0.22]}>
          <boxGeometry args={[0.24, 0.14, 0.03]} />
          <meshStandardMaterial
            color={0x11161e}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
        <mesh castShadow position={[0.24, 0.48, 0]} rotation={[0, 0, -0.45]}>
          <capsuleGeometry args={[0.055, 0.5, 6, 10]} />
          <meshStandardMaterial
            color={0xdbe6f7}
            roughness={0.64}
            metalness={0.02}
          />
        </mesh>
        <mesh castShadow position={[-0.24, 0.48, 0]} rotation={[0, 0, 0.45]}>
          <capsuleGeometry args={[0.055, 0.5, 6, 10]} />
          <meshStandardMaterial
            color={0xdbe6f7}
            roughness={0.64}
            metalness={0.02}
          />
        </mesh>
      </group>
    </group>
  );
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
  const chem = useMemo(
    () => getChemState(experimentId, completedSteps, animating),
    [experimentId, completedSteps, animating],
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

        <div className="lab-canvas" ref={canvasContainerRef}>
          <Canvas
            shadows
            dpr={[1, 2]}
            camera={{
              position: [1.7, 3.15, 7.05],
              fov: 52,
              near: 0.1,
              far: 1000,
            }}
            gl={{ antialias: true }}
            onCreated={({ gl, camera, scene }) => {
              const renderer = gl;
              gl.outputColorSpace = THREE.SRGBColorSpace;
              renderer.shadowMap.enabled = true;
              renderer.shadowMap.type = THREE.PCFSoftShadowMap;
              renderer.toneMapping = THREE.ACESFilmicToneMapping;
              renderer.toneMappingExposure = 0.8;
              renderer.outputColorSpace = THREE.SRGBColorSpace;
              renderer.physicallyCorrectLights = true;

              scene.background = new THREE.Color(0x060d18);
              scene.fog = null;

              const container = canvasContainerRef.current;
              if (container) {
                gl.setSize(container.clientWidth, container.clientHeight);
              }

              camera.position.set(1.7, 3.15, 7.05);
              camera.lookAt(0, 0.2, 0);
              camera.fov = 52;
              camera.updateProjectionMatrix();
            }}
          >
            <InitialCameraPose />
            <CanvasResizeSync containerRef={canvasContainerRef} />

            <Environment preset="warehouse" />

            <directionalLight
              color={0xffffff}
              intensity={1.18}
              position={[-3.8, 7.4, 2.6]}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-near={0.1}
              shadow-camera-far={24}
              shadow-bias={-0.0003}
              shadow-normalBias={0.015}
              shadow-radius={4}
            />

            <directionalLight
              color={0xffffff}
              intensity={0.24}
              position={[0.4, 2.5, 7.2]}
            />

            <directionalLight
              color={0xd1ddf2}
              intensity={0.36}
              position={[2.3, 2.4, -5.1]}
            />

            <pointLight
              color={0xffffff}
              intensity={0.22}
              position={[-4.4, 2, -0.2]}
              distance={10}
              decay={2}
            />

            <pointLight
              color={0xffffff}
              intensity={0.16}
              position={[4.6, 2.2, 2.8]}
              distance={10}
              decay={2}
            />

            <ambientLight color={0x9ab0cf} intensity={0.08} />

            <RebuiltLabScene
              onAction={() => onAction?.(expectedStepId)}
              chem={chem}
              animating={animating}
            />

            <ContactShadows
              position={[0, -1.12, 0]}
              opacity={0.58}
              blur={2.8}
              far={9}
              scale={10.6}
              resolution={1024}
            />

            <OrbitControls
              target={[0, 0.05, 0]}
              enableDamping
              dampingFactor={0.08}
              minDistance={4.6}
              maxDistance={9.8}
              minPolarAngle={0.62}
              maxPolarAngle={1.3}
            />
          </Canvas>
        </div>
      </div>
    </div>
  );
}

function CanvasResizeSync({ containerRef }) {
  const { gl } = useThree();

  useEffect(() => {
    const syncSize = () => {
      const container = containerRef.current;
      if (!container) return;
      gl.setSize(container.clientWidth, container.clientHeight);
    };

    syncSize();
    window.addEventListener("resize", syncSize);

    return () => {
      window.removeEventListener("resize", syncSize);
    };
  }, [gl, containerRef]);

  return null;
}
