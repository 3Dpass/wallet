import { Card, Elevation } from "@blueprintjs/core";
import { Canvas } from "@react-three/fiber";
import { Rock } from "./Rock";

export default function Block({ block }) {
  return (
    <Card elevation={Elevation.TWO}>
      <div className="text-center">
        Block: <strong>{block.block.header.number.toNumber()}</strong>
      </div>
      <div style={{ height: 300 }}>
        <Canvas
          camera={{
            fov: 30,
            near: 0.1,
            far: 1000,
            position: [0, 0, 10],
          }}
        >
          <Rock geometry={block.object.geometry} />
        </Canvas>
      </div>
      <code className="mb-3 overflow-x-auto block text-center text-xs text-gray-500">
        {block.objectHashes.map((hash, index) => {
          return <div key={index}>{hash}</div>;
        })}
      </code>
    </Card>
  );
}