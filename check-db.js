import { DatabaseSync } from 'node:sqlite'
const db = new DatabaseSync('server/data/tradearena.db');
const user = db.prepare('SELECT * FROM users').all();
console.log(user);
