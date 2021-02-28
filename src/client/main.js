import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

let scene;
let camera;
let renderer;

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function loadSVG(url) {
  const loader = new SVGLoader();

  loader.load(url, (data) => {
    const { paths } = data;

    const group = new THREE.Group();
    group.scale.multiplyScalar(0.25);
    group.position.x = -70;
    group.position.y = 70;
    group.scale.y *= -1;

    for (let i = 0; i < paths.length; i += 1) {
      const path = paths[i];

      const fillColor = path.userData.style.fill;
      const fillMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setStyle(fillColor),
        opacity: path.userData.style.fillOpacity,
        transparent: path.userData.style.fillOpacity < 1,
        side: THREE.DoubleSide,
        depthWrite: true,
        wireframe: false,
      });

      const shapes = path.toShapes(true);

      for (let j = 0; j < shapes.length; j += 1) {
        const shape = shapes[j];

        const geometry = new THREE.ShapeGeometry(shape);
        const mesh = new THREE.Mesh(geometry, fillMaterial);

        group.add(mesh);
      }

      const strokeColor = path.userData.style.stroke;

      const strokeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setStyle(strokeColor),
        opacity: path.userData.style.strokeOpacity,
        transparent: path.userData.style.strokeOpacity < 1,
        side: THREE.DoubleSide,
        depthWrite: true,
        wireframe: false,
      });

      for (let j = 0, jl = path.subPaths.length; j < jl; j += 1) {
        const subPath = path.subPaths[j];
        const geometry = SVGLoader.pointsToStroke(subPath.getPoints(), path.userData.style);

        if (geometry) {
          const mesh = new THREE.Mesh(geometry, strokeMaterial);
          group.add(mesh);
        }
      }
    }

    scene.add(group);
  });
}

function loadGLTF(url) {
  const loader = new GLTFLoader();

  // Load a glTF resource
  loader.load(
    url,
    (gltf) => {
      gltf.scene.rotateY(-Math.PI / 4);
      scene.add(gltf.scene);

      /*
      gltf.scene.traverse((object) => {
        if (object.isMesh) {
          object.material = new THREE.MeshPhongMaterial();
        }
      });
      */
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
}

function init() {
  const container = document.getElementById('container');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(0, 0, 200);

  const skyColor = 0xB1E1FF; // light blue
  const groundColor = 0xB97A20; // brownish orange
  const intensity = 50;
  const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
  scene.add(light);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.screenSpacePanning = true;

  // Window resize handler keeps renderer filling the entire page
  window.addEventListener('resize', onWindowResize);

  // loadGLTF('models/out_framework.gltf');
  loadGLTF('models/out_main.gltf');

  fetch('/structure')
    .then((res) => res.json())
    .then((structure) => {
      const { svg } = structure.pages[1];
      const dataUri = `data:text/plain;base64,${btoa(svg)}`;
      loadSVG(dataUri);
    });
  const currentURL = 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Ghostscript_Tiger.svg';
  // loadSVG(currentURL);
}

function render() {
  renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

init();
animate();
