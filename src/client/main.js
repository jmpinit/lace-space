import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as ui from './ui';
import loadSVG from './svg-3d';
import loadGLTF from './gltf';

const SVG_SCALE = 0.01;
const PAGE_WIDTH = 1000;
const PAGE_HEIGHT = 1000;

let scene;
let camera;
let cameraControls;
let renderer;
let currentPage;

let networkStructure;

function updateCameraAspect() {
  camera.aspect = window.innerWidth / window.innerHeight;

  if (window.innerWidth > window.innerHeight) {
    camera.left = (-PAGE_WIDTH / 2) * SVG_SCALE * camera.aspect;
    camera.right = (PAGE_WIDTH / 2) * SVG_SCALE * camera.aspect;
  } else {
    camera.top = (-PAGE_HEIGHT / 2) * SVG_SCALE * camera.aspect;
    camera.bottom = (PAGE_HEIGHT / 2) * SVG_SCALE * camera.aspect;
  }

  camera.updateProjectionMatrix();
}

function onWindowResize() {
  updateCameraAspect();

  renderer.setSize(window.innerWidth, window.innerHeight);

  const svgToEdit = document.getElementById('svg-to-edit');
  svgToEdit.setAttribute('width', window.innerWidth.toString());
  svgToEdit.setAttribute('height', window.innerHeight.toString());
}

function pageInfo(structure, uuid) {
  if (!(uuid in structure.pages)) {
    throw new Error('Page with UUID does not exist in structure');
  }

  const {
    svg,
    position_x: posX,
    position_y: posY,
    position_z: posZ,
    normal_x: normX,
    normal_y: normY,
    normal_z: normZ,
  } = structure.pages[uuid];

  return {
    uuid,
    position: {
      x: posX,
      y: posY,
      z: posZ,
    },
    normal: {
      x: normX,
      y: normY,
      z: normZ,
    },
    svg,
  };
}

function lookAtPage(structure, uuid) {
  const info = pageInfo(structure, uuid);

  // Move the camera to look at the page
  const svgObj = scene.getObjectByName(uuid);
  const normal = new THREE.Vector3(info.normal.x, info.normal.y, info.normal.z).normalize();
  camera.position.copy(normal.clone().multiplyScalar(10).add(svgObj.position));
  camera.lookAt(svgObj.position);

  // Target the camera controls on the page
  cameraControls.target.copy(svgObj.position);
}

function editPage(structure, uuid) {
  const info = pageInfo(structure, uuid);

  // Load the SVG into the editor
  const svgToEdit = document.getElementById('svg-to-edit');
  svgToEdit.innerHTML = info.svg;
  ui.hookSVG(svgToEdit);

  // Set the camera to look at the page in the 3D scene
  lookAtPage(structure, uuid);

  currentPage = info;
}

async function loadPage(structure, uuid) {
  if (!(uuid in structure.pages)) {
    throw new Error('Page with given UUID does not exist in structure');
  }

  const info = pageInfo(structure, uuid);

  // Load the SVG into the scene
  const outerSvg = `<svg viewBox="-${PAGE_WIDTH / 2} -${PAGE_HEIGHT / 2} ${PAGE_WIDTH} ${PAGE_HEIGHT}">${info.svg}</svg>`;
  const dataUri = `data:text/plain;base64,${btoa(outerSvg)}`;
  const svgObj = await loadSVG(dataUri);
  svgObj.name = uuid;
  scene.add(svgObj);

  // SVG coordinate scale to 3D scene coordinate scale
  svgObj.scale.multiplyScalar(SVG_SCALE);

  // Position SVG in scene
  svgObj.position.x = info.position.x;
  svgObj.position.y = info.position.y;
  svgObj.position.z = info.position.z;

  // Orient SVG according to its normal
  const normal = new THREE.Vector3(info.normal.x, info.normal.y, info.normal.z).normalize();
  svgObj.lookAt(new THREE.Vector3().addVectors(svgObj.position, normal));

  return info;
}

function loadStructure() {
  fetch('/structure')
    .then((res) => res.json())
    .then((structure) => {
      // FIXME: remove global
      networkStructure = structure;

      const pagePromises = [];
      for (const uuid of Object.keys(structure.pages)) {
        pagePromises.push(loadPage(structure, uuid));
      }

      return Promise.all(pagePromises);
    })
    .then((pages) => editPage(networkStructure, pages[1].uuid));
}

async function init() {
  const container = document.getElementById('3d');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  // camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
  // camera.position.set(0, 0, 200);
  camera = new THREE.OrthographicCamera(
    (-PAGE_WIDTH / 2) * SVG_SCALE,
    (PAGE_WIDTH / 2) * SVG_SCALE,
    (PAGE_HEIGHT / 2) * SVG_SCALE,
    (-PAGE_HEIGHT / 2) * SVG_SCALE,
    1,
    1000,
  );

  // Lighting

  const skyColor = 0xB1E1FF; // light blue
  const groundColor = 0xB97A20; // brownish orange
  const intensity = 50;
  const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
  scene.add(light);

  // Window resize handler keeps renderer filling the entire page
  window.addEventListener('resize', onWindowResize);

  // Renderer

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
  updateCameraAspect();

  // Camera controls

  cameraControls = new OrbitControls(camera, renderer.domElement);
  cameraControls.screenSpacePanning = true;
  cameraControls.minZoom = 0.5;
  cameraControls.maxZoom = 2;

  // Content
  scene.add(await loadGLTF('models/out_main.gltf'));
  loadStructure();
}

function render() {
  renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

const saveBtn = document.getElementById('save-page');
saveBtn.onclick = () => {
  const svgToEdit = document.getElementById('svg-to-edit');
  const svg = svgToEdit.innerHTML;

  const newPage = {
    ...currentPage,
    svg,
  };

  fetch('/page', {
    method: 'PUT',
    headers: {
      'Content-type': 'application/json',
    },
    body: JSON.stringify(newPage),
  });
};

// Entrypoint
ui.init();
init()
  .then(() => animate());
