const path = require('path');
const http = require('http');
const uuid = require('uuid');
const express = require('express');
const sqlite3 = require('sqlite3');

const PORT = 8000;

const db = new sqlite3.Database(path.join(__dirname, '../../wiki.db'));

const app = express();
app.use(express.static('public'));

app.get('/structure', async (req, res) => {
  const structure = { pages: [], edges: [] };

  await new Promise((fulfill, reject) => {
    db.each('SELECT * FROM pages', (err, row) => {
      if (err) {
        reject();
        return;
      }

      if (row.deleted === 0) {
        const { uuid, creation_time, author_uuid, deleted, ...pageInfo } = row;
        structure.pages.push(pageInfo);
      }
    }, () => fulfill());
  });

  res.json(structure);
});

const server = http.createServer(app);
server.listen(PORT, () => console.log(`http://localhost:${PORT}`));

// Connect
// Delete all pages and edges
// Create two new pages
// Create edge linking them

const svg1 = `<svg width="10" height="10">
  <rect width="10" height="10"/>
</svg>`;

const svg2 = `<svg viewBox="-500 -500 500 500" width="1000" height="1000">
  <circle cx="0" cy="0" r="500" fill="none" stroke="green" stroke-width="10"/>
</svg>`;

db.serialize(() => {
  db.run('DELETE FROM pages');
  db.run('DELETE FROM edges');

  const createPage = db.prepare('INSERT INTO pages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  createPage.run(uuid.v4(), Date.now(), 'god', svg2,
    // Position
    -0.581598,
    34.4643,
    7.50983,
    // Normal
    0.419571,
    0.232605,
    0.877414,
    // Deleted
    0);

  // createPage.run(uuid.v4(), Date.now(), 'god', svg2, 1, 0, 0, 0, 1, 0, 0);
  createPage.finalize();
});
