import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COLOR = "#fff";

export function Rock({ geometry }) {
  const rock = useRef();
  useFrame(({ clock }) => {
    rock.current.rotation.y = clock.getElapsedTime() / 10.0;
    rock.current.rotation.z = clock.getElapsedTime() / 10.0;
    rock.current.rotation.x = clock.getElapsedTime() / 10.0;
  });

  const textureUrl = "/textures/space.jpg";
  const textureUrls = [textureUrl, textureUrl, textureUrl, textureUrl, textureUrl, textureUrl];
  const textureCube = new THREE.CubeTextureLoader().load(textureUrls);
  textureCube.wrapping = THREE.MirroredRepeatWrapping;
  textureCube.mapping = THREE.CubeRefractionMapping;

  return (
    <>
      <ambientLight color={[1, 1, 1]} />
      <pointLight intensity={2} position={[-10, -10, -10]} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <mesh ref={rock} geometry={geometry}>
        <meshPhongMaterial color={COLOR} roughness={0.8} envMap={textureCube} refractionRatio={0.7} reflectivity={1} flatShading={true} />
      </mesh>
    </>
  );
}
