require('dotenv').config();
const fs = require('fs');
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

async function columnExists(c, table, column) {
  const [rows] = await c.query(
    `SELECT COUNT(*) n FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name=?`,
    [process.env.DB_NAME || 'bizlens', table, column]
  );
  return !!rows[0].n;
}

async function setup() {
  const c = await mysql.createConnection(config);
  const schema = fs.readFileSync(__dirname + '/../database/schema.sql', 'utf8');
  await c.query(schema);

  const dbName = process.env.DB_NAME || 'bizlens';
  await c.query(`USE \`${dbName.replace(/`/g, '')}\``);

  // Backward-compatible migrations for databases created by older BizLens builds.
  if (!(await columnExists(c, 'products', 'stock'))) {
    await c.query(`ALTER TABLE products ADD COLUMN stock INT NOT NULL DEFAULT 0 AFTER selling_price`);
  }
  if (!(await columnExists(c, 'products', 'status'))) {
    await c.query(`ALTER TABLE products ADD COLUMN status ENUM('active','inactive') DEFAULT 'active' AFTER stock`);
  }
  if (!(await columnExists(c, 'products', 'created_at'))) {
    await c.query(`ALTER TABLE products ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
  }
  if (!(await columnExists(c, 'products', 'updated_at'))) {
    await c.query(`ALTER TABLE products ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
  }

  console.log(`Database ready: ${dbName}`);
  await c.end();
}
setup().catch(e => { console.error('Database setup failed:', e.message); process.exit(1) });
