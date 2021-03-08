const path = require('path');
const fs = require('fs');
const https = require('https');
const uuid = require('uuid');
const express = require('express');
const sqlite3 = require('sqlite3');
const Mustache = require('mustache');

const PORT = 8000;

const db = new sqlite3.Database(path.join(__dirname, '../../wiki.db'));

const app = express();
app.use(express.json());
app.use(express.static('public'));

function createPage(author, svg, position, normal) {
  const pageUUID = uuid.v4();

  const createPageQuery = db.prepare('INSERT INTO pages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  createPageQuery.run(pageUUID, Date.now(), author, svg,
    position.x,
    position.y,
    position.z,
    normal.x,
    normal.y,
    normal.z,
    0,
  );

  createPageQuery.finalize();

  return pageUUID;
}

function updatePage(pageUUID, svg) {
  const updatePageQuery = db.prepare('UPDATE pages SET svg = ? WHERE uuid = ?');
  updatePageQuery.run(svg, pageUUID);
  updatePageQuery.finalize();
}

function createEdge(author, startUUID, endUUID) {
  const edgeUUID = uuid.v4();

  const createEdgeQuery = db.prepare('INSERT INTO edges VALUES (?, ?, ?, ?, ?, ?)');
  createEdgeQuery.run(edgeUUID, Date.now(), author, startUUID, endUUID, 0);

  createEdgeQuery.finalize();

  return edgeUUID;
}

function pageExists(pageUUID) {
  const pageExistsQuery = db.prepare('SELECT null FROM pages WHERE uuid = ?');

  return new Promise((fulfill, reject) => {
    pageExistsQuery.all(pageUUID, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      fulfill(rows.length > 0);
    });
  });
}

app.get('/', async (req, res) => {
  const homepageUUID = await new Promise((fulfill, reject) => {
    db.each('SELECT * FROM pages LIMIT 1', (err, row) => {
      if (err) {
        reject();
        return;
      }

      const { uuid: pageUUID } = row;

      fulfill(pageUUID);
    });
  });

  res.redirect(`/page/${homepageUUID}`);
});

app.get('/structure', async (req, res) => {
  const structure = { pages: {}, edges: {} };

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

  await new Promise((fulfill, reject) => {
    db.each('SELECT * FROM edges', (err, row) => {
      if (err) {
        reject();
        return;
      }

      if (row.deleted === 0) {
        const { uuid, creation_time, author_uuid, deleted, ...edgeInfo } = row;
        edgeInfo.uuid = uuid;
        structure.edges[uuid] = edgeInfo;
      }
    }, () => fulfill());
  });

  res.json(structure);
});

function readFile(filename) {
  return new Promise((fulfill, reject) => {
    fs.readFile(filename, 'utf-8', (err, data) => {
      if (err) {
        reject(err);
      }

      fulfill(data);
    });
  });
}

app.get('/page/:uuid', async (req, res) => {
  const appTemplate = await readFile(path.join(__dirname, '../../templates/app.stache'));

  if (!await pageExists(req.params.uuid)) {
    res.redirect('/');
    return;
  }

  res.send(Mustache.render(appTemplate, { pageUUID: req.params.uuid }));
});

app.get('/viewer', async (req, res) => {
  const appTemplate = await readFile(path.join(__dirname, '../../templates/app.stache'));
  res.send(Mustache.render(appTemplate, { pageUUID: undefined }));
});

app.post('/page', (req, res) => {
  // TODO: fully validate

  const { origin, position, normal, svg } = req.body;

  // TODO: Normalize normal

  // TODO: Enforce position distance constraint
  // TODO: Clean/validate SVG contents

  const pageUUID = createPage('god', svg, position, normal);

  if (origin !== undefined) {
    createEdge('god', origin, pageUUID);
  }

  res.json({ uuid: pageUUID });
});

app.put('/page', (req, res) => {
  // TODO: fully validate

  const { uuid: pageUUID, svg } = req.body;

  updatePage(pageUUID, svg);

  res.send('ok');
});

const options = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt'),
};

const server = https.createServer(options, app);
server.listen(PORT, () => console.log(`http://localhost:${PORT}`));

// FIXME: remove
// Initialize the database with some sample pages
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
    svg: '',
    //svg: '<rect x="-500" y="-500" width="1000" height="1000" fill="none" stroke="green" stroke-width="10"/>'
    //   + '<circle cx="0" cy="0" r="500" fill="none" stroke="green" stroke-width="10"/>',
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

  //createPage('god', pageTopLeaf.svg, pageTopLeaf.position, pageTopLeaf.normal);
  createPage('god', pagePCB.svg, pagePCB.position, pagePCB.normal);
  //createPage('god', pageEraser.svg, pageEraser.position, pageEraser.normal);
});
