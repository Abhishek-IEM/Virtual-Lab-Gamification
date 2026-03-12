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
import "./LabRenderer.css";

const WORKSPACE_BOUNDS = { width: 8.2, depth: 5.2, y: 0.58 };

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
        shadows
        camera={{ position: [6.3, 4.2, 7.1], fov: 47, near: 0.1, far: 200 }}
      >
        <color attach="background" args={["#e9f3ff"]} />
        <fog attach="fog" args={["#e9f3ff", 12, 28]} />
        <SoftShadows samples={18} size={20} focus={0.5} />

        <Physics gravity={[0, -6, 0]}>
          <LabLights />
          <Workbench />

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

        <Environment preset="city" />
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

function LabLights() {
  return (
    <>
      <ambientLight intensity={0.52} color="#f5f9ff" />
      <directionalLight
        position={[6, 8, 3]}
        intensity={1.25}
        color="#fff9ee"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={25}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <pointLight position={[-4, 3, -2]} intensity={0.22} color="#9fd8ff" />
      <pointLight position={[3.5, 2.5, 3]} intensity={0.2} color="#ffc68a" />
    </>
  );
}

function Workbench() {
  return (
    <group>
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[9.5, 0.2, 6.1]} />
        <meshStandardMaterial color="#d7e4f2" roughness={0.58} />
      </mesh>
      <mesh position={[0, -0.42, 0]} receiveShadow>
        <boxGeometry args={[9.9, 0.4, 6.5]} />
        <meshStandardMaterial color="#9aa7b7" roughness={0.76} />
      </mesh>
      <gridHelper
        args={[10, 24, new THREE.Color("#9eb3cc"), new THREE.Color("#d3dfec")]}
        position={[0, 0.06, 0]}
      />
    </group>
  );
}

function WorkbenchCollider() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[4.8, 0.2, 3.1]} position={[0, -0.05, 0]} />
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
  const desiredOffset = useMemo(() => new THREE.Vector3(5.5, 3.4, 5.5), []);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;
    const target = new THREE.Vector3(...focusPoint);
    const blend = 1 - Math.exp(-delta * 2.8);
    controlsRef.current.target.lerp(target, blend);

    const goal = target.clone().add(desiredOffset);
    camera.position.lerp(goal, blend * 0.5);
    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      minDistance={5.5}
      maxDistance={14}
      maxPolarAngle={Math.PI / 2.05}
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
  return (
    <group>
      <mesh position={[0, -0.2, 0]} castShadow>
        <cylinderGeometry args={[0.44, 0.5, 0.24, 32]} />
        <meshStandardMaterial
          color="#7f8fa0"
          roughness={0.65}
          metalness={0.22}
        />
      </mesh>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.13, 0.44, 26]} />
        <meshStandardMaterial
          color="#a9b4c2"
          roughness={0.55}
          metalness={0.3}
        />
      </mesh>
      {active && (
        <mesh position={[0, 0.57, 0]} castShadow>
          <coneGeometry args={[0.16, 0.52, 26]} />
          <meshStandardMaterial
            emissive="#ff9b36"
            emissiveIntensity={1.1}
            color="#ffcf6e"
            transparent
            opacity={0.9}
          />
        </mesh>
      )}
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
