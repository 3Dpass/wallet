import { lazy, Suspense } from "react";
import { Button, Card, Elevation } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import Rock from "./Rock.client";
import TitledValue from "../common/TitledValue";

const Canvas = lazy(() => import("@react-three/fiber").then((module) => ({ default: module.Canvas })));

export default function Block({ block }) {
  return (
    <Card elevation={Elevation.FOUR}>
      <div className="flex justify-between">
        <TitledValue title="Block" value={block.block.header.number.toHuman()} />
        <Popover2
          content={
            <code className="p-4 block text-xs">
              {block.objectHashes.map((hash, index) => {
                return <div key={index}>{hash}</div>;
              })}
            </code>
          }
        >
          <Button icon="info-sign" />
        </Popover2>
      </div>
      <div className="w-full h-[300px]">
        <Canvas
          camera={{
            fov: 30,
            near: 0.1,
            far: 1000,
            position: [0, 0, 8],
          }}
        >
          <Suspense fallback={null}>
            <Rock geometry={block.object.geometry} />
          </Suspense>
        </Canvas>
      </div>
    </Card>
  );
}
