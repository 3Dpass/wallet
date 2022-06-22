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

const loadBlocks = async () => {
    const {ApiPromise, WsProvider} = require("@polkadot/api");
    // const wsProvider = new WsProvider("wss://rpc.3dpass.org");
    const wsProvider = new WsProvider("ws://127.0.0.1:9944");
    const api = await ApiPromise.create({provider: wsProvider, rpc});

    console.log(api.rpc.chain);
    const signedBlock = await api.rpc.chain.getBlock();
    const blockHash = signedBlock.block.header.hash.toHex();
    const data = await api.rpc.poscan.getMiningObject(blockHash);

    return [{
        number: signedBlock.block.header.number.toNumber(),
        hash: blockHash,
        data: data,
    }];
};

export default function Index() {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const OBJLoader = import("three/examples/jsm/loaders/OBJLoader.js");
        OBJLoader.then((module) => {
            loadBlocks().then((loaded_blocks) => {
                loaded_blocks = loaded_blocks.map((block) => {
                    const loader = new module.OBJLoader();
                    block.object = loader.parse(block.data);
                    return block;
                });
                setBlocks(loaded_blocks);
                setLoading(false);
            });
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
            <div className={"grid gap-2 grid-cols-4 p-4"}>
                {loading && <Spinner style={{margin: 50}}/>}
                {!loading && blocks.map((block) => (
                    <div key={block.hash}>
                        <Card elevation={Elevation.TWO}>
                            <h3>Block: {block.number}</h3>
                            <div style={{height: 300}}>
                                <Canvas>
                                    <ambientLight intensity={0.5}/>
                                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1}/>
                                    <pointLight position={[-10, -10, -10]}/>
                                    <mesh>
                                        <primitive object={block.object} position={[0, 0, -1]}/>
                                    </mesh>
                                </Canvas>
                            </div>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    );
}
