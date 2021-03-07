// TODO: pass this in
const SVG_STYLE = {
  stroke: 'white',
  'stroke-width': '10',
};

function descendantOfElementType(el, tagName) {
  if (el.parentElement === null) {
    return false;
  }

  if (el.parentElement.tagName === tagName) {
    return true;
  }

  return descendantOfElementType(el.parentElement, tagName);
}

function elementFromPointUnderSVG(x, y) {
  const elementAtLocation = document.elementFromPoint(x,y);

  console.log('element is ', elementAtLocation);
  console.log(descendantOfElementType(elementAtLocation, 'svg'));
}

function editSVGElement(svgEl) {
  const propertyPane = document.getElementById('svg-properties');
  const propertyTable = propertyPane.getElementsByTagName('table')[0];

  propertyTable.innerHTML = '';

  function makeEl(tagName) {
    return document.createElement(tagName);
  }

  const deleteBtn = makeEl('button');
  deleteBtn.innerHTML = 'Delete';
  deleteBtn.onclick = () => {
    svgEl.parentElement.removeChild(svgEl);
    propertyTable.innerHTML = '';
  };
  propertyTable.appendChild(deleteBtn);

  function createValueEditor(el, attrName) {
    const row = makeEl('tr');

    const labelCol = makeEl('td');
    labelCol.innerHTML = attrName;
    row.appendChild(labelCol);

    const valueInput = makeEl('input');
    valueInput.setAttribute('type', 'text');

    if (attrName === 'innerHTML') {
      valueInput.value = el.innerHTML;
      valueInput.onchange = () => { el.innerHTML = valueInput.value; };
    } else {
      valueInput.value = el.getAttribute(attrName);
      valueInput.onchange = () => el.setAttribute(attrName, valueInput.value);
    }

    const valueCol = makeEl('td');
    valueCol.appendChild(valueInput);
    row.appendChild(valueCol);

    return row;
  }

  function createValueEditors(el, attrNames) {
    attrNames
      .map((attrName) => createValueEditor(el, attrName))
      .forEach((editor) => {
        propertyTable.appendChild(editor);
      });
  }

  switch (svgEl.tagName) {
    case 'line':
      createValueEditors(svgEl, ['x1', 'y1', 'x2', 'y2']);
      break;
    case 'circle':
      createValueEditors(svgEl, ['cx', 'cy', 'r']);
      break;
    case 'rect':
      createValueEditors(svgEl, ['x', 'y', 'width', 'height']);
      break;
    default:
      console.log('User clicked on unknown element', svgEl.tagName);
  }
}

function selectSVGElement(el) {
  editSVGElement(el);
}

function init() {
  const lineBtnEl = document.getElementById('btn-make-line');
  const circleBtnEl = document.getElementById('btn-make-circle');
  const rectBtnEl = document.getElementById('btn-make-rect');

  const svgToEdit = document.getElementById('svg-to-edit');

  function createSVGElToEdit(tagName) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    Object.entries(SVG_STYLE).forEach(([attrName, value]) => el.setAttribute(attrName, value));
    el.onclick = () => selectSVGElement(el);
    svgToEdit.appendChild(el);
    return el;
  }

  lineBtnEl.onclick = () => {
    const line = createSVGElToEdit('line');

    line.setAttribute('x1', '-100');
    line.setAttribute('y1', '-100');
    line.setAttribute('x2', '100');
    line.setAttribute('y2', '100');
  };

  circleBtnEl.onclick = () => {
    const circle = createSVGElToEdit('circle');

    circle.setAttribute('cx', '0');
    circle.setAttribute('cy', '0');
    circle.setAttribute('r', '50');
  };

  rectBtnEl.onclick = () => {
    const rect = createSVGElToEdit('rect');
    rect.setAttribute('x', '-50');
    rect.setAttribute('y', '-50');
    rect.setAttribute('width', '100');
    rect.setAttribute('height', '100');
  };
}

function hookSVG(svg) {
  Array.from(svg.children).forEach((child) => {
    child.onclick = () => editSVGElement(child);
    hookSVG(child);
  });
}

module.exports = {
  init,
  hookSVG,
};
