import {
    Alignment,
    Button,
    Card,
    Classes,
    Elevation,
    Navbar,
    NavbarDivider,
    NavbarGroup,
    NavbarHeading,
    Spinner,
} from "@blueprintjs/core";
import stylesBlueprint from "@blueprintjs/core/lib/css/blueprint.css";
import {useEffect, useState} from "react";
import {Canvas} from "@react-three/fiber";
import {ApiPromise, WsProvider} from "@polkadot/api";
import {Rock} from "../components/Rock";
import {OBJLoader} from "three-stdlib/loaders/OBJLoader.cjs";

const BLOCK_TO_LOAD = 8;

export function links() {
    return [
        {rel: "stylesheet", href: stylesBlueprint},
    ];
}

const rpc = {
    poscan: {
        pushMiningObject: {
            description: "Submit 3D object for mining.",
            params: [{
                name: "obj_id",
                type: "u64",
            }, {
                name: "obj",
                type: "String",
            }],
            type: "u64",
        },
        getMiningObject: {
            description: "Get and unpack 3D object from block.",
            params: [{
                name: "at",
                type: "BlockHash",
            }],
            type: "String",
        },
    },
}

const loadBlock = async (provider, hash) => {
    const api = await ApiPromise.create({provider: provider, rpc});
    let signedBlock;

    if (hash === undefined) {
        signedBlock = await api.rpc.chain.getBlock();
    } else {
        signedBlock = await api.rpc.chain.getBlock(hash);
    }
    const block = signedBlock.block;
    const blockHash = block.header.hash.toHex();
    const data = await api.rpc.poscan.getMiningObject(blockHash);
    return {
        "block": block,
        "hash": blockHash,
        "data": data,
    }
}

const loadBlocks = async (provider) => {
    const blocks = [];
    const block = await loadBlock(provider);
    blocks.push(block)
    for (let i = 0; i < BLOCK_TO_LOAD - 1; i++) {
        let parent_hash = blocks[blocks.length - 1].block.header.parentHash.toHex();
        let next_block = await loadBlock(provider, parent_hash);
        blocks.push(next_block);
    }
    return blocks;
};

export default function Index() {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // const wsProvider = new WsProvider("wss://rpc.3dpass.org");
        const wsProvider = new WsProvider("ws://127.0.0.1:9944");
        loadBlocks(wsProvider).then((loaded_blocks) => {
            loaded_blocks = loaded_blocks.map((block) => {
                const loader = new OBJLoader();
                block.object = loader.parse(block.data).children[0];
                return block;
            });
            setBlocks(loaded_blocks);
            setLoading(false);
        });
    }, []);

    return (
        <div>
            <Navbar>
                <NavbarGroup align={Alignment.LEFT}>
                    <NavbarHeading>3DP Explorer</NavbarHeading>
                    <NavbarDivider/>
                    <NavbarGroup>
                        <Button className={Classes.MINIMAL} icon="code-block" text="Blocks"/>
                    </NavbarGroup>
                </NavbarGroup>
            </Navbar>
            {loading && <Spinner className={"p-20"}/>}
            <div className={"grid gap-4 grid-cols-2 lg:grid-cols-4 p-4"}>
                {!loading && blocks.map((block) => (
                    <div key={block.hash}>
                        <Card elevation={Elevation.TWO}>
                            <div className={"mb-3"}>Block: {block.block.header.number.toNumber()}</div>
                            <div style={{height: 300}}>
                                <Canvas camera={{fov: 30, near: 0.1, far: 1000, position: [0, 0, 10]}}>
                                    <Rock geometry={block.object.geometry}/>
                                </Canvas>
                            </div>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    );
}
