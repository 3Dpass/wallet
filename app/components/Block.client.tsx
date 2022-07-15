import { Rock } from "./Rock";
import { lazy } from "react";
import { Card, Elevation } from "@blueprintjs/core";

const Canvas = lazy(() => import("@react-three/fiber").then((module) => ({ default: module.Canvas })));

export default function Block({ block }) {
  return (
    <Card elevation={Elevation.ZERO}>
      <div className="md:flex-row justify-between">
        <div>
          <div className="text-sm text-gray-500">Block</div>
          <div className="text-xl">{block.block.header.number.toHuman()}</div>
        </div>
        <div className="w-full h-[200px] md:h-[400px]">
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
      </div>
      <code className="overflow-x-auto block text-center text-[11px] text-gray-500">
        {block.objectHashes.map((hash, index) => {
          return <div key={index}>{hash}</div>;
        })}
      </code>
    </Card>
  );
}
