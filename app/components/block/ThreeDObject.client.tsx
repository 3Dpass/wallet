import { useEffect, useMemo, useRef, useState } from "react";
import type { BufferGeometry, Mesh } from "three";
import * as THREE from "three";
import { createCubeTexture } from "./threeDConstants";
import { OrbitControls } from "three-stdlib";
import { useThree, extend } from "@react-three/fiber";

extend({ OrbitControls });

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

function Controls() {
  const { camera, gl } = useThree();
  const controls = useRef<OrbitControls>();
  useEffect(() => {
    if (controls.current) {
      controls.current.enableDamping = true;
      controls.current.dampingFactor = 0.1;
      controls.current.enablePan = false;
      controls.current.enableZoom = false;
      controls.current.autoRotate = false;
    }
  }, []);
  // @ts-ignore - orbitControls is a custom component extended from OrbitControls via extend()
  return <orbitControls ref={controls} args={[camera, gl.domElement]} />;
}

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

  return (
    <>
      <mesh ref={meshRef} geometry={geometry}>
        <ObjectMaterial envMap={textureCube} />
      </mesh>
      <Controls />
    </>
  );
}
