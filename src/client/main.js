import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as ui from './ui';
import loadSVG from './svg-3d';
import loadGLTF from './gltf';

const SVG_SCALE = 0.01;

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

async function init() {
  const container = document.getElementById('3d');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  //camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
  //camera.position.set(0, 0, 200);
  camera = new THREE.OrthographicCamera(
    -500 * SVG_SCALE,
    500 * SVG_SCALE,
    500 * SVG_SCALE,
    -500 * SVG_SCALE,
    1,
    1000,
  );

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

  // loadGLTF('models/out_framework.gltf.js');
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

      const svgToEdit = document.getElementById('svg-to-edit');
      svgToEdit.innerHTML = svg;
      ui.hookSVG(svgToEdit);

      const dataUri = `data:text/plain;base64,${btoa(svgToEdit.outerHTML)}`;
      const svgObj = await loadSVG(dataUri);

      /*
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const svgObj = new THREE.Mesh(geometry, material);
      */

      svgObj.scale.multiplyScalar(SVG_SCALE);

      svgObj.position.x = posX;
      svgObj.position.y = posY;
      svgObj.position.z = posZ;

      const normal = new THREE.Vector3(normX, normY, normZ).normalize();
      svgObj.lookAt(new THREE.Vector3().addVectors(svgObj.position, normal));

      scene.add(svgObj);

      camera.position.copy(normal.clone().multiplyScalar(10).add(svgObj.position));
      //camera.updateProjectionMatrix();
      console.log(camera.position);
      camera.lookAt(svgObj.position);
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

const saveBtn = document.getElementById('save-page');
saveBtn.onclick = () => {

};

ui.init();
init()
  .then(() => animate());
