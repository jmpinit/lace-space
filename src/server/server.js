const path = require('path');
const http = require('http');
const uuid = require('uuid');
const express = require('express');
const sqlite3 = require('sqlite3');

const PORT = 8000;

const db = new sqlite3.Database(path.join(__dirname, '../../wiki.db'));

const app = express();
app.use(express.json());
app.use(express.static('public'));

function createPage(author, svg, position, normal) {
  const createPageQuery = db.prepare('INSERT INTO pages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  createPageQuery.run(uuid.v4(), Date.now(), author, svg,
    position.x,
    position.y,
    position.z,
    normal.x,
    normal.y,
    normal.z,
    0,
  );

  createPageQuery.finalize();
}

function updatePage(pageUUID, svg) {
  const updatePageQuery = db.prepare('UPDATE pages SET svg = ? WHERE uuid = ?');
  updatePageQuery.run(svg, pageUUID);
  updatePageQuery.finalize();
}

app.get('/structure', async (req, res) => {
  const structure = { pages: {}, edges: [] };

  await new Promise((fulfill, reject) => {
    db.each('SELECT * FROM pages', (err, row) => {
      if (err) {
        reject();
        return;
      }

      if (row.deleted === 0) {
        const { uuid, creation_time, author_uuid, deleted, ...pageInfo } = row;
        pageInfo.uuid = uuid;
        structure.pages[uuid] = pageInfo;
      }
    }, () => fulfill());
  });

  res.json(structure);
});

app.get('/page/:uuid', (req, res) =>{
  console.log('req.params', req.params);
  res.send();
});

app.put('/page', (req, res) => {
  // TODO: fully validate

  const { uuid: pageUUID, svg } = req.body;

  updatePage(pageUUID, svg);

  res.send('ok');
});

const server = http.createServer(app);
server.listen(PORT, () => console.log(`http://localhost:${PORT}`));

db.serialize(() => {
  db.run('DELETE FROM pages');
  db.run('DELETE FROM edges');

  // Top leaf
  const pageTopLeaf = {
    position: {
      x: -0.581598,
      y: 34.4643,
      z: 7.50983,
    },
    normal: {
      x: 0.419571,
      y: 0.232605,
      z: 0.877414,
    },
    svg: '<rect x="-500" y="-500" width="1000" height="1000" fill="none" stroke="green" stroke-width="10"/>'
      + '<circle cx="0" cy="0" r="500" fill="none" stroke="green" stroke-width="10"/>',
  };

  const pagePCB = {
    position: {
      x: 27.2148,
      y: -16.0915,
      z: 21.4505,
    },
    normal: {
      x: 0.830587,
      y: -0.125743,
      z: 0.542507,
    },
    svg: '<rect x="-500" y="-500" width="1000" height="1000" fill="none" stroke="green" stroke-width="10"/>'
      + '<circle cx="0" cy="0" r="500" fill="none" stroke="green" stroke-width="10"/>',
  };

  const pageEraser = {
    position: {
      x: 3.55427,
      y: 27.6806,
      z: -12.8945,
    },
    normal: {
      x: 0.119286,
      y: 0.978212,
      z: -0.169919,
    },
    svg: '<rect x="-500" y="-500" width="1000" height="1000" fill="none" stroke="green" stroke-width="10"/>'
      + '<circle cx="0" cy="0" r="500" fill="none" stroke="green" stroke-width="10"/>',
  };

  createPage('god', pageTopLeaf.svg, pageTopLeaf.position, pageTopLeaf.normal);
  createPage('god', pagePCB.svg, pagePCB.position, pagePCB.normal);
  createPage('god', pageEraser.svg, pageEraser.position, pageEraser.normal);
});
