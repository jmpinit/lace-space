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

const svg1 = `<svg width="100" height="100">
  <rect width="50" height="50"/>
</svg>`;

const svg2 = `<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="none" stroke="black" stroke-width="3"/>
</svg>`;

db.serialize(() => {
  db.run('DELETE FROM pages');
  db.run('DELETE FROM edges');

  const createPage = db.prepare('INSERT INTO pages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  createPage.run(uuid.v4(), Date.now(), 'god', svg1, 0, 0, 0, 0, 1, 0, 0);
  createPage.run(uuid.v4(), Date.now(), 'god', svg2, 1, 0, 0, 0, 1, 0, 0);
  createPage.finalize();
});
