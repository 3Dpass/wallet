import { Buffer } from "node:buffer";
import {
  Button,
  Card,
  Classes,
  Elevation,
  Icon,
  Popover,
} from "@blueprintjs/core";
import { Canvas } from "@react-three/fiber";
import { Link } from "@remix-run/react";
import { useAtomValue } from "jotai";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { bestNumberFinalizedAtom } from "../../atoms";
import TitledValue from "../common/TitledValue";
import type { IBlock } from "../types";
import ThreeDObject from "./ThreeDObject.client";

interface IProps {
  block: IBlock;
}

export default function Block({ block }: IProps) {
  const { t } = useTranslation();
  const bestNumberFinalized = useAtomValue(bestNumberFinalizedAtom);
  const objectHashAlgo = Buffer.from(block.objectHashAlgo, "hex").toString(
    "utf8"
  );
  const blockNumber = block.block.header.number.toNumber();
  const objectBase64 = Buffer.from(block.objectObj).toString("base64");
  const downloadUrl = `data:text/plain;base64,${objectBase64}`;
  const downloadFilename = `3dpass-${block.block.header.number.toString()}.obj`;

  return (
    <Card elevation={Elevation.ZERO}>
      <div className="flex justify-between items-start">
        <TitledValue
          title={t("root.lbl_block")}
          value={
            blockNumber <= bestNumberFinalized ? (
              <>
                <Link
                  to={`https://3dpscan.xyz/#/blocks/${blockNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {blockNumber.toLocaleString()}
                </Link>{" "}
                <div className="small-title">✓ {t("root.lbl_finalized")}</div>
              </>
            ) : (
              <>
                {blockNumber.toLocaleString()}
                <div className="small-title">
                  {t("root.lbl_block_not_finalized")}
                </div>
              </>
            )
          }
        />
        <div className="flex gap-2">
          <a
            className={Classes.BUTTON}
            href={downloadUrl}
            download={downloadFilename}
          >
            <Icon icon="download" />
          </a>
          <Popover
            content={
              <div className="p-4">
                {block.objectHashAlgo && (
                  <div className="font-mono mb-2">
                    {t("root.lbl_object_hash_algo")}{" "}
                    <strong>{objectHashAlgo}</strong>
                  </div>
                )}
                <code className="block text-xs">
                  {block.objectHashes.map((hash) => (
                    <div key={hash}>{hash}</div>
                  ))}
                </code>
              </div>
            }
          >
            <Button icon="info-sign" />
          </Popover>
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
            <ThreeDObject geometry={block.object3d.geometry} />
          </Suspense>
        </Canvas>
      </div>
    </Card>
  );
}
