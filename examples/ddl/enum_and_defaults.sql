-- examples/ddl/enum_and_defaults.sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin','guest')),
  active INTEGER NOT NULL DEFAULT 1,
  bio TEXT
);
