import { useEffect, useState, lazy, Suspense } from "react";
import { Link } from "@remix-run/react";
import { Button, Card, Classes, Elevation, Icon } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import Rock from "./Rock.client";
import TitledValue from "../common/TitledValue";
import type { IBlock } from "../types";
import { Buffer } from "buffer";
import { useAtom } from "jotai";
import { bestNumberFinalizedAtom } from "../../atoms";

const Canvas = lazy(() => import("@react-three/fiber").then((module) => ({ default: module.Canvas })));

interface IProps {
  block: IBlock;
}

export default function Block({ block }: IProps) {
  const [bestNumberFinalizedd] = useAtom(bestNumberFinalizedAtom);
  const bestNumberFinalized = parseInt(bestNumberFinalizedd.toString().replace(/,/g, ""));
  const objectHashAlgo = Buffer.from(block.objectHashAlgo, "hex").toString("utf8");
  const objectHashPopover = (
    <div className="p-4">
      {block.objectHashAlgo && (
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
  const blockNumber = block.block.header.number.toNumber();
  const objectBase64 = Buffer.from(block.objectObj).toString("base64");
  const downloadUrl = `data:text/plain;base64,${objectBase64}`;
  const downloadFilename = `3dpass-${block.block.header.number.toString()}.obj`;

  const [isFinalized, setIsFinalized] = useState(false);

  useEffect(() => {
    setIsFinalized(blockNumber <= bestNumberFinalized);
  }, [bestNumberFinalized, blockNumber]);

  return (
    <Card elevation={Elevation.ZERO}>
      <div className="flex justify-between items-start">
        <TitledValue
          title="Block"
          value={
            isFinalized ? (
              <span>
                <Link to={`/block/${blockNumber}`} target="_blank" rel="noopener noreferrer">
                  {blockNumber}
                </Link>{" "}
                <TitledValue title="Finalized" />
              </span>
            ) : (
              <span>
                {blockNumber} <TitledValue title="not Finalized" />
              </span>
            )
          }
        />
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
            position: [0, 0, 2],
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
