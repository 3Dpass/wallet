import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { BufferGeometry, Mesh } from "three";
import * as THREE from "three";

const textureUrl = "/textures/space.jpg";
const textureUrls = [textureUrl, textureUrl, textureUrl, textureUrl, textureUrl, textureUrl];
const cubeTextureLoader = new THREE.CubeTextureLoader();
const textureCube = cubeTextureLoader.load(textureUrls);
textureCube.wrapS = THREE.MirroredRepeatWrapping;
textureCube.wrapT = THREE.MirroredRepeatWrapping;
textureCube.mapping = THREE.CubeRefractionMapping;

interface IProps {
  geometry: BufferGeometry;
}

export default function Object({ geometry }: IProps) {
  const meshRef = useRef<Mesh>(null);
  const [scaled, setScaled] = useState(false);

  useEffect(() => {
    // scale object to fit in a viewport
    if (!scaled && meshRef.current) {
      const bbox = new THREE.Box3().setFromObject(meshRef.current);
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.0 / maxDim;
      meshRef.current.scale.set(scale, scale, scale);
      setScaled(true);
    }
  }, [meshRef, scaled]);

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return;
    }
    meshRef.current.rotation.set(clock.getElapsedTime() / 10.0, clock.getElapsedTime() / 10.0, clock.getElapsedTime() / 10.0);
  });

  return (
    <>
      <mesh ref={meshRef} geometry={geometry}>
        <meshPhongMaterial emissive="#fff" envMap={textureCube} refractionRatio={0.7} reflectivity={1} flatShading />
      </mesh>
    </>
  );
}
