import { DatabaseSync } from 'node:sqlite'
const db = new DatabaseSync('server/data/tradearena.db');
const admin = db.prepare("SELECT * FROM users WHERE role = 'admin'").all();
console.log(admin);
