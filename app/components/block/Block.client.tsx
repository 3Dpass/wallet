import { Suspense } from "react";
import { Link } from "@remix-run/react";
import { Button, Card, Classes, Elevation, Icon } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import Object from "./Object.client";
import TitledValue from "../common/TitledValue";
import type { IBlock } from "../types";
import { Buffer } from "buffer";
import { useAtomValue } from "jotai";
import { bestNumberFinalizedAtom } from "../../atoms";
import { Canvas } from "@react-three/fiber";

interface IProps {
  block: IBlock;
}

export default function Block({ block }: IProps) {
  const bestNumberFinalized = useAtomValue(bestNumberFinalizedAtom);
  const objectHashAlgo = Buffer.from(block.objectHashAlgo, "hex").toString("utf8");
  const blockNumber = block.block.header.number.toNumber();
  const objectBase64 = Buffer.from(block.objectObj).toString("base64");
  const downloadUrl = `data:text/plain;base64,${objectBase64}`;
  const downloadFilename = `3dpass-${block.block.header.number.toString()}.obj`;

  return (
    <Card elevation={Elevation.ZERO}>
      <div className="flex justify-between items-start">
        <TitledValue
          title="Block"
          value={
            blockNumber <= bestNumberFinalized ? (
              <>
                <Link to={`/block/${blockNumber}`} target="_blank" rel="noopener noreferrer">
                  {blockNumber.toLocaleString()}
                </Link>{" "}
                <div className="small-title">✓ Finalized</div>
              </>
            ) : (
              <>
                {blockNumber.toLocaleString()}
                <div className="small-title">Not finalized</div>
              </>
            )
          }
        />
        <div className="flex gap-2">
          <a className={Classes.BUTTON} href={downloadUrl} download={downloadFilename}>
            <Icon icon="download" />
          </a>
          <Popover2
            content={
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
            }
          >
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
            <Object geometry={block.object3d.geometry} />
          </Suspense>
        </Canvas>
      </div>
    </Card>
  );
}
