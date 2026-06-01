import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

export const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected');
    conn.release();
  } catch (e: any) {
    console.error('❌ MySQL failed:', e.message);
  }
};