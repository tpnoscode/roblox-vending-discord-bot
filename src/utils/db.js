import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('data/db.json');

// Ensure database file exists
function init() {
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
        },
        null,
        2
      )
    );
  }
}

init();

export function read() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database:', err);
    return { users: {}, products: {}, stock: [], transactions: [] };
  }
}

export function write(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing database:', err);
    return false;
  }
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
