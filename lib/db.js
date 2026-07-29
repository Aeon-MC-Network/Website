import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'dal-241001.bloom.host',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 's119339_Aeonweb',
  user: process.env.DB_USER || 'u119339_EBMpCjBdyV',
  password: process.env.DB_PASS || 'ippEWHGzW5a5vNUKi4IN39h9',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

export const db = pool;
