import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
// We removed 'Canvas' from the imports because the parent handles it.

// --- 1. The Particle Field (The "Stars") ---
function StarField(props: any) {
  const ref = useRef<any>(null);
  
  // Create 5000 stars
  const [sphere] = useState(() => {
    const coords = new Float32Array(5000 * 3);
    for (let i = 0; i < 5000 * 3; i++) {
      coords[i] = (Math.random() - 0.5) * 3; // Spread stars in a 3x3x3 box
    }
    return coords;
  });

  // Animate the stars rotating
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          color="#ffa0e0"
          size={0.005}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
}

// --- 2. The Main Scene Component ---
export default function MeditationScene() {
  return (
    // We return a Group instead of a Canvas
    <group>
      {/* A warm ambient light */}
      <ambientLight intensity={0.5} />
      
      {/* The animated stars */}
      <StarField />
    </group>
  );
}