import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as ui from './editor-ui';
import loadSVG from './svg-3d';
import loadGLTF from './gltf';

const SVG_SCALE = 0.01;
const PAGE_WIDTH = 1000;
const PAGE_HEIGHT = 1000;
const EDIT_DISTANCE = 10;

let scene;
let camera;
let cameraControls;
let cursorObj;
let renderer;
let currentPage;
const edges = {};

let networkStructure = { pages: {}, edges: {} };

function vector3FromXYZ(pos) {
  return new THREE.Vector3(pos.x, pos.y, pos.z);
}

function updateCameraByViewport() {
  camera.aspect = window.innerWidth / window.innerHeight;

  const d = camera.position.distanceTo(cameraControls.target);
  const h = window.innerWidth > window.innerHeight
    ? PAGE_HEIGHT * SVG_SCALE
    : (PAGE_HEIGHT * SVG_SCALE) / camera.aspect;

  camera.fov = (180 * 2 * Math.atan(h / (2 * d))) / Math.PI;

  camera.updateProjectionMatrix();
}

function onWindowResize() {
  updateCameraByViewport();

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

function edgeInfo(structure, uuid) {
  if (!(uuid in structure.edges)) {
    throw new Error('Edge with UUID does not exist in structure');
  }

  const {
    start_page_uuid: start,
    end_page_uuid: end,
  } = structure.edges[uuid];

  return {
    uuid,
    start,
    end,
  };
}

function lookAtPage(structure, uuid) {
  const info = pageInfo(structure, uuid);

  // Move the camera to look at the page
  const svgObj = scene.getObjectByName(uuid);
  const normal = vector3FromXYZ(info.normal).normalize();
  const pageCamPos = normal.clone()
    // Offset from the page
    .multiplyScalar(EDIT_DISTANCE)
    // Move to the page
    .add(svgObj.position);
  camera.position.copy(pageCamPos);
  camera.lookAt(svgObj.position);

  // Target the camera controls on the page
  cameraControls.target.copy(svgObj.position);

  // Hide the 3D object
  svgObj.visible = false;

  updateCameraByViewport();
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
  const normal = vector3FromXYZ(info.normal).normalize();
  svgObj.lookAt(new THREE.Vector3().addVectors(svgObj.position, normal));

  return info;
}

async function loadEdge(structure, uuid) {
  if (!(uuid in structure.edges)) {
    throw new Error('Edge with given UUID does not exist in structure');
  }

  const { start: startUUID, end: endUUID } = edgeInfo(structure, uuid);
  const start = pageInfo(structure, startUUID);
  const end = pageInfo(structure, endUUID);

  const startPos = vector3FromXYZ(start.position);
  const endPos = vector3FromXYZ(end.position);

  const edgeLength = endPos.clone()
    .sub(startPos)
    .length();

  const geometry = new THREE.CylinderGeometry(0.1, 0.1, edgeLength, 3);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const edgeCylinder = new THREE.Mesh(geometry, material);
  edgeCylinder.position.z = edgeLength / 2;
  edgeCylinder.rotation.x = Math.PI / 2;
  const edgeObj = new THREE.Group();
  edgeObj.add(edgeCylinder);
  edgeObj.position.copy(startPos);
  edgeObj.lookAt(endPos);

  edgeObj.name = uuid;
  edges[uuid] = edgeObj;
  scene.add(edgeObj);
}

function loadStructure() {
  return fetch('/structure')
    .then((res) => res.json())
    .then((structure) => {
      Object.keys(networkStructure.pages).concat(Object.keys(networkStructure.edges))
        .filter((uuid) => !(uuid in structure.pages) && !(uuid in structure.edges))
        .map((uuid) => scene.getObjectByName(uuid))
        .forEach((obj) => scene.remove(obj));

      const objPromises = [];

      for (const uuid of Object.keys(structure.pages)) {
        objPromises.push(loadPage(structure, uuid));
      }

      for (const uuid of Object.keys(structure.edges)) {
        objPromises.push(loadEdge(structure, uuid));
      }

      networkStructure = structure;

      return Promise.all(objPromises);
    });
}

async function init() {
  const container = document.getElementById('3d');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
  /*
  camera = new THREE.OrthographicCamera(
    (-PAGE_WIDTH / 2) * SVG_SCALE,
    (PAGE_WIDTH / 2) * SVG_SCALE,
    (PAGE_HEIGHT / 2) * SVG_SCALE,
    (-PAGE_HEIGHT / 2) * SVG_SCALE,
    1,
    1000,
  );
  */

  // Lighting

  const skyColor = 0xB1E1FF; // light blue
  const groundColor = 0xB97A20; // brownish orange
  const intensity = 50;
  const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
  scene.add(light);

  (() => {
    const geometry = new THREE.SphereGeometry(1, 8, 8);
    const wireframe = new THREE.WireframeGeometry(geometry);
    cursorObj = new THREE.LineSegments(wireframe);
    //cursorObj.material.depthTest = false;
    cursorObj.material.opacity = 0.25;
    cursorObj.material.transparent = true;
    scene.add(cursorObj);

    cursorObj.visible = false;
  })();

  // Window resize handler keeps renderer filling the entire page
  window.addEventListener('resize', onWindowResize);

  // Renderer

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Camera controls

  cameraControls = new OrbitControls(camera, renderer.domElement);
  cameraControls.screenSpacePanning = true;

  // Content
  scene.add(await loadGLTF('/models/out_main.gltf'));
  loadStructure()
    .then((pages) => {
      if (window.lacespace === undefined) {
        // Setup for viewing overall model
        setInterval(() => loadStructure(), 1000);
        changeMode('view');
      } else {
        cameraControls.minZoom = 0.5;
        cameraControls.maxZoom = 2;
        cameraControls.enabled = false;
        editPage(networkStructure, window.lacespace.currentPage);
      }
    });
}

function render() {
  const normalVector3 = camera.position.clone()
    .sub(cameraControls.target)
    .normalize();

  cursorObj.position.copy(normalVector3.clone()
    .multiplyScalar(-EDIT_DISTANCE)
    .add(camera.position));

  renderer.render(scene, camera);
}

function animate() {
  cameraControls.update();
  requestAnimationFrame(animate);
  render();
}

function makeVisible(id, isVisible) {
  const el = document.getElementById(id);
  el.setAttribute('style', isVisible ? '' : 'display: none');
}

function changeMode(modeName) {
  switch (modeName) {
    case 'edit':
    default:
      makeVisible('btn-move', true);
      makeVisible('btn-back', false);
      makeVisible('btn-new', false);
      makeVisible('btn-save', true);

      ['btn-make-line', 'btn-make-circle', 'btn-make-rect']
        .forEach((name) => makeVisible(name, true));

      makeVisible('svg-to-edit', true);
      editPage(networkStructure, currentPage.uuid);
      cameraControls.enabled = false;

      cursorObj.visible = false;

      break;
    case 'move':
      makeVisible('btn-move', false);
      makeVisible('btn-back', true);
      makeVisible('btn-new', true);
      makeVisible('btn-save', false);

      ['btn-make-line', 'btn-make-circle', 'btn-make-rect']
        .forEach((name) => makeVisible(name, false));

      makeVisible('svg-to-edit', false);
      scene.getObjectByName(currentPage.uuid).visible = true;
      cameraControls.enabled = true;

      cursorObj.visible = true;

      break;
    case 'view':
      cameraControls.autoRotate = true;
      cameraControls.target.x = 0;
      cameraControls.target.y = 0;
      cameraControls.target.z = 0;

      camera.position.set(0, 20, 130);
      cameraControls.update();

      makeVisible('btn-move', false);
      makeVisible('btn-back', false);
      makeVisible('btn-new', false);
      makeVisible('btn-save', false);

      ['btn-make-line', 'btn-make-circle', 'btn-make-rect']
        .forEach((name) => makeVisible(name, false));

      makeVisible('svg-to-edit', false);

      break;
  }
}

const moveBtn = document.getElementById('btn-move');
moveBtn.onclick = () => {
  changeMode('move');
  window.history.pushState({ mode: 'edit' }, 'New Page');
};

const backBtn = document.getElementById('btn-back');
backBtn.onclick = () => window.history.back();

window.onpopstate = (event) => {
  changeMode(event.state.mode);
};

const saveBtn = document.getElementById('btn-save');
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
  })
    .then(() => loadStructure())
    .then(() => lookAtPage(networkStructure, currentPage.uuid));
};

