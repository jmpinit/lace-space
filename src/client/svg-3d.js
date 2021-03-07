import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import * as THREE from 'three';

function loadSVG(url) {
  const loader = new SVGLoader();

  return new Promise((fulfill, reject) => {
    loader.load(url, (data) => {
      const { paths } = data;

      const group = new THREE.Group();
      group.scale.y *= -1;

      for (let i = 0; i < paths.length; i += 1) {
        const path = paths[i];

        /*
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

          console.log(shape);

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

export default loadSVG;
