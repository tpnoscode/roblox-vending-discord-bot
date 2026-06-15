import fs from 'fs';
import path from 'path';
import pg from 'pg';
const { Pool } = pg;

const DB_PATH = path.resolve('data/db.json');
let cachedData = null;
let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Create table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_state (
        id INT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `);
    
    // Check initial row
    const res = await pool.query('SELECT data FROM bot_state WHERE id = 1');
    if (res.rows.length === 0) {
      const initialState = { users: {}, products: {}, stock: [], transactions: [], config: {} };
      await pool.query('INSERT INTO bot_state (id, data) VALUES (1, $1)', [initialState]);
      cachedData = initialState;
    } else {
      cachedData = res.rows[0].data;
    }
    console.log('Successfully connected and initialized Supabase database.');
  } catch (err) {
    console.error('Failed to initialize Supabase. Falling back to local JSON database.', err);
    pool = null;
    initLocalJson();
  }
} else {
  initLocalJson();
}

function initLocalJson() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(
      DB_PATH,
      JSON.stringify(
        {
          users: {},
          products: {},
          stock: [],
          transactions: [],
          config: {}
        },
        null,
        2
      )
    );
  }
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    cachedData = JSON.parse(data);
    console.log('Successfully loaded local JSON database.');
  } catch (err) {
    console.error('Error reading local database:', err);
    cachedData = { users: {}, products: {}, stock: [], transactions: [], config: {} };
  }
}

export function read() {
  return cachedData;
}

export function write(data) {
  cachedData = data;
  if (pool) {
    pool.query('UPDATE bot_state SET data = $1 WHERE id = 1', [data])
      .catch(err => console.error('Supabase write error:', err));
  } else {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Error writing local database:', err);
      return false;
    }
  }
  return true;
}

export function getUser(userId, username) {
  const data = read();
  if (!data.users) {
    data.users = {};
  }
  let user = data.users[userId];
  if (!user) {
    user = {
      username: username,
      balance: 0,
      totalCharged: 0,
      totalPurchased: 0,
    };
    data.users[userId] = user;
    write(data);
  } else if (user.balance === undefined) {
    user.balance = 0;
    write(data);
  }
  return user;
}
