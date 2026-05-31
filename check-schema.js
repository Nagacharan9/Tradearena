import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('server/data/tradearena.db');
const schema = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
console.log(JSON.stringify(schema, null, 2));
