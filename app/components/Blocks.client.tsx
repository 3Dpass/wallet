import { useAtomValue } from "jotai";
import { blocksAtom } from "../atoms";
import Block from "./block/Block.client";

export default function Blocks() {
  const blocks = useAtomValue(blocksAtom);

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
      {blocks.map((block) => (
        <div key={block.blockHash}>
          <Block block={block} />
        </div>
      ))}
    </div>
  );
}
