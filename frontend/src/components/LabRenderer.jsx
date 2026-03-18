import { useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import "./LabRenderer.css";

function InitialCameraPose() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 4, 10);
    camera.lookAt(0, 0, 0);
    camera.fov = 70;
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

function RebuiltLabScene({ onAction }) {
  const flaskProfile = useMemo(
    () => [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.7, 0),
      new THREE.Vector2(0.8, 0.5),
      new THREE.Vector2(0.9, 1.2),
      new THREE.Vector2(0.6, 1.8),
      new THREE.Vector2(0.2, 2.2),
      new THREE.Vector2(0.25, 2.6),
    ],
    [],
  );

  return (
    <group>
      <mesh position={[0, -1, 0]} receiveShadow>
        <boxGeometry args={[12, 0.3, 6]} />
        <meshStandardMaterial color={0x1a3a2a} roughness={0.7} />
      </mesh>

      <mesh position={[-3.5, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.9, 0.8, 2.5, 32]} />
        <meshStandardMaterial
          color={0x4488bb}
          transparent
          opacity={0.75}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      <mesh position={[-3.5, -0.1, 0]}>
        <cylinderGeometry args={[0.68, 0.62, 1.2, 28]} />
        <meshStandardMaterial color={0xff9999} transparent opacity={0.8} />
      </mesh>

      <mesh position={[-3.5, 1.6, 0]}>
        <cylinderGeometry args={[0.95, 0.95, 0.15, 32]} />
        <meshStandardMaterial color={0xffffff} />
      </mesh>

      <mesh position={[3.5, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.9, 0.8, 2.5, 32]} />
        <meshStandardMaterial
          color={0x4488bb}
          transparent
          opacity={0.75}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      <mesh position={[3.5, -0.1, 0]}>
        <cylinderGeometry args={[0.68, 0.62, 1.2, 28]} />
        <meshStandardMaterial color={0x99ccff} transparent opacity={0.8} />
      </mesh>

      <mesh position={[3.5, 1.6, 0]}>
        <cylinderGeometry args={[0.95, 0.95, 0.15, 32]} />
        <meshStandardMaterial color={0xffffff} />
      </mesh>

      <mesh position={[0, 2, -0.5]}>
        <cylinderGeometry args={[0.06, 0.06, 6, 16]} />
        <meshStandardMaterial
          color={0xcccccc}
          metalness={0.8}
          roughness={0.25}
        />
      </mesh>

      <mesh position={[0, -0.9, -0.5]}>
        <boxGeometry args={[1.5, 0.15, 0.8]} />
        <meshStandardMaterial
          color={0x999999}
          metalness={0.8}
          roughness={0.25}
        />
      </mesh>

      <mesh position={[0, 2.5, -0.5]}>
        <boxGeometry args={[1.2, 0.08, 0.08]} />
        <meshStandardMaterial color={0xaaaaaa} />
      </mesh>

      <mesh position={[0, 0.8, -0.5]}>
        <cylinderGeometry args={[0.04, 0.04, 3.5, 16]} />
        <meshPhysicalMaterial
          color={0xddddff}
          transparent
          opacity={0.6}
          metalness={0.3}
        />
      </mesh>

      <mesh position={[0, -0.5, 0.8]} onClick={onAction}>
        <latheGeometry args={[flaskProfile, 48]} />
        <meshStandardMaterial
          color={0x4488bb}
          transparent
          opacity={0.75}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      <mesh position={[0, -0.6, 0.5]}>
        <cylinderGeometry args={[0.55, 0.6, 0.8, 32]} />
        <meshStandardMaterial color={0xccffee} transparent opacity={0.85} />
      </mesh>

      <mesh position={[-1.5, 0.2, 0.8]} rotation={[0, 0, -0.4]}>
        <cylinderGeometry args={[0.04, 0.02, 2.5, 8]} />
        <meshStandardMaterial color={0xdddddd} />
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
                style={{ left: `calc(${(1.2 / 14) * 100}% - 6px)` }}
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
            camera={{ position: [0, 4, 10], fov: 70, near: 0.1, far: 1000 }}
            gl={{ antialias: true }}
            onCreated={({ gl, camera, scene }) => {
              gl.outputColorSpace = THREE.SRGBColorSpace;
              gl.setClearColor(0x0d1b2a);
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = THREE.PCFSoftShadowMap;
              scene.background = new THREE.Color(0x0d1b2a);

              const container = canvasContainerRef.current;
              if (container) {
                gl.setSize(container.clientWidth, container.clientHeight);
              }

              camera.position.set(0, 4, 10);
              camera.lookAt(0, 0, 0);
              camera.fov = 70;
              camera.updateProjectionMatrix();
            }}
          >
            <InitialCameraPose />
            <CanvasResizeSync containerRef={canvasContainerRef} />

            <ambientLight color={0xffffff} intensity={0.6} />
            <directionalLight
              color={0xffffff}
              castShadow
              intensity={1.5}
              position={[5, 10, 5]}
            />
            <pointLight color={0x4fc3f7} intensity={1.2} position={[0, 4, 3]} />
            <pointLight
              color={0xffffff}
              intensity={0.8}
              position={[-4, 3, 2]}
            />

            <RebuiltLabScene onAction={() => onAction?.(expectedStepId)} />

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
