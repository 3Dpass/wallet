import { extend, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BufferGeometry, Mesh } from "three";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { createCubeTexture } from "./threeDConstants";

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

      // Safari-specific optimizations
      controls.current.screenSpacePanning = false;
    }
  }, []);

  // @ts-expect-error - orbitControls is a custom component extended from OrbitControls via extend()
  return <orbitControls ref={controls} args={[camera, gl.domElement]} />;
}

export default function ThreeDObject({ geometry }: ThreeDObjectProps) {
  const meshRef = useRef<Mesh>(null);
  const [scaled, setScaled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const geometryRef = useRef<BufferGeometry | null>(null);
  const previousGeometryRef = useRef<BufferGeometry | null>(null);

  // Memoize texture creation with better error handling
  const textureCube = useMemo(() => {
    try {
      return createCubeTexture();
    } catch (e) {
      console.warn("Failed to create cube texture:", e);
      // Return a fallback texture
      return new THREE.CubeTexture();
    }
  }, []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!scaled && mesh && geometry) {
      try {
        // Store reference to previous geometry for cleanup
        previousGeometryRef.current = geometryRef.current;
        // Store reference to current geometry
        geometryRef.current = geometry;

        // Validate geometry before processing
        if (
          !geometry ||
          !geometry.attributes ||
          !geometry.attributes.position
        ) {
          setError("Invalid geometry: missing position attributes");
          return;
        }

        const positionCount = geometry.attributes.position.count;
        if (positionCount === 0) {
          setError("Invalid geometry: no vertices");
          return;
        }

        const bbox = new THREE.Box3().setFromObject(mesh);
        const size = bbox.getSize(new THREE.Vector3());

        // Check if the object has valid dimensions
        if (size.x === 0 && size.y === 0 && size.z === 0) {
          setError("Invalid geometry: zero dimensions");
          return;
        }

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim === 0) {
          setError("Invalid geometry: zero size");
          return;
        }

        const scale = 1.0 / maxDim;
        mesh.scale.set(scale, scale, scale);
        setScaled(true);
        setError(null);
      } catch (e) {
        console.error("Error processing geometry:", e);
        setError("Failed to process geometry");
      }
    }

    // Cleanup function with better error handling
    return () => {
      if (mesh) {
        try {
          // Dispose the previous geometry if it exists and is different from the current one
          if (previousGeometryRef.current && previousGeometryRef.current !== geometry) {
            previousGeometryRef.current.dispose();
          }

          if (mesh.material instanceof THREE.Material) {
            mesh.material.dispose();
          }

          // Clear references
          previousGeometryRef.current = null;
        } catch (e) {
          console.error("Error during cleanup:", e);
        }
      }
    };
  }, [scaled, geometry]);

  // Additional cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        // Dispose current geometry
        if (geometryRef.current) {
          geometryRef.current.dispose();
          geometryRef.current = null;
        }
        // Dispose previous geometry
        if (previousGeometryRef.current) {
          previousGeometryRef.current.dispose();
          previousGeometryRef.current = null;
        }
      } catch (e) {
        console.error("Error during unmount cleanup:", e);
      }
    };
  }, []);

  // If there's an error, show a fallback
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-400">
          <div className="text-xs mb-1">Preview Error</div>
          <div className="text-xs">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <mesh ref={meshRef} geometry={geometry}>
        <ObjectMaterial envMap={textureCube} />
      </mesh>
      <Controls />
    </>
  );
}