const newPageBtn = document.getElementById('btn-new');
newPageBtn.onclick = () => {
  const normalVector3 = camera.position.clone()
    .sub(cameraControls.target)
    .normalize();

  const positionVector3 = normalVector3.clone()
    .multiplyScalar(-EDIT_DISTANCE)
    .add(camera.position);

  const normal = {
    x: normalVector3.x,
    y: normalVector3.y,
    z: normalVector3.z,
  };

  const position = {
    x: positionVector3.x,
    y: positionVector3.y,
    z: positionVector3.z,
  };

  fetch('/page', {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
    },
    body: JSON.stringify({
      origin: currentPage.uuid,
      position,
      normal,
      svg: '',
    }),
  })
    .then((res) => res.json())
    .then(async ({ uuid }) => {
      window.location.href = `/page/${uuid}`;
    });
};

window.addEventListener('click', (event) => {
  const mouse = new THREE.Vector2();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  const raycaster = new THREE.Raycaster();

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(Object.values(edges), true);

  intersects.forEach(({ object }) => {
    const uuid = object.parent.name;

    const info = edgeInfo(networkStructure, uuid);

    if (info.start === currentPage.uuid) {
      window.location.href = `/page/${info.end}`;
    } else if (info.end === currentPage.uuid) {
      window.location.href = `/page/${info.start}`;
    }
  })
});

// Entrypoint
ui.init();
init()
  .then(() => animate());
