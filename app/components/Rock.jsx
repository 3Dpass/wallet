import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Rock({ geometry }) {
  const rock = useRef();
  useFrame(({ clock }) => {
    rock.current.rotation.y = clock.getElapsedTime() / 3.0;
    rock.current.rotation.z = clock.getElapsedTime() / 5.0;
    rock.current.rotation.x = clock.getElapsedTime() / 10.0;
  });
  return (
    <>
      <ambientLight intensity={0.5} color={[1, 1, 1]} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <pointLight position={[-10, -10, -10]} />
      <mesh ref={rock} geometry={geometry}>
        <meshStandardMaterial color="#89CFF0" roughness={0.1} wireframe={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}
