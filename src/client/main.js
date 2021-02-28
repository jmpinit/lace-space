import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as ui from './ui';

let scene;
let camera;
let renderer;

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  const svgToEdit = document.getElementById('svg-to-edit');
  svgToEdit.setAttribute('width', window.innerWidth.toString());
  svgToEdit.setAttribute('height', window.innerHeight.toString());
}

function loadSVG(url) {
  const loader = new SVGLoader();

  return new Promise((fulfill, reject) => {
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

        /*
        for (let j = 0; j < shapes.length; j += 1) {
          const shape = shapes[j];

          const geometry = new THREE.ShapeGeometry(shape);
          const mesh = new THREE.Mesh(geometry, fillMaterial);

          group.add(mesh);
        }
        */

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

      fulfill(group);
    });
  });
}

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

async function init() {
  const container = document.getElementById('3d');

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
  const mainModel = await loadGLTF('models/out_main.gltf');
  scene.add(mainModel);

  fetch('/structure')
    .then((res) => res.json())
    .then(async (structure) => {
      const {
        svg,
        position_x: posX,
        position_y: posY,
        position_z: posZ,
        normal_x: normX,
        normal_y: normY,
        normal_z: normZ,
      } = structure.pages[0];

      console.log(structure.pages[0]);

      const dataUri = `data:text/plain;base64,${btoa(svg)}`;
      const svgObj = await loadSVG(dataUri);

      /*
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const svgObj = new THREE.Mesh(geometry, material);
      */

      svgObj.scale.x = 0.01;
      svgObj.scale.y = 0.01;
      svgObj.scale.z = 0.01;

      svgObj.position.x = posX;
      svgObj.position.y = posY;
      svgObj.position.z = posZ;

      const normal = new THREE.Vector3(normX, normY, normZ);
      svgObj.lookAt(new THREE.Vector3().addVectors(svgObj.position, normal));

      scene.add(svgObj);
    });
}

function render() {
  renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

// Entrypoint

ui.init();
init()
  .then(() => animate());
