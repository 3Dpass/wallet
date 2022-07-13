import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Rock({ geometry }) {
  const DEFAULT_COLOR = "#2f343c";
  const [wireframe, setWireframe] = useState(false);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const rock = useRef();
  useFrame(({ clock }) => {
    rock.current.rotation.y = clock.getElapsedTime() / 3.0;
    rock.current.rotation.z = clock.getElapsedTime() / 5.0;
    rock.current.rotation.x = clock.getElapsedTime() / 10.0;
  });

  return (
    <>
      <ambientLight intensity={0.8} color={[1, 1, 1]} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <pointLight position={[-10, -10, -10]} />
      <mesh
        ref={rock}
        geometry={geometry}
        onPointerEnter={() => {
          setWireframe(true);
          setColor("#fff");
        }}
        onPointerLeave={() => {
          setWireframe(false);
          setColor(DEFAULT_COLOR);
        }}
      >
        <meshStandardMaterial color={color} roughness={0.1} wireframe={wireframe} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}
