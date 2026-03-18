import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import "./LabRenderer.css";

function InitialCameraPose() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 4, 9);
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

  const tableTexture = useMemo(() => null, []);
  const backdropTexture = useMemo(() => null, []);

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
          color={0xa0b8d0}
          transparent
          opacity={0.42}
          emissive={new THREE.Color(0x1a2c42)}
          emissiveIntensity={0.42}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, -1.2, 0]} receiveShadow>
        <boxGeometry args={[12, 0.3, 6]} />
        <meshStandardMaterial
          color={0x4a4a6a}
          emissive={0x2a2a4a}
          emissiveIntensity={0.45}
          metalness={0.15}
          roughness={0.65}
        />
      </mesh>

      <mesh position={[-3.2, -0.2, 0.5]} castShadow>
        <cylinderGeometry args={[0.7, 0.6, 2.0, 32]} />
        <meshPhysicalMaterial
          color={0x7fbfff}
          transparent
          opacity={0.85}
          roughness={0.03}
          metalness={0.02}
          specularIntensity={1.2}
          specularColor="#ffffff"
          transmission={0.98}
          thickness={0.32}
          ior={1.52}
          clearcoat={1}
          clearcoatRoughness={0.04}
        />
      </mesh>

      <mesh position={[-3.2, 0.85, 0.5]}>
        <cylinderGeometry args={[0.72, 0.72, 0.1, 32]} />
        <meshStandardMaterial color={0xffffff} />
      </mesh>

      <mesh
        position={[-3.2, 0.78, 0.5]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <torusGeometry args={[0.64, 0.015, 12, 48]} />
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xffffff}
          emissiveIntensity={0.85}
          transparent
          opacity={0.9}
        />
      </mesh>

      <mesh ref={leftLiquidRef} position={[-3.2, -0.55, 0.5]}>
        <cylinderGeometry args={[0.58, 0.52, 0.8, 32]} />
        <meshStandardMaterial
          color={0xff6f77}
          transparent
          opacity={0.88}
          roughness={0.08}
          metalness={0.35}
        />
      </mesh>
      <mesh position={[-3.2, -0.15, 0.5]}>
        <cylinderGeometry args={[0.56, 0.5, 0.08, 32]} />
        <meshStandardMaterial
          color={0xffb8c1}
          transparent
          opacity={0.72}
          roughness={0.04}
          metalness={0.25}
        />
      </mesh>

      <mesh position={[3.2, -0.2, 0.5]} castShadow>
        <cylinderGeometry args={[0.7, 0.6, 2.0, 32]} />
        <meshPhysicalMaterial
          color={0x7fbfff}
          transparent
          opacity={0.85}
          roughness={0.03}
          metalness={0.02}
          specularIntensity={1.2}
          specularColor="#ffffff"
          transmission={0.98}
          thickness={0.32}
          ior={1.52}
          clearcoat={1}
          clearcoatRoughness={0.04}
        />
      </mesh>

      <mesh position={[3.2, 0.85, 0.5]}>
        <cylinderGeometry args={[0.72, 0.72, 0.1, 32]} />
        <meshStandardMaterial color={0xffffff} />
      </mesh>

      <mesh
        position={[3.2, 0.78, 0.5]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <torusGeometry args={[0.64, 0.015, 12, 48]} />
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xffffff}
          emissiveIntensity={0.85}
          transparent
          opacity={0.9}
        />
      </mesh>

      <mesh ref={rightLiquidRef} position={[3.2, -0.55, 0.5]}>
        <cylinderGeometry args={[0.58, 0.52, 0.8, 32]} />
        <meshStandardMaterial
          color={0x6b7bff}
          transparent
          opacity={0.88}
          roughness={0.08}
          metalness={0.35}
        />
      </mesh>
      <mesh position={[3.2, -0.15, 0.5]}>
        <cylinderGeometry args={[0.56, 0.5, 0.08, 32]} />
        <meshStandardMaterial
          color={0xadc2ff}
          transparent
          opacity={0.68}
          roughness={0.04}
          metalness={0.25}
        />
      </mesh>

      {/* Flask - realistic glass */}
      <mesh position={[0, -1.0, 0.8]} onClick={onAction}>
        <latheGeometry args={[flaskProfile, 48]} />
        <meshPhysicalMaterial
          color={0xb5e9ff}
          transparent
          opacity={0.57}
          roughness={0.04}
          metalness={0.04}
          specularIntensity={1.2}
          specularColor="#ffffff"
          transmission={0.98}
          thickness={0.32}
          ior={1.52}
          clearcoat={1}
          clearcoatRoughness={0.04}
        />
      </mesh>

      {/* Burette stand */}
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
          opacity={0.53}
          roughness={0.04}
          metalness={0.04}
          specularIntensity={1.2}
          specularColor="#ffffff"
          transmission={0.98}
          ior={1.51}
          thickness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.04}
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

      <mesh position={[0, 1.3, 0.8]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.22, 0.012, 12, 48]} />
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xffffff}
          emissiveIntensity={0.88}
          transparent
          opacity={0.92}
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
            camera={{ position: [0, 4, 9], fov: 65, near: 0.1, far: 1000 }}
            gl={{ antialias: true }}
            onCreated={({ gl, camera, scene }) => {
              gl.outputColorSpace = THREE.SRGBColorSpace;
              gl.setClearColor(0x1a3a52);
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = THREE.PCFSoftShadowMap;
              gl.toneMappingExposure = 1.1;
              scene.background = new THREE.Color(0x0a1628);
              scene.scale.set(1.3, 1.3, 1.3);
              scene.fog = null;

              const container = canvasContainerRef.current;
              if (container) {
                gl.setSize(container.clientWidth, container.clientHeight);
              }

              camera.position.set(0, 4, 9);
              camera.lookAt(0, 0, 0);
              camera.fov = 65;
              camera.updateProjectionMatrix();
            }}
          >
            <InitialCameraPose />
            <CanvasResizeSync containerRef={canvasContainerRef} />

            {/* Bright, even lighting like a real lab */}
            <ambientLight color={0xffffff} intensity={2.5} />
            <directionalLight
              color={0xffffff}
              castShadow
              intensity={2.0}
              position={[8, 10, 6]}
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
            {/* Fill light from opposite side - white, no color */}
            <pointLight
              color={0xffffff}
              intensity={1.8}
              position={[-6, 6, 8]}
              distance={20}
              decay={1.3}
            />
            {/* Top light */}
            <pointLight
              color={0xffffff}
              intensity={1.5}
              position={[0, 8, 0]}
              distance={16}
              decay={1.4}
            />

            {/* Very subtle shadows */}
            <ContactShadows
              position={[0, -1.02, 0]}
              opacity={0.15}
              width={13}
              height={7}
              blur={2.0}
              far={6}
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
