import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BufferGeometry, Mesh } from "three";
import * as THREE from "three";
import { createCubeTexture } from "./threeDConstants";

interface ThreeDObjectProps {
  geometry: BufferGeometry;
}

interface ObjectMaterialProps {
  envMap: THREE.CubeTexture;
}

const ObjectMaterial = ({ envMap }: ObjectMaterialProps) => (
  <meshPhongMaterial
    emissive="#faf"
    envMap={envMap}
    refractionRatio={0.7}
    reflectivity={1}
    flatShading
  />
);

export default function ThreeDObject({ geometry }: ThreeDObjectProps) {
  const meshRef = useRef<Mesh>(null);
  const [scaled, setScaled] = useState(false);

  // Memoize texture creation
  const textureCube = useMemo(() => createCubeTexture(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!scaled && mesh) {
      const bbox = new THREE.Box3().setFromObject(mesh);
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.0 / maxDim;
      mesh.scale.set(scale, scale, scale);
      setScaled(true);
    }

    // Cleanup
    return () => {
      if (mesh) {
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
      }
    };
  }, [scaled]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const rotation = clock.getElapsedTime() / 10.0;
      meshRef.current.rotation.set(rotation, rotation, rotation);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <ObjectMaterial envMap={textureCube} />
    </mesh>
  );
}
