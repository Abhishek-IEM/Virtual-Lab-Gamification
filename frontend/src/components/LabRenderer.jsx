import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import "./LabRenderer.css";

function InitialCameraPose() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 5, 11);
    camera.lookAt(0, 0, 0);
    camera.fov = 65;
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
      ? "#f9b0d6"
      : done("add-phenolphthalein")
        ? "#e7f7ff"
        : "#d5f1ff";
    return {
      pH,
      volumeMl,
      liquidColor,
      reaction: done("observe-endpoint")
        ? "Endpoint reached: faint permanent pink."
        : animating === "burette-drops"
          ? "NaOH dropping from burette..."
          : "Prepare titration setup.",
    };
  }

  if (experimentId === "ph-indicator-testing") {
    const pH = done("record-ph") ? 9.4 : done("add-methyl-orange") ? 6.8 : 4.2;
    const liquidColor = done("add-methyl-orange")
      ? "#ffd45c"
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

function RebuiltLabScene({ onAction, chem }) {
  const leftLiquidRef = useRef(null);
  const rightLiquidRef = useRef(null);
  const flaskLiquidRef = useRef(null);
  const dropletRef = useRef(null);
  const bubbleRefs = useRef([]);

  const flaskLiquidColor = useMemo(
    () => new THREE.Color(chem?.liquidColor || "#ccffee"),
    [chem?.liquidColor],
  );
  const flaskMeniscusColor = useMemo(
    () =>
      flaskLiquidColor.clone().lerp(new THREE.Color("#ffffff"), 0.35).getHex(),
    [flaskLiquidColor],
  );

  const flaskProfile = useMemo(
    () => [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.6, 0),
      new THREE.Vector2(0.8, 0.4),
      new THREE.Vector2(0.9, 1.0),
      new THREE.Vector2(0.7, 1.6),
      new THREE.Vector2(0.25, 2.0),
      new THREE.Vector2(0.28, 2.4),
    ],
    [],
  );

  const bubbleSeeds = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        x: (Math.random() - 0.5) * 0.42,
        z: (Math.random() - 0.5) * 0.42,
        phase: Math.random() * Math.PI * 2,
        speed: 0.34 + (i % 4) * 0.08,
      })),
    [],
  );

  const buretteMarks = useMemo(
    () => Array.from({ length: 9 }, (_, i) => ({ y: 2.2 - i * 0.28 })),
    [],
  );

  const tableTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#111820";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 1400; i += 1) {
      const shade = 18 + Math.floor(Math.random() * 28);
      ctx.fillStyle = `rgba(${shade}, ${shade + 6}, ${shade + 10}, 0.18)`;
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        1,
        1,
      );
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, Math.random() * canvas.height);
      ctx.lineTo(canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2.4, 1.8);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const backdropTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#1a2636");
    grad.addColorStop(0.55, "#111a29");
    grad.addColorStop(1, "#0c1422");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(140, 170, 205, 0.12)";
    for (let i = 0; i < 8; i += 1) {
      const y = 40 + i * 26;
      ctx.fillRect(40, y, canvas.width - 80, 6);
    }

    ctx.fillStyle = "rgba(180, 210, 235, 0.08)";
    for (let i = 0; i < 10; i += 1) {
      const x = 60 + i * 40;
      ctx.fillRect(x, 28, 10, canvas.height - 60);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (leftLiquidRef.current) {
      leftLiquidRef.current.rotation.z = Math.sin(t * 1.6) * 0.012;
      leftLiquidRef.current.position.y = -0.55 + Math.sin(t * 1.1) * 0.01;
    }

    if (rightLiquidRef.current) {
      rightLiquidRef.current.rotation.z = Math.cos(t * 1.5) * 0.012;
      rightLiquidRef.current.position.y = -0.55 + Math.cos(t * 1.08) * 0.01;
    }

    if (flaskLiquidRef.current) {
      flaskLiquidRef.current.rotation.z = Math.sin(t * 1.45) * 0.018;
      flaskLiquidRef.current.position.y = -0.85 + Math.sin(t * 1.25) * 0.012;
    }

    if (dropletRef.current) {
      const cycle = (t * 0.9) % 1;
      dropletRef.current.visible = cycle < 0.85;
      dropletRef.current.position.y = -0.55 - cycle * 0.9;
      dropletRef.current.scale.setScalar(0.75 + (1 - cycle) * 0.25);
    }

    bubbleRefs.current.forEach((bubble, idx) => {
      if (!bubble) return;
      const seed = bubbleSeeds[idx];
      const rise = ((t * seed.speed + seed.phase) % 1) * 0.48;
      bubble.position.set(seed.x, -1.02 + rise, 0.8 + seed.z);
      const s = 0.013 + Math.sin(t * 2 + seed.phase) * 0.002;
      bubble.scale.set(s, s, s);
    });
  });

  return (
    <group>
      <mesh position={[0, 1.6, -6]}>
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial
          map={backdropTexture}
          color={0x9eb2c6}
          transparent
          opacity={0.32}
          emissive={new THREE.Color(0x1a2c42)}
          emissiveIntensity={0.35}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, -1.2, 0]} receiveShadow>
        <boxGeometry args={[12, 0.3, 6]} />
        <meshStandardMaterial
          color={0x3a3a5a}
          emissive={0x1a1a3a}
          emissiveIntensity={0.4}
        />
      </mesh>

      <mesh position={[-3.2, -0.2, 0.5]} castShadow>
        <cylinderGeometry args={[0.7, 0.6, 2.0, 32]} />
        <meshPhysicalMaterial
          color={0x7fbfff}
          transparent
          opacity={0.65}
          roughness={0.06}
          metalness={0.02}
          specularIntensity={1.0}
          specularColor="#ffffff"
          transmission={0.95}
          thickness={0.28}
          ior={1.49}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>

      <mesh position={[-3.2, 0.85, 0.5]}>
        <cylinderGeometry args={[0.72, 0.72, 0.1, 32]} />
        <meshStandardMaterial color={0xffffff} />
      </mesh>

      <mesh position={[-3.2, 0.78, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.64, 0.015, 12, 48]} />
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xaad9ff}
          emissiveIntensity={0.35}
          transparent
          opacity={0.7}
        />
      </mesh>

      <mesh ref={leftLiquidRef} position={[-3.2, -0.55, 0.5]}>
        <cylinderGeometry args={[0.58, 0.52, 0.8, 32]} />
        <meshStandardMaterial
          color={0xff6f77}
          transparent
          opacity={0.9}
          roughness={0.12}
          metalness={0.18}
        />
      </mesh>
      <mesh position={[-3.2, -0.16, 0.5]}>
        <cylinderGeometry args={[0.56, 0.5, 0.06, 32]} />
        <meshStandardMaterial color={0xff8d92} transparent opacity={0.62} />
      </mesh>

      <mesh position={[3.2, -0.2, 0.5]} castShadow>
        <cylinderGeometry args={[0.7, 0.6, 2.0, 32]} />
        <meshPhysicalMaterial
          color={0x7fbfff}
          transparent
          opacity={0.65}
          roughness={0.06}
          metalness={0.02}
          specularIntensity={1.0}
          specularColor="#ffffff"
          transmission={0.95}
          thickness={0.28}
          ior={1.49}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>

      <mesh position={[3.2, 0.85, 0.5]}>
        <cylinderGeometry args={[0.72, 0.72, 0.1, 32]} />
        <meshStandardMaterial color={0xffffff} />
      </mesh>

      <mesh position={[3.2, 0.78, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.64, 0.015, 12, 48]} />
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xaad9ff}
          emissiveIntensity={0.35}
          transparent
          opacity={0.7}
        />
      </mesh>

      <mesh ref={rightLiquidRef} position={[3.2, -0.55, 0.5]}>
        <cylinderGeometry args={[0.58, 0.52, 0.8, 32]} />
        <meshStandardMaterial
          color={0x6b7bff}
          transparent
          opacity={0.9}
          roughness={0.12}
          metalness={0.18}
        />
      </mesh>
      <mesh position={[3.2, -0.16, 0.5]}>
        <cylinderGeometry args={[0.56, 0.5, 0.06, 32]} />
        <meshStandardMaterial color={0x8aa3ff} transparent opacity={0.62} />
      </mesh>

      <mesh position={[0, -1.1, -0.5]}>
        <boxGeometry args={[1.8, 0.15, 1.0]} />
        <meshStandardMaterial color={0x888888} metalness={0.8} />
      </mesh>

      <mesh position={[0, 1.9, -0.5]}>
        <cylinderGeometry args={[0.05, 0.05, 6, 16]} />
        <meshStandardMaterial color={0xaaaaaa} metalness={0.9} />
      </mesh>

      <mesh position={[0, 2.8, -0.5]}>
        <boxGeometry args={[1.0, 0.08, 0.08]} />
        <meshStandardMaterial color={0x888888} metalness={0.8} />
      </mesh>

      <mesh position={[0, 1.0, -0.5]}>
        <cylinderGeometry args={[0.035, 0.035, 3.5, 16]} />
        <meshPhysicalMaterial
          color={0xc8f0ff}
          transparent
          opacity={0.58}
          roughness={0.08}
          metalness={0.04}
          specularIntensity={1.0}
          specularColor="#ffffff"
          transmission={0.95}
          ior={1.48}
          thickness={0.18}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>

      {buretteMarks.map((mark) => (
        <mesh key={`mark-${mark.y}`} position={[0, mark.y, -0.5]}>
          <boxGeometry args={[0.22, 0.012, 0.012]} />
          <meshStandardMaterial color={0xeaf2ff} transparent opacity={0.6} />
        </mesh>
      ))}

      <mesh ref={dropletRef} position={[-1.25, -0.55, 0.8]} castShadow>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color={0xb8ebff} transparent opacity={0.85} />
      </mesh>

      <mesh position={[0, -1.0, 0.8]} onClick={onAction}>
        <latheGeometry args={[flaskProfile, 48]} />
        <meshPhysicalMaterial
          color={0xb5e9ff}
          transparent
          opacity={0.62}
          roughness={0.08}
          metalness={0.04}
          specularIntensity={1.0}
          specularColor="#ffffff"
          transmission={0.95}
          thickness={0.3}
          ior={1.5}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>

      <mesh position={[0, 1.3, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.012, 12, 48]} />
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xaad9ff}
          emissiveIntensity={0.35}
          transparent
          opacity={0.7}
        />
      </mesh>

      <mesh ref={flaskLiquidRef} position={[0, -0.85, 0.8]}>
        <cylinderGeometry args={[0.5, 0.55, 0.6, 32]} />
        <meshStandardMaterial
          color={flaskLiquidColor}
          transparent
          opacity={0.94}
          roughness={0.06}
          metalness={0.22}
        />
      </mesh>
      <mesh position={[0, -0.56, 0.8]}>
        <cylinderGeometry args={[0.48, 0.52, 0.05, 32]} />
        <meshStandardMaterial
          color={flaskMeniscusColor}
          transparent
          opacity={0.66}
        />
      </mesh>

      {bubbleSeeds.map((_, idx) => (
        <mesh
          key={`bubble-${idx}`}
          ref={(el) => {
            bubbleRefs.current[idx] = el;
          }}
        >
          <sphereGeometry args={[0.014, 10, 10]} />
          <meshStandardMaterial
            color={0xf2ffff}
            transparent
            opacity={0.75}
            roughness={0.2}
            metalness={0.2}
          />
        </mesh>
      ))}

      <mesh position={[-1.8, -0.3, 0.8]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.03, 0.015, 2.5, 8]} />
        <meshStandardMaterial color={0xdddddd} />
      </mesh>

      <mesh position={[-1.8, -0.3, 0.8]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.012, 0.008, 1.4, 8]} />
        <meshStandardMaterial color={0x9fe3ff} transparent opacity={0.75} />
      </mesh>
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
            camera={{ position: [0, 5, 11], fov: 65, near: 0.1, far: 1000 }}
            gl={{ antialias: true }}
            onCreated={({ gl, camera, scene }) => {
              gl.outputColorSpace = THREE.SRGBColorSpace;
              gl.setClearColor(0x1a3a52);
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = THREE.PCFSoftShadowMap;
              gl.toneMappingExposure = 1.1;
              scene.background = new THREE.Color(0x2a4a6a);
              scene.scale.set(1.3, 1.3, 1.3);
              scene.fog = new THREE.FogExp2(0x2a4a6a, 0.022);

              const container = canvasContainerRef.current;
              if (container) {
                gl.setSize(container.clientWidth, container.clientHeight);
              }

              camera.position.set(0, 5, 11);
              camera.lookAt(0, 0, 0);
              camera.fov = 65;
              camera.updateProjectionMatrix();
            }}
          >
            <InitialCameraPose />
            <CanvasResizeSync containerRef={canvasContainerRef} />

            <ambientLight color={0xffffff} intensity={4.0} />
            <directionalLight
              color={0xffffff}
              castShadow
              intensity={3.0}
              position={[5, 10, 5]}
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-near={0.5}
              shadow-camera-far={25}
              shadow-camera-left={-8}
              shadow-camera-right={8}
              shadow-camera-top={8}
              shadow-camera-bottom={-8}
              shadow-bias={-0.0002}
              shadow-normalBias={0.02}
            />
            <pointLight
              color={0x8fd9f5}
              intensity={2.5}
              position={[-4, 4, 8]}
              distance={20}
              decay={1.5}
            />
            <pointLight
              color={0xffffff}
              castShadow
              intensity={2.2}
              position={[0, 6, 3]}
              distance={16}
              decay={1.8}
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
              shadow-bias={-0.00015}
            />

            <ContactShadows
              position={[0, -1.05, 0]}
              opacity={0.48}
              width={13}
              height={7}
              blur={2.2}
              far={6.2}
            />

            <RebuiltLabScene
              onAction={() => onAction?.(expectedStepId)}
              chem={chem}
            />

            <OrbitControls
              target={[0, 0, 0]}
              enableDamping
              dampingFactor={0.08}
              minDistance={4}
              maxDistance={12}
              minPolarAngle={0.4}
              maxPolarAngle={1.35}
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
