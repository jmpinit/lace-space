import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

function loadGLTF(url) {
  const loader = new GLTFLoader();

  return new Promise((fulfill, reject) => {
    loader.load(
      url,
      (gltf) => {
        fulfill(gltf.scene);
      },
      // called while loading is progressing
      (xhr) => {
        console.log(`${((xhr.loaded / xhr.total) * 100)}% loaded`);
      },
      // called when loading has errors
      (error) => {
        console.log('An error happened', error);
      },
    );
  });
}

export default loadGLTF;
