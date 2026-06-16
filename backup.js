import fs from 'fs';
import path from 'path';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const DB_PATH = path.resolve('data/db.json');

async function backup() {
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not defined in .env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase to download latest backup...');
    const res = await pool.query('SELECT data FROM bot_state WHERE id = 1');
    
    if (res.rows.length === 0) {
      console.error('Error: No data found in Supabase bot_state table (id=1).');
      process.exit(1);
    }

    const data = res.rows[0].data;

    // Ensure data directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to db.json
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    console.log(`✅ Backup successfully saved to ${DB_PATH}`);
  } catch (err) {
    console.error('Error during database backup:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

backup();
