import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { BufferGeometry, Mesh } from "three";
import * as THREE from "three";

const COLOR = "#fff";

interface IProps {
  geometry: BufferGeometry;
}

export default function Rock({ geometry }: IProps) {
  const rock = useRef<Mesh>();
  const [scaled, setScaled] = useState(false);

  useEffect(() => {
    // scale object to fit in a viewport
    if (!scaled) {
      const bbox = new THREE.Box3().setFromObject(rock.current);
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.0 / maxDim;
      rock.current.scale.set(scale, scale, scale);
      setScaled(true);
    }
  }, [rock, scaled]);

  useFrame(({ clock }) => {
    if (!rock.current) {
      return;
    }
    rock.current.rotation.set(clock.getElapsedTime() / 10.0, clock.getElapsedTime() / 10.0, clock.getElapsedTime() / 10.0);
  });

  const textureUrl = "/textures/space.jpg";
  const textureUrls = useMemo(() => [textureUrl, textureUrl, textureUrl, textureUrl, textureUrl, textureUrl], [textureUrl]);
  const textureCube = useMemo(() => {
    const cubeTextureLoader = new THREE.CubeTextureLoader();
    const loadedTextureCube = cubeTextureLoader.load(textureUrls);
    loadedTextureCube.wrapS = THREE.MirroredRepeatWrapping;
    loadedTextureCube.wrapT = THREE.MirroredRepeatWrapping;
    loadedTextureCube.mapping = THREE.CubeRefractionMapping;
    return loadedTextureCube;
  }, [textureUrls]);

  return (
    <>
      <ambientLight color={[1, 1, 1]} />
      <pointLight intensity={2} position={[-10, -10, -10]} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <mesh ref={rock} geometry={geometry}>
        <meshPhongMaterial color={COLOR} envMap={textureCube} refractionRatio={0.7} reflectivity={1} flatShading={true} />
      </mesh>
    </>
  );
}
