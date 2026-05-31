import { DatabaseSync } from 'node:sqlite'

try {
  const db = new DatabaseSync(':memory:');
  db.exec(`
     CREATE TABLE IF NOT EXISTS users (
       id TEXT PRIMARY KEY,
       uid TEXT UNIQUE,
       username TEXT UNIQUE NOT NULL,
       email TEXT UNIQUE NOT NULL,
       password TEXT NOT NULL
     );
  `);
  console.log('Success');
} catch (e) {
  console.error(e);
}
