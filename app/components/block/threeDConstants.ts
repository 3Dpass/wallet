import * as THREE from "three";

const TEXTURE_URL = "/textures/space.jpg";
const TEXTURE_URLS = Array(6).fill(TEXTURE_URL);

export const createCubeTexture = () => {
	const cubeTextureLoader = new THREE.CubeTextureLoader();
	const textureCube = cubeTextureLoader.load(TEXTURE_URLS);
	textureCube.wrapS = THREE.MirroredRepeatWrapping;
	textureCube.wrapT = THREE.MirroredRepeatWrapping;
	textureCube.mapping = THREE.CubeRefractionMapping;
	return textureCube;
};
