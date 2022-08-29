import { lazy, Suspense } from "react";
import { Button, Card, Classes, Elevation, Icon } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import Rock from "./Rock.client";
import TitledValue from "../common/TitledValue";
import type { IBlock } from "../types";
import { Buffer } from "buffer";

const Canvas = lazy(() => import("@react-three/fiber").then((module) => ({ default: module.Canvas })));

interface IProps {
  block: IBlock;
}

export default function Block({ block }: IProps) {
  const objectHashAlgo = Buffer.from(block.objectHashHeader, "hex").toString("utf8");
  const objectHashPopover = (
    <div className="p-4">
      {block.objectHashHeader && (
        <div className="font-mono mb-2">
          Object Hash Algo: <strong>{objectHashAlgo}</strong>
        </div>
      )}
      <code className="block text-xs">
        {block.objectHashes.map((hash, index) => {
          return <div key={index}>{hash}</div>;
        })}
      </code>
    </div>
  );
  const objectBase64 = Buffer.from(block.objectObj).toString("base64");
  const downloadUrl = `data:text/plain;base64,${objectBase64}`;
  const downloadFilename = `3dpass-${block.block.header.number.toString()}.obj`;

  return (
    <Card elevation={Elevation.FOUR}>
      <div className="flex justify-between items-start">
        <TitledValue title="Block" value={block.block.header.number.toHuman()} />
        <div className="flex gap-2">
          <a className={Classes.BUTTON} href={downloadUrl} download={downloadFilename}>
            <Icon icon="download" />
          </a>
          <Popover2 content={objectHashPopover}>
            <Button icon="info-sign" />
          </Popover2>
        </div>
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
            <Rock geometry={block.object3d.geometry} />
          </Suspense>
        </Canvas>
      </div>
    </Card>
  );
}
