CREATE TABLE IF NOT EXISTS pages (
  uuid TEXT PRIMARY KEY,
  creation_time INTEGER,
  author_uuid TEXT,
  svg TEXT,
  position_x REAL,
  position_y REAL,
  position_z REAL,
  normal_x REAL,
  normal_y REAL,
  normal_z REAL,
  deleted INTEGER
);

CREATE TABLE IF NOT EXISTS edges (
    uuid TEXT PRIMARY KEY,
    creation_time INTEGER,
    author_uuid TEXT,
    start_page_uuid TEXT,
    end_page_uuid TEXT,
    deleted INTEGER
);

CREATE TABLE IF NOT EXISTS users (
    uuid TEXT PRIMARY KEY,
    creation_time INTEGER,
    name TEXT,
    deleted INTEGER
);

CREATE TABLE IF NOT EXISTS page_visits (
    time INTEGER,
    page_uuid TEXT,
    user_uuid TEXT
);

