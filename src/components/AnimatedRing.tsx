// src/components/AnimatedRing.tsx
import { PointMaterial, Points } from "@react-three/drei/native";
import { Canvas, useFrame } from "@react-three/fiber/native";
import React, { useMemo, useRef } from "react";
import { TorusGeometry } from "three";

function RingAnimation() {
  const ref = useRef<any>();

  // This creates the points for our ring shape
  const points = useMemo(() => {
    const geometry = new TorusGeometry(1, 0.3, 16, 100); // Ring shape
    return geometry.attributes.position.array;
  }, []);

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta / 10;
      ref.current.rotation.y += delta / 15;
    }
  });

  return (
    <Points
      ref={ref}
      positions={points as Float32Array}
      stride={3}
      frustumCulled={false}
    >
      <PointMaterial
        transparent
        color="#ffffff"
        size={0.015} // Slightly larger dots for visibility
        sizeAttenuation={true}
        depthWrite={false}
      />
    </Points>
  );
}

export default function AnimatedRing() {
  return (
    <Canvas camera={{ position: [0, 0, 2.5] }}>
      <ambientLight intensity={1.0} />
      <RingAnimation />
    </Canvas>
  );
}
