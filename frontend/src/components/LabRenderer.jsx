import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Html,
  OrbitControls,
  RoundedBox,
  SoftShadows,
} from "@react-three/drei";
import { CuboidCollider, Physics, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import gsap from "gsap";
import "./LabRenderer.css";

// Lab bench surface sits at y = 0.0 (world). Equipment placed on top at y = BENCH_TOP.
const BENCH_TOP = 0.0;
const WORKSPACE_BOUNDS = { width: 8.2, depth: 5.2, y: BENCH_TOP };

const EQUIPMENT_NAMES = {
  acid: "Acid Bottle",
  indicator: "Indicator Bottle",
  base: "Base Bottle",
  battery: "Battery",
  switch: "Switch",
  bulb: "Light Bulb",
  wire: "Wire",
  flask: "Round Bottom Flask",
  condenser: "Condenser",
  burner: "Bunsen Burner",
  collector: "Erlenmeyer Flask",
};

const SCENE_SLOTS = {
  "simple-circuit": {
    battery: [-2.45, WORKSPACE_BOUNDS.y, 1.15],
    switch: [0, WORKSPACE_BOUNDS.y, 1.35],
    bulb: [2.35, WORKSPACE_BOUNDS.y, 1.1],
    wire: [-0.1, WORKSPACE_BOUNDS.y, -1.5],
  },
  "water-distillation": {
    flask: [-2.2, WORKSPACE_BOUNDS.y, 0.9],
    condenser: [0.5, WORKSPACE_BOUNDS.y + 0.1, 0.95],
    burner: [-2.2, WORKSPACE_BOUNDS.y, -0.9],
    collector: [2.6, WORKSPACE_BOUNDS.y, 0.8],
  },
};

export default function LabRenderer({
  experimentId,
  completedSteps,
  animating,
  currentStepIndex,
  experimentComplete,
  expectedStepId,
  expectedEquipmentId,
  placedComponents,
  feedbackType,
  onDropEquipment,
  onAction,
}) {
  const [hoverLabel, setHoverLabel] = useState("");

  const onWorkspaceDrop = (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;

    try {
      const payload = JSON.parse(raw);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      onDropEquipment(payload.equipmentId, {
        x: Math.max(6, Math.min(94, x)),
        y: Math.max(8, Math.min(92, y)),
      });
    } catch {
      // Ignore malformed payloads.
    }
  };

  return (
    <div
      className={`lab-renderer ${feedbackType === "error" ? "is-error" : ""} ${feedbackType === "success" ? "is-success" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onWorkspaceDrop}
    >
      <div className="scene-hud">
        <span className="scene-title-3d">3D Virtual Lab Workspace</span>
        <span className="scene-subtle">
          Orbit: drag | Pan: right-drag | Zoom: wheel
        </span>
      </div>

      <Canvas
        shadows="soft"
        camera={{ position: [0, 4.5, 11], fov: 52, near: 0.1, far: 120 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.92,
        }}
      >
        {/* HDRI environment map – provides realistic reflections on glass/metal */}
        <Environment preset="warehouse" background={false} />
        <SoftShadows samples={24} size={22} focus={0.45} />

        <Physics gravity={[0, -9.81, 0]}>
          <LabRoom />
          <LabLights />

          {experimentId === "acid-base-neutralization" && (
            <AcidBaseScene
              completedSteps={completedSteps}
              animating={animating}
              experimentComplete={experimentComplete}
              expectedStepId={expectedStepId}
              currentStepIndex={currentStepIndex}
              onAction={onAction}
              setHoverLabel={setHoverLabel}
            />
          )}

          {experimentId === "simple-circuit" && (
            <CircuitScene
              completedSteps={completedSteps}
              experimentComplete={experimentComplete}
              expectedEquipmentId={expectedEquipmentId}
              expectedStepId={expectedStepId}
              currentStepIndex={currentStepIndex}
              placedComponents={placedComponents}
              onAction={onAction}
              setHoverLabel={setHoverLabel}
            />
          )}

          {experimentId === "water-distillation" && (
            <DistillationScene
              completedSteps={completedSteps}
              experimentComplete={experimentComplete}
              expectedEquipmentId={expectedEquipmentId}
              expectedStepId={expectedStepId}
              currentStepIndex={currentStepIndex}
              placedComponents={placedComponents}
              onAction={onAction}
              setHoverLabel={setHoverLabel}
            />
          )}

          <WorkbenchCollider />
        </Physics>

        {/* No <Environment> duplicate here – already declared above Physics */}
      </Canvas>

      <div className="scene-overlay-bottom">
        <span className="overlay-pill">
          {hoverLabel ||
            (expectedEquipmentId
              ? `Place ${EQUIPMENT_NAMES[expectedEquipmentId] || expectedEquipmentId}`
              : "Follow the highlighted experiment step")}
        </span>
      </div>
    </div>
  );
}

// ─── LAB ROOM ────────────────────────────────────────────────────────────────
// All geometry is centred on the bench. Room is 20 × 8 × 14 (W × H × D).
const R = { w: 20, h: 8.5, d: 14 };

function LabRoom() {
  return (
    <group>
      {/* ── Floor: large grey-white ceramic tiles ── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -3.6, 0]}
        receiveShadow
      >
        <planeGeometry args={[R.w, R.d]} />
        <meshStandardMaterial
          color="#dce6ef"
          roughness={0.38}
          metalness={0.06}
        />
      </mesh>
      {/* tile grid lines painted on top */}
      <gridHelper
        args={[20, 20, new THREE.Color("#b8ccd8"), new THREE.Color("#cddde9")]}
        position={[0, -3.595, 0]}
      />

      {/* ── Ceiling ── */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, R.h - 3.6, 0]}
        receiveShadow
      >
        <planeGeometry args={[R.w, R.d]} />
        <meshStandardMaterial color="#f0f4f8" roughness={0.85} />
      </mesh>

      {/* ── Back wall ── */}
      <mesh position={[0, R.h / 2 - 3.6, -R.d / 2]} receiveShadow>
        <planeGeometry args={[R.w, R.h]} />
        <meshStandardMaterial color="#e8eef5" roughness={0.8} />
      </mesh>

      {/* ── Left wall ── */}
      <mesh
        rotation={[0, Math.PI / 2, 0]}
        position={[-R.w / 2, R.h / 2 - 3.6, 0]}
        receiveShadow
      >
        <planeGeometry args={[R.d, R.h]} />
        <meshStandardMaterial color="#eaf0f7" roughness={0.82} />
      </mesh>

      {/* ── Right wall (window strip) ── */}
      <mesh
        rotation={[0, -Math.PI / 2, 0]}
        position={[R.w / 2, R.h / 2 - 3.6, 0]}
        receiveShadow
      >
        <planeGeometry args={[R.d, R.h]} />
        <meshStandardMaterial color="#e6ecf4" roughness={0.82} />
      </mesh>

      {/* ── Windows on right wall ── */}
      <LabWindows />

      {/* ── Lab bench ── */}
      <LabBench />

      {/* ── Background scenery ── */}
      <LabShelves />
      <LabCabinets />
      <LabSink />
      <LabSafetyPosters />

      {/* ── Ceiling lamp fixtures ── */}
      <CeilingLampFixture position={[-3, R.h - 3.65, -1]} />
      <CeilingLampFixture position={[3, R.h - 3.65, -1]} />
      <CeilingLampFixture position={[0, R.h - 3.65, 2.5]} />
    </group>
  );
}

function LabWindows() {
  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#cce8ff",
        transparent: true,
        opacity: 0.28,
        roughness: 0.02,
        metalness: 0,
        transmission: 0.88,
        thickness: 0.18,
        ior: 1.45,
      }),
    [],
  );

  return (
    <group position={[R.w / 2 - 0.06, 0.4, 0]}>
      {[-3.5, 3.5].map((z) => (
        <group key={z} position={[0, 0, z]}>
          {/* outer frame */}
          <mesh rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[3.2, 3.2]} />
            <meshStandardMaterial color="#c5d4e0" roughness={0.6} />
          </mesh>
          {/* glass pane */}
          <mesh rotation={[0, -Math.PI / 2, 0]} position={[-0.04, 0, 0]}>
            <planeGeometry args={[2.9, 2.9]} />
            <primitive object={glassMat} attach="material" />
          </mesh>
          {/* bright sky fill behind window */}
          <pointLight
            position={[1.2, 0, 0]}
            intensity={1.4}
            distance={9}
            color="#d6eeff"
          />
        </group>
      ))}
    </group>
  );
}

function LabBench() {
  return (
    <group>
      {/* Bench top surface – light grey resin */}
      <mesh position={[0, -0.12, 0.4]} receiveShadow castShadow>
        <boxGeometry args={[10.2, 0.18, 5.8]} />
        <meshStandardMaterial
          color="#c8d8e8"
          roughness={0.35}
          metalness={0.08}
        />
      </mesh>
      {/* Front edge strip – darker */}
      <mesh position={[0, -0.22, 3.3]} receiveShadow>
        <boxGeometry args={[10.2, 0.18, 0.08]} />
        <meshStandardMaterial color="#9aafc4" roughness={0.4} />
      </mesh>
      {/* Cabinet body beneath bench */}
      <mesh position={[0, -1.55, 0.4]} receiveShadow castShadow>
        <boxGeometry args={[10.2, 2.7, 5.8]} />
        <meshStandardMaterial color="#a8bccf" roughness={0.55} />
      </mesh>
      {/* Drawer handles row */}
      {[-3.5, -1.2, 1.2, 3.5].map((x) => (
        <mesh key={x} position={[x, -1.18, 3.31]} castShadow>
          <boxGeometry args={[0.9, 0.12, 0.06]} />
          <meshStandardMaterial
            color="#8090a2"
            metalness={0.55}
            roughness={0.35}
          />
        </mesh>
      ))}
      {/* Legs */}
      {[
        [-4.7, -2.9, -2.5],
        [4.7, -2.9, -2.5],
        [-4.7, -2.9, 3.2],
        [4.7, -2.9, 3.2],
      ].map(([x, y, z]) => (
        <mesh key={`${x}${z}`} position={[x, y, z]} castShadow>
          <boxGeometry args={[0.22, 0.8, 0.22]} />
          <meshStandardMaterial
            color="#8898aa"
            metalness={0.3}
            roughness={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

function LabShelves() {
  const bottleColors = ["#ff9e9e", "#9ee8ff", "#fff08a", "#b2f5c8", "#d4b4ff"];

  return (
    <group position={[-8.5, 0, -3.5]}>
      {/* shelf boards */}
      {[1.4, 2.8, 4.2].map((y) => (
        <mesh key={y} position={[0.12, y - 3.6, 0]} receiveShadow>
          <boxGeometry args={[0.18, 0.06, 5.5]} />
          <meshStandardMaterial color="#b8ccd8" roughness={0.6} />
        </mesh>
      ))}
      {/* bottle silhouettes on shelves */}
      {[1.4, 2.8, 4.2].map((sy) =>
        bottleColors.map((col, i) => (
          <mesh
            key={`${sy}-${i}`}
            position={[0.22, sy - 3.6 + 0.28, -2 + i * 0.95]}
            castShadow
          >
            <cylinderGeometry args={[0.1, 0.11, 0.48, 18]} />
            <meshPhysicalMaterial
              color={col}
              transparent
              opacity={0.72}
              roughness={0.12}
              transmission={0.48}
            />
          </mesh>
        )),
      )}
      {/* vertical bracket */}
      <mesh position={[0.09, 0.9, 0]} castShadow>
        <boxGeometry args={[0.08, 6.5, 0.08]} />
        <meshStandardMaterial color="#8898aa" metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  );
}

function LabCabinets() {
  return (
    <group position={[8.5, -1.1, -2]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.26, 4.2, 5.2]} />
        <meshStandardMaterial color="#b4c6d6" roughness={0.6} />
      </mesh>
      {/* door lines */}
      {[-1.3, 0, 1.3].map((z) => (
        <mesh key={z} position={[-0.14, 0, z]}>
          <boxGeometry args={[0.03, 3.9, 0.03]} />
          <meshStandardMaterial color="#8898aa" />
        </mesh>
      ))}
      {/* door handles */}
      {[-1.3, 0, 1.3].map((z) => (
        <mesh key={`h${z}`} position={[-0.15, 0.2, z + 0.4]} castShadow>
          <boxGeometry args={[0.04, 0.08, 0.35]} />
          <meshStandardMaterial
            color="#9aaab8"
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

function LabSink() {
  return (
    <group position={[4.8, -0.14, -6.6]}>
      {/* sink basin */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[1.6, 0.14, 1.1]} />
        <meshStandardMaterial
          color="#c0d0de"
          roughness={0.25}
          metalness={0.18}
        />
      </mesh>
      <mesh position={[0, -0.22, 0]} receiveShadow>
        <boxGeometry args={[1.4, 0.28, 0.9]} />
        <meshStandardMaterial color="#aabccc" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* tap */}
      <mesh position={[0, 0.32, -0.4]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.6, 16]} />
        <meshStandardMaterial
          color="#9aacba"
          metalness={0.65}
          roughness={0.25}
        />
      </mesh>
      <mesh
        position={[0, 0.55, -0.18]}
        rotation={[Math.PI / 2.4, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.028, 0.028, 0.38, 14]} />
        <meshStandardMaterial
          color="#9aacba"
          metalness={0.65}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}

function LabSafetyPosters() {
  const posters = [
    { x: -6, z: -6.89, color: "#ffd6d6", label: "⚠ Safety First" },
    { x: 0, z: -6.89, color: "#d6f5ff", label: "🧪 Handle with Care" },
    { x: 6, z: -6.89, color: "#d6ffd9", label: "♻ Dispose Safely" },
  ];
  return (
    <>
      {posters.map(({ x, z, color, label }) => (
        <group key={x} position={[x, 2.2, z]}>
          <mesh receiveShadow>
            <planeGeometry args={[1.55, 1.05]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <Html center distanceFactor={10} position={[0, 0, 0.01]}>
            <div className="poster-label">{label}</div>
          </Html>
        </group>
      ))}
    </>
  );
}

function CeilingLampFixture({ position }) {
  return (
    <group position={position}>
      {/* housing */}
      <mesh castShadow>
        <boxGeometry args={[1.4, 0.12, 0.38]} />
        <meshStandardMaterial
          color="#ccd6e0"
          roughness={0.55}
          metalness={0.25}
        />
      </mesh>
      {/* emissive panel */}
      <mesh position={[0, -0.07, 0]}>
        <planeGeometry args={[1.28, 0.3]} />
        <meshStandardMaterial
          color="#fff9ee"
          emissive="#fff5dd"
          emissiveIntensity={1.8}
          roughness={0.9}
        />
      </mesh>
    </group>
  );
}

// ─── LIGHTS ──────────────────────────────────────────────────────────────────
function LabLights() {
  return (
    <>
      {/* Soft overall fill */}
      <ambientLight intensity={0.38} color="#f0f6ff" />

      {/* Main ceiling key light */}
      <directionalLight
        position={[2, 9, 4]}
        intensity={1.05}
        color="#fff8f0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0008}
      />

      {/* Ceiling fluorescent strips (match fixture positions) */}
      <pointLight
        position={[-3, 4.7, -1]}
        intensity={1.1}
        distance={10}
        color="#fffaea"
      />
      <pointLight
        position={[3, 4.7, -1]}
        intensity={1.1}
        distance={10}
        color="#fffaea"
      />
      <pointLight
        position={[0, 4.7, 2.5]}
        intensity={1.0}
        distance={10}
        color="#fffaea"
      />

      {/* Cool rim from window side */}
      <pointLight
        position={[8, 1.5, 0]}
        intensity={0.55}
        distance={14}
        color="#c8e8ff"
      />

      {/* Warm under-bench bounce */}
      <pointLight
        position={[0, -1.8, 1.5]}
        intensity={0.18}
        distance={8}
        color="#ffd8a8"
      />
    </>
  );
}

// ─── BENCH COLLIDER ───────────────────────────────────────────────────────────
function WorkbenchCollider() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider
        args={[5.1, 0.1, 2.9]}
        position={[0, BENCH_TOP - 0.06, 0]}
      />
    </RigidBody>
  );
}

function AcidBaseScene({
  completedSteps,
  animating,
  experimentComplete,
  expectedStepId,
  currentStepIndex,
  onAction,
  setHoverLabel,
}) {
  const hasAcid = completedSteps.includes("add-acid");
  const hasIndicator = completedSteps.includes("add-indicator");
  const hasBase = completedSteps.includes("add-base");
  const observed =
    completedSteps.includes("observe-result") || experimentComplete;

  const liquidState = useMemo(() => {
    if (!hasAcid) return { level: 0.05, color: "#b7e6ff" };
    if (!hasIndicator) return { level: 0.43, color: "#a9defa" };
    if (!hasBase && !observed) return { level: 0.5, color: "#fff0a8" };
    if (observed) return { level: 0.56, color: "#ff7eb2" };
    return { level: 0.54, color: "#ffc4df" };
  }, [hasAcid, hasIndicator, hasBase, observed]);

  const focusPoint = useMemo(() => {
    if (expectedStepId === "observe-result") return [0, 0.9, 0];
    if (expectedStepId === "add-acid") return [-2.8, 1.1, 0.5];
    if (expectedStepId === "add-indicator") return [0, 1.15, 2.4];
    if (expectedStepId === "add-base") return [2.8, 1.1, 0.5];
    return [0, 1, 0.5];
  }, [expectedStepId]);

  const bubbling = animating === "pour-base" || (hasBase && !observed);
  const pouringAcid = animating === "pour-acid";
  const pouringIndicator = animating === "add-drops";
  const pouringBase = animating === "pour-base";

  return (
    <>
      <FocusRig focusPoint={focusPoint} />

      <group position={[0, 0.3, 0]}>
        <InteractiveBottle
          label="Acid Bottle"
          position={[-2.8, 0.52, 0.8]}
          liquidColor="#7dc8ff"
          highlighted={expectedStepId === "add-acid"}
          active={hasAcid}
          tilt={pouringAcid}
          onAction={() => onAction("add-acid")}
          setHoverLabel={setHoverLabel}
        />

        <InteractiveBottle
          label="Indicator"
          position={[0, 0.52, 2.4]}
          liquidColor="#f2d07f"
          highlighted={expectedStepId === "add-indicator"}
          active={hasIndicator}
          tilt={pouringIndicator}
          onAction={() => onAction("add-indicator")}
          setHoverLabel={setHoverLabel}
        />

        <InteractiveBottle
          label="Base Bottle"
          position={[2.8, 0.52, 0.8]}
          liquidColor="#b2f0d2"
          highlighted={expectedStepId === "add-base"}
          active={hasBase}
          tilt={pouringBase}
          onAction={() => onAction("add-base")}
          setHoverLabel={setHoverLabel}
        />

        <group
          position={[0, 0.54, 0.2]}
          onPointerOver={() => setHoverLabel("Erlenmeyer Flask")}
          onPointerOut={() => setHoverLabel("")}
          onClick={() => onAction("observe-result")}
        >
          <ErlenmeyerFlask
            highlighted={expectedStepId === "observe-result"}
            liquidLevel={liquidState.level}
            liquidColor={liquidState.color}
          />
          {bubbling && (
            <RisingParticles count={20} radius={0.55} speed={0.75} />
          )}
          {(pouringAcid || pouringIndicator || pouringBase) && (
            <PourStream
              from={
                pouringAcid
                  ? [-2.8, 1.4, 0.8]
                  : pouringIndicator
                    ? [0, 1.4, 2.4]
                    : [2.8, 1.4, 0.8]
              }
              to={[0, 1.18, 0.2]}
              color={
                pouringAcid
                  ? "#8fd4ff"
                  : pouringIndicator
                    ? "#ffe484"
                    : "#b8ffd6"
              }
            />
          )}
        </group>
      </group>

      <StatusBillboard
        title="Acid-Base Neutralization"
        currentStep={currentStepIndex + 1}
        text={
          observed
            ? "Endpoint reached: indicator turned pink after neutralization."
            : "Manipulate bottles and observe fluid transitions with realistic pour behavior."
        }
      />
    </>
  );
}

function CircuitScene({
  completedSteps,
  experimentComplete,
  expectedEquipmentId,
  expectedStepId,
  currentStepIndex,
  placedComponents,
  onAction,
  setHoverLabel,
}) {
  const hasBattery = completedSteps.includes("place-battery");
  const hasSwitch = completedSteps.includes("connect-switch");
  const hasBulb = completedSteps.includes("connect-bulb");
  const hasClosed = completedSteps.includes("close-circuit");
  const isOn = completedSteps.includes("flip-switch") || experimentComplete;

  const focusPoint = useMemo(() => {
    if (expectedEquipmentId === "battery")
      return SCENE_SLOTS["simple-circuit"].battery;
    if (expectedEquipmentId === "switch")
      return SCENE_SLOTS["simple-circuit"].switch;
    if (expectedEquipmentId === "bulb")
      return SCENE_SLOTS["simple-circuit"].bulb;
    if (expectedEquipmentId === "wire")
      return SCENE_SLOTS["simple-circuit"].wire;
    if (expectedStepId === "flip-switch") return [0, 1.1, 1.2];
    return [0, 0.9, 0.4];
  }, [expectedEquipmentId, expectedStepId]);

  const modelFor = (id) => {
    if (id === "battery") return <BatteryModel active={hasBattery} />;
    if (id === "switch")
      return <SwitchModel toggled={isOn} active={hasSwitch} />;
    if (id === "bulb") return <LightBulbModel isOn={isOn} active={hasBulb} />;
    return <WireModel active={hasClosed} />;
  };

  return (
    <>
      <FocusRig focusPoint={focusPoint} />

      <SnapGuides
        sceneId="simple-circuit"
        expectedEquipmentId={expectedEquipmentId}
        placedComponents={placedComponents}
      />

      <PlacedEquipmentLayer
        sceneId="simple-circuit"
        placedComponents={placedComponents}
        setHoverLabel={setHoverLabel}
        expectedEquipmentId={expectedEquipmentId}
      >
        {modelFor}
      </PlacedEquipmentLayer>

      {hasBattery && hasSwitch && (
        <CablePath
          points={[
            SCENE_SLOTS["simple-circuit"].battery,
            [-1.15, WORKSPACE_BOUNDS.y + 0.08, 1.45],
            SCENE_SLOTS["simple-circuit"].switch,
          ]}
          energized={isOn}
        />
      )}
      {hasSwitch && hasBulb && (
        <CablePath
          points={[
            SCENE_SLOTS["simple-circuit"].switch,
            [1.05, WORKSPACE_BOUNDS.y + 0.06, 1.45],
            SCENE_SLOTS["simple-circuit"].bulb,
          ]}
          energized={isOn}
        />
      )}
      {hasBulb && hasClosed && (
        <CablePath
          points={[
            SCENE_SLOTS["simple-circuit"].bulb,
            [0.9, WORKSPACE_BOUNDS.y + 0.06, -1.0],
            [-1.2, WORKSPACE_BOUNDS.y + 0.08, -1.25],
            SCENE_SLOTS["simple-circuit"].battery,
          ]}
          energized={isOn}
        />
      )}

      <group
        position={[0, WORKSPACE_BOUNDS.y + 0.24, 1.35]}
        onPointerOver={() => setHoverLabel("Switch Toggle")}
        onPointerOut={() => setHoverLabel("")}
        onClick={() => onAction("flip-switch")}
      >
        <SwitchModel
          toggled={isOn}
          active={expectedStepId === "flip-switch" || hasSwitch}
        />
      </group>

      {isOn && (
        <pointLight
          position={SCENE_SLOTS["simple-circuit"].bulb.map((v, index) =>
            index === 1 ? v + 0.95 : v,
          )}
          intensity={2}
          distance={4.8}
          color="#ffd762"
        />
      )}

      <StatusBillboard
        title="Simple Electric Circuit"
        currentStep={currentStepIndex + 1}
        text={
          isOn
            ? "Circuit closed: current flows and lamp emits warm glow."
            : "Assemble components in sequence, then toggle the switch to energize the path."
        }
      />
    </>
  );
}

function DistillationScene({
  completedSteps,
  experimentComplete,
  expectedEquipmentId,
  expectedStepId,
  currentStepIndex,
  placedComponents,
  onAction,
  setHoverLabel,
}) {
  const hasFilled = completedSteps.includes("fill-flask");
  const hasCondenser = completedSteps.includes("setup-condenser");
  const isHeating = completedSteps.includes("heat-water");
  const isCollecting = completedSteps.includes("collect-distillate");
  const isDone =
    completedSteps.includes("observe-result") || experimentComplete;

  const focusPoint = useMemo(() => {
    if (
      expectedEquipmentId &&
      SCENE_SLOTS["water-distillation"][expectedEquipmentId]
    ) {
      return SCENE_SLOTS["water-distillation"][expectedEquipmentId];
    }
    if (expectedStepId === "observe-result") return [2.6, 1, 0.85];
    return [0.1, 0.95, 0.8];
  }, [expectedEquipmentId, expectedStepId]);

  const modelFor = (id) => {
    if (id === "flask") {
      return (
        <RoundBottomFlask
          highlighted={expectedEquipmentId === "flask"}
          liquidLevel={hasFilled ? 0.5 : 0.05}
          liquidColor={isHeating ? "#9edaff" : "#b8e6ff"}
        />
      );
    }
    if (id === "condenser") {
      return <CondenserModel active={hasCondenser || isCollecting || isDone} />;
    }
    if (id === "burner") {
      return (
        <BunsenBurnerModel
          active={isHeating || expectedEquipmentId === "burner"}
        />
      );
    }

    return (
      <ErlenmeyerFlask
        highlighted={expectedEquipmentId === "collector"}
        liquidLevel={isCollecting || isDone ? 0.56 : 0.08}
        liquidColor="#9edcff"
      />
    );
  };

  return (
    <>
      <FocusRig focusPoint={focusPoint} />

      <SnapGuides
        sceneId="water-distillation"
        expectedEquipmentId={expectedEquipmentId}
        placedComponents={placedComponents}
      />

      <PlacedEquipmentLayer
        sceneId="water-distillation"
        placedComponents={placedComponents}
        setHoverLabel={setHoverLabel}
        expectedEquipmentId={expectedEquipmentId}
      >
        {modelFor}
      </PlacedEquipmentLayer>

      {isHeating && (
        <group position={[-2.2, WORKSPACE_BOUNDS.y + 0.7, -0.8]}>
          <RisingParticles
            count={26}
            radius={0.42}
            speed={1.1}
            color="#eef8ff"
          />
        </group>
      )}

      {hasCondenser && (isCollecting || isDone) && (
        <DropletStream
          from={[0.95, WORKSPACE_BOUNDS.y + 0.95, 0.92]}
          to={[2.6, WORKSPACE_BOUNDS.y + 0.86, 0.82]}
          count={7}
        />
      )}

      <group
        position={[2.6, WORKSPACE_BOUNDS.y + 0.82, 0.82]}
        onPointerOver={() => setHoverLabel("Observe Distillate")}
        onPointerOut={() => setHoverLabel("")}
        onClick={() => onAction("observe-result")}
      >
        <mesh visible={false}>
          <sphereGeometry args={[0.8, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </group>

      <StatusBillboard
        title="Water Distillation"
        currentStep={currentStepIndex + 1}
        text={
          isDone
            ? "Distillation completed: condensed vapor collected as clear liquid."
            : "Assemble apparatus, heat gently, and observe vapor condensing into collector flask."
        }
      />
    </>
  );
}

function PlacedEquipmentLayer({
  sceneId,
  placedComponents,
  setHoverLabel,
  expectedEquipmentId,
  children,
}) {
  const slots = SCENE_SLOTS[sceneId] || {};
  const [positions, setPositions] = useState({});

  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      for (const item of placedComponents) {
        if (next[item.instanceId]) continue;
        const forced = slots[item.id];
        if (forced) {
          next[item.instanceId] = [...forced];
        } else {
          next[item.instanceId] = placementToWorld(item, WORKSPACE_BOUNDS);
        }
      }
      return next;
    });
  }, [placedComponents, slots]);

  const setItemPosition = (instanceId, pos) => {
    setPositions((prev) => ({ ...prev, [instanceId]: pos }));
  };

  return (
    <>
      {placedComponents.map((item) => {
        const pos =
          positions[item.instanceId] ||
          placementToWorld(item, WORKSPACE_BOUNDS);
        return (
          <DraggableEquipment
            key={item.instanceId}
            id={item.id}
            label={item.name || EQUIPMENT_NAMES[item.id] || item.id}
            position={pos}
            expected={expectedEquipmentId === item.id}
            setHoverLabel={setHoverLabel}
            onMove={(nextPos) => setItemPosition(item.instanceId, nextPos)}
            onMoveEnd={(released) => {
              const slot = slots[item.id];
              if (!slot) {
                setItemPosition(item.instanceId, released);
                return;
              }

              const dist = distance3(released, slot);
              setItemPosition(
                item.instanceId,
                dist < 1.1 ? [...slot] : released,
              );
            }}
          >
            {children(item.id)}
          </DraggableEquipment>
        );
      })}
    </>
  );
}

function DraggableEquipment({
  id,
  label,
  position,
  expected,
  setHoverLabel,
  onMove,
  onMoveEnd,
  children,
}) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const rbRef = useRef(null);
  const dragPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -WORKSPACE_BOUNDS.y),
    [],
  );
  const offset = useRef(new THREE.Vector3());
  const { camera, raycaster, pointer } = useThree();

  useFrame(() => {
    if (rbRef.current) {
      rbRef.current.setNextKinematicTranslation({
        x: position[0],
        y: position[1],
        z: position[2],
      });
    }

    if (!dragging) return;
    raycaster.setFromCamera(pointer, camera);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(dragPlane, hit)) return;

    hit.add(offset.current);
    const next = [
      clamp(hit.x, -WORKSPACE_BOUNDS.width / 2, WORKSPACE_BOUNDS.width / 2),
      WORKSPACE_BOUNDS.y,
      clamp(hit.z, -WORKSPACE_BOUNDS.depth / 2, WORKSPACE_BOUNDS.depth / 2),
    ];
    onMove(next);
  });

  return (
    <RigidBody
      type="kinematicPosition"
      colliders="hull"
      friction={0.9}
      restitution={0.15}
      ref={rbRef}
    >
      <group
        position={position}
        onPointerDown={(e) => {
          e.stopPropagation();
          setDragging(true);
          if (e.ray.intersectPlane(dragPlane, offset.current)) {
            offset.current.set(
              position[0] - offset.current.x,
              0,
              position[2] - offset.current.z,
            );
          }
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          setDragging(false);
          onMoveEnd(position);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          setHoverLabel(label);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          if (!dragging) setHoverLabel("");
        }}
      >
        <group scale={expected || hovered ? 1.07 : 1}>{children}</group>

        {(hovered || expected) && (
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.34, 0.44, 40]} />
            <meshBasicMaterial
              color={expected ? "#2d8cff" : "#66f0ff"}
              transparent
              opacity={0.8}
            />
          </mesh>
        )}

        {hovered && (
          <Html center position={[0, 1.0, 0]} distanceFactor={12}>
            <div className="equip-tooltip">{label}</div>
          </Html>
        )}
      </group>
    </RigidBody>
  );
}

function SnapGuides({ sceneId, expectedEquipmentId, placedComponents }) {
  const slots = SCENE_SLOTS[sceneId] || {};
  const placedIds = new Set(placedComponents.map((item) => item.id));

  return (
    <>
      {Object.entries(slots).map(([id, pos]) => {
        const isExpected = expectedEquipmentId === id;
        const isPlaced = placedIds.has(id);

        return (
          <mesh
            key={id}
            position={[pos[0], WORKSPACE_BOUNDS.y - 0.18, pos[2]]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[0.46, 40]} />
            <meshBasicMaterial
              color={isPlaced ? "#40c7a7" : isExpected ? "#3188ff" : "#8fa9c4"}
              transparent
              opacity={isPlaced ? 0.4 : isExpected ? 0.48 : 0.2}
            />
          </mesh>
        );
      })}
    </>
  );
}

function FocusRig({ focusPoint }) {
  const controlsRef = useRef();
  const { camera } = useThree();
  // Track current gsap tween so we can kill it on new focus
  const tweenRef = useRef(null);
  const prevFocus = useRef(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    const [fx, fy, fz] = focusPoint;
    // Don't re-tween if focus hasn't changed
    if (
      prevFocus.current &&
      prevFocus.current[0] === fx &&
      prevFocus.current[1] === fy &&
      prevFocus.current[2] === fz
    )
      return;
    prevFocus.current = focusPoint;

    if (tweenRef.current) tweenRef.current.kill();

    const ctrl = controlsRef.current;
    const camOffset = { x: fx + 5.5, y: fy + 3.4, z: fz + 5.5 };

    tweenRef.current = gsap.to(
      {
        tx: ctrl.target.x,
        ty: ctrl.target.y,
        tz: ctrl.target.z,
        cx: camera.position.x,
        cy: camera.position.y,
        cz: camera.position.z,
      },
      {
        tx: fx,
        ty: fy,
        tz: fz,
        cx: camOffset.x,
        cy: camOffset.y,
        cz: camOffset.z,
        duration: 1.1,
        ease: "power2.inOut",
        onUpdate: function () {
          ctrl.target.set(
            this.targets()[0].tx,
            this.targets()[0].ty,
            this.targets()[0].tz,
          );
          camera.position.set(
            this.targets()[0].cx,
            this.targets()[0].cy,
            this.targets()[0].cz,
          );
          ctrl.update();
        },
      },
    );
  }, [focusPoint, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      minDistance={4.5}
      maxDistance={16}
      maxPolarAngle={Math.PI / 2.08}
      makeDefault
    />
  );
}

function StatusBillboard({ title, currentStep, text }) {
  return (
    <Html position={[0, 2.7, -2.45]} transform distanceFactor={8.5}>
      <div className="lab-status-card">
        <div className="lab-status-title">{title}</div>
        <div className="lab-status-step">Step {currentStep}</div>
        <div className="lab-status-text">{text}</div>
      </div>
    </Html>
  );
}

function InteractiveBottle({
  label,
  position,
  liquidColor,
  highlighted,
  active,
  tilt,
  onAction,
  setHoverLabel,
}) {
  const bottleRef = useRef();

  useFrame((_, delta) => {
    if (!bottleRef.current) return;
    const targetTilt = tilt ? -0.6 : 0;
    bottleRef.current.rotation.z = THREE.MathUtils.damp(
      bottleRef.current.rotation.z,
      targetTilt,
      6,
      delta,
    );
  });

  return (
    <group
      ref={bottleRef}
      position={position}
      onClick={onAction}
      onPointerOver={() => setHoverLabel(label)}
      onPointerOut={() => setHoverLabel("")}
    >
      <BottleModel
        liquidColor={liquidColor}
        highlighted={highlighted}
        active={active}
      />
      <Html center position={[0, 0.9, 0]} distanceFactor={15}>
        <div className="equip-tooltip subtle">{label}</div>
      </Html>
    </group>
  );
}

function BottleModel({ liquidColor, highlighted, active }) {
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[0.32, 0.25, 1.1, 32]} />
        <meshPhysicalMaterial
          color="#dff2ff"
          transparent
          opacity={0.36}
          roughness={0.02}
          transmission={0.96}
          thickness={0.8}
          ior={1.45}
        />
      </mesh>
      <mesh position={[0, -0.2, 0]} castShadow>
        <cylinderGeometry args={[0.27, 0.22, 0.62, 24]} />
        <meshPhysicalMaterial
          color={liquidColor}
          transparent
          opacity={0.54}
          roughness={0.15}
          transmission={0.32}
        />
      </mesh>
      <mesh position={[0, 0.66, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.12, 24]} />
        <meshStandardMaterial color="#8696a8" roughness={0.78} />
      </mesh>
      {(highlighted || active) && (
        <mesh position={[0, -0.61, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.44, 28]} />
          <meshBasicMaterial
            color={highlighted ? "#2d8cff" : "#67f2db"}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
    </group>
  );
}

function ErlenmeyerFlask({ highlighted, liquidLevel, liquidColor }) {
  const liquidRef = useRef();
  const tint = useMemo(() => new THREE.Color(liquidColor), [liquidColor]);

  useFrame((_, delta) => {
    if (!liquidRef.current) return;
    liquidRef.current.scale.y = THREE.MathUtils.damp(
      liquidRef.current.scale.y,
      Math.max(0.05, liquidLevel),
      4,
      delta,
    );
    liquidRef.current.material.color.lerp(tint, 1 - Math.exp(-delta * 3.5));
  });

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.44, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.4, 32]} />
        <meshPhysicalMaterial
          color="#dff3ff"
          transparent
          opacity={0.26}
          transmission={1}
          roughness={0.02}
          thickness={0.95}
          ior={1.44}
          metalness={0}
        />
      </mesh>

      <mesh castShadow receiveShadow position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.76, 0.24, 0.95, 48]} />
        <meshPhysicalMaterial
          color="#dbf0ff"
          transparent
          opacity={0.22}
          transmission={1}
          roughness={0.02}
          thickness={1.3}
          ior={1.44}
          reflectivity={0.65}
        />
      </mesh>

      <mesh ref={liquidRef} position={[0, -0.35, 0]} scale={[1, 0.08, 1]}>
        <cylinderGeometry args={[0.56, 0.24, 0.72, 42]} />
        <meshPhysicalMaterial
          color={liquidColor}
          transparent
          opacity={0.45}
          roughness={0.1}
          transmission={0.78}
          ior={1.32}
          thickness={1.2}
        />
      </mesh>

      {highlighted && (
        <mesh position={[0, -0.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.74, 0.88, 44]} />
          <meshBasicMaterial color="#3188ff" transparent opacity={0.72} />
        </mesh>
      )}
    </group>
  );
}

function RoundBottomFlask({ highlighted, liquidLevel, liquidColor }) {
  const liquidRef = useRef();

  useFrame((_, delta) => {
    if (!liquidRef.current) return;
    liquidRef.current.scale.y = THREE.MathUtils.damp(
      liquidRef.current.scale.y,
      Math.max(0.08, liquidLevel),
      3.6,
      delta,
    );
  });

  return (
    <group>
      <mesh position={[0, 0.56, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.55, 28]} />
        <meshPhysicalMaterial
          color="#d9f0ff"
          transparent
          opacity={0.25}
          transmission={1}
          roughness={0.02}
          ior={1.44}
        />
      </mesh>
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[0.62, 44, 34]} />
        <meshPhysicalMaterial
          color="#ddf2ff"
          transparent
          opacity={0.23}
          transmission={1}
          roughness={0.03}
          ior={1.44}
        />
      </mesh>
      <mesh ref={liquidRef} position={[0, -0.18, 0]} scale={[1, 0.1, 1]}>
        <sphereGeometry
          args={[0.5, 34, 24, 0, Math.PI * 2, 0, Math.PI * 0.82]}
        />
        <meshPhysicalMaterial
          color={liquidColor}
          transparent
          opacity={0.48}
          roughness={0.12}
          transmission={0.7}
        />
      </mesh>
      {highlighted && (
        <mesh position={[0, -0.64, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.62, 0.74, 40]} />
          <meshBasicMaterial color="#3188ff" transparent opacity={0.75} />
        </mesh>
      )}
    </group>
  );
}

function BunsenBurnerModel({ active }) {
  const outerFlameRef = useRef();
  const innerFlameRef = useRef();
  const flameLightRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (outerFlameRef.current) {
      outerFlameRef.current.scale.y = 1 + Math.sin(t * 14) * 0.12;
      outerFlameRef.current.scale.x = 1 + Math.cos(t * 9) * 0.07;
      outerFlameRef.current.position.y = 0.58 + Math.sin(t * 11) * 0.025;
    }
    if (innerFlameRef.current) {
      innerFlameRef.current.scale.y = 1 + Math.cos(t * 17) * 0.14;
      innerFlameRef.current.scale.x = 1 + Math.sin(t * 8) * 0.06;
    }
    if (flameLightRef.current) {
      flameLightRef.current.intensity = active
        ? 1.2 + Math.sin(t * 13) * 0.35
        : 0;
    }
  });

  return (
    <group>
      {/* Base plate */}
      <mesh position={[0, -0.22, 0]} castShadow>
        <cylinderGeometry args={[0.48, 0.52, 0.22, 32]} />
        <meshStandardMaterial
          color="#6e7f90"
          roughness={0.62}
          metalness={0.25}
        />
      </mesh>
      {/* Air-hole collar */}
      <mesh position={[0, -0.04, 0]} castShadow>
        <cylinderGeometry args={[0.135, 0.14, 0.12, 28]} />
        <meshStandardMaterial
          color="#8898a8"
          roughness={0.55}
          metalness={0.3}
        />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.17, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.135, 0.52, 26]} />
        <meshStandardMaterial
          color="#a4b3c2"
          roughness={0.5}
          metalness={0.32}
        />
      </mesh>
      {/* Outer flame */}
      {active && (
        <mesh ref={outerFlameRef} position={[0, 0.58, 0]}>
          <coneGeometry args={[0.18, 0.62, 28]} />
          <meshStandardMaterial
            color="#ff8c1a"
            emissive="#ff6a00"
            emissiveIntensity={1.4}
            transparent
            opacity={0.82}
          />
        </mesh>
      )}
      {/* Inner blue cone */}
      {active && (
        <mesh ref={innerFlameRef} position={[0, 0.54, 0]}>
          <coneGeometry args={[0.08, 0.32, 20]} />
          <meshStandardMaterial
            color="#66d9ff"
            emissive="#33bbff"
            emissiveIntensity={1.6}
            transparent
            opacity={0.72}
          />
        </mesh>
      )}
      {/* Dynamic point light from flame */}
      <pointLight
        ref={flameLightRef}
        position={[0, 0.9, 0]}
        intensity={active ? 1.2 : 0}
        distance={3.5}
        color="#ff9b36"
      />
    </group>
  );
}

function BatteryModel({ active }) {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[1.05, 0.62, 0.58]} />
        <meshStandardMaterial
          color="#2f2f34"
          metalness={0.08}
          roughness={0.72}
        />
      </mesh>
      <mesh position={[0, 0.19, 0.2]} castShadow>
        <boxGeometry args={[0.22, 0.16, 0.16]} />
        <meshStandardMaterial color="#dfb948" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.44, 0, 0]}>
        <boxGeometry args={[0.1, 0.56, 0.55]} />
        <meshStandardMaterial
          color={active ? "#ffba61" : "#7f8b9b"}
          emissive={active ? "#ffb45d" : "#000000"}
          emissiveIntensity={active ? 0.5 : 0}
        />
      </mesh>
    </group>
  );
}

function LightBulbModel({ isOn, active }) {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow>
        <sphereGeometry args={[0.36, 36, 26]} />
        <meshPhysicalMaterial
          color={isOn ? "#ffeaa9" : "#eef8ff"}
          emissive={isOn ? "#ffd45a" : "#000000"}
          emissiveIntensity={isOn ? 1.2 : 0}
          transparent
          opacity={0.75}
          transmission={0.9}
          roughness={0.08}
          thickness={0.8}
          ior={1.42}
        />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.2, 0.3, 24]} />
        <meshStandardMaterial
          color="#7d8794"
          roughness={0.52}
          metalness={0.35}
        />
      </mesh>
      {isOn && (
        <mesh>
          <sphereGeometry args={[0.62, 22, 18]} />
          <meshBasicMaterial color="#ffd35a" transparent opacity={0.2} />
        </mesh>
      )}
      {active && !isOn && (
        <mesh position={[0, -0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.32, 0.45, 36]} />
          <meshBasicMaterial color="#3188ff" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

function SwitchModel({ toggled, active }) {
  return (
    <group>
      <RoundedBox
        args={[1.06, 0.24, 0.72]}
        radius={0.07}
        smoothness={4}
        castShadow
      >
        <meshStandardMaterial color="#cad6e4" roughness={0.62} />
      </RoundedBox>
      <mesh
        position={[0, 0.22, 0]}
        rotation={[0, 0, toggled ? -0.42 : 0.45]}
        castShadow
      >
        <boxGeometry args={[0.62, 0.08, 0.12]} />
        <meshStandardMaterial
          color={toggled ? "#6ee7b7" : "#8f9fb4"}
          emissive={toggled ? "#59d7a6" : "#000000"}
          emissiveIntensity={toggled ? 0.55 : 0}
        />
      </mesh>
      {active && (
        <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.5, 34]} />
          <meshBasicMaterial
            color={toggled ? "#54d6a0" : "#3188ff"}
            transparent
            opacity={0.68}
          />
        </mesh>
      )}
    </group>
  );
}

function WireModel({ active }) {
  return (
    <group>
      <mesh rotation={[0, 0.24, 0]} castShadow>
        <torusGeometry args={[0.5, 0.08, 18, 56, Math.PI * 1.58]} />
        <meshStandardMaterial
          color={active ? "#f8be4b" : "#6b7b8e"}
          emissive={active ? "#f6ae3c" : "#000000"}
          emissiveIntensity={active ? 0.55 : 0}
          roughness={0.43}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
}

function CondenserModel({ active }) {
  return (
    <group rotation={[0, 0, -0.08]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.16, 0.16, 2.5, 36]} />
        <meshPhysicalMaterial
          color="#d8efff"
          transparent
          opacity={0.35}
          transmission={0.95}
          roughness={0.04}
          thickness={0.9}
          ior={1.43}
        />
      </mesh>
      <mesh
        position={[-0.38, 0.36, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.06, 0.06, 0.65, 20]} />
        <meshStandardMaterial color="#6f879f" roughness={0.55} />
      </mesh>
      <mesh
        position={[0.38, -0.36, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.06, 0.06, 0.65, 20]} />
        <meshStandardMaterial color="#6f879f" roughness={0.55} />
      </mesh>
      {active && (
        <mesh>
          <cylinderGeometry args={[0.13, 0.13, 2.45, 24]} />
          <meshPhysicalMaterial
            color="#9ad7ff"
            transparent
            opacity={0.3}
            transmission={0.8}
          />
        </mesh>
      )}
    </group>
  );
}

function CablePath({ points, energized }) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
    [points],
  );

  return (
    <mesh>
      <tubeGeometry args={[curve, 64, 0.06, 10, false]} />
      <meshStandardMaterial
        color={energized ? "#ffc96f" : "#5f6f82"}
        emissive={energized ? "#ffb64e" : "#000000"}
        emissiveIntensity={energized ? 0.65 : 0}
        roughness={0.45}
        metalness={0.18}
      />
    </mesh>
  );
}

function PourStream({ from, to, color }) {
  const direction = useMemo(
    () => new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]),
    [from, to],
  );
  const length = direction.length();

  return (
    <mesh
      position={[
        (from[0] + to[0]) / 2,
        (from[1] + to[1]) / 2,
        (from[2] + to[2]) / 2,
      ]}
      quaternion={new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize(),
      )}
    >
      <cylinderGeometry args={[0.045, 0.022, length, 18]} />
      <meshPhysicalMaterial
        color={color}
        transparent
        opacity={0.62}
        roughness={0.08}
        transmission={0.75}
      />
    </mesh>
  );
}

function RisingParticles({ count, radius, speed, color = "#ffffff" }) {
  const refs = useRef([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        angle: (i / count) * Math.PI * 2,
        offset: Math.random() * radius,
        base: Math.random(),
      })),
    [count, radius],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i += 1) {
      const node = refs.current[i];
      if (!node) continue;

      const seed = seeds[i];
      const rise = ((t * speed + seed.base * 2.5) % 1.2) - 0.1;
      node.position.set(
        Math.cos(seed.angle + t * 0.4) * seed.offset,
        rise * 1.4,
        Math.sin(seed.angle + t * 0.4) * seed.offset,
      );
      node.scale.setScalar(0.04 + (1 - rise) * 0.018);
      node.material.opacity = 0.62 - rise * 0.45;
    }
  });

  return (
    <group>
      {seeds.map((_, i) => (
        <mesh
          key={i}
          ref={(node) => {
            refs.current[i] = node;
          }}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function DropletStream({ from, to, count }) {
  const refs = useRef([]);
  const travel = useMemo(
    () => new THREE.Vector3(...to).sub(new THREE.Vector3(...from)),
    [from, to],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i += 1) {
      const node = refs.current[i];
      if (!node) continue;
      const phase = (t * 0.9 + i / count) % 1;
      const current = new THREE.Vector3(...from).addScaledVector(travel, phase);
      node.position.copy(current);
      node.scale.setScalar(0.04 + phase * 0.015);
      node.material.opacity = 0.75 - phase * 0.4;
    }
  });

  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={i}
          ref={(node) => {
            refs.current[i] = node;
          }}
        >
          <sphereGeometry args={[1, 10, 10]} />
          <meshPhysicalMaterial
            color="#8fd7ff"
            transparent
            opacity={0.65}
            roughness={0.08}
            transmission={0.85}
          />
        </mesh>
      ))}
    </group>
  );
}

function placementToWorld(item, bounds) {
  const xPercent = item?.x ?? 50;
  const yPercent = item?.y ?? 55;
  const x = (xPercent / 100 - 0.5) * bounds.width;
  const z = (0.5 - yPercent / 100) * bounds.depth;
  return [x, bounds.y, z];
}

function distance3(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
