import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const register = async (req: Request, res: Response) => {
  const { name, email, password, institution, course, semester } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  try {
    const [existing]: any = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (existing.length > 0) return res.status(409).json({ message: 'Email already registered.' });
    const hashed = await bcrypt.hash(password, 10);
    const [result]: any = await pool.query(
      'INSERT INTO users (name,email,password,institution,course,semester) VALUES (?,?,?,?,?,?)',
      [name, email, hashed, institution || null, course || null, semester || null]
    );
    const token = jwt.sign({ id: result.insertId, email }, process.env.JWT_SECRET!, { expiresIn: '30d' });
    res.status(201).json({
      token,
      user: { id: result.insertId, name, email, institution, course, semester },
    });
  } catch (e: any) {
    res.status(500).json({ message: 'Server error.', error: e.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'All fields required.' });
  try {
    const [users]: any = await pool.query('SELECT * FROM users WHERE email=?', [email]);
    if (!users.length || !(await bcrypt.compare(password, users[0].password)))
      return res.status(401).json({ message: 'Invalid credentials.' });
    const u = users[0];
    const token = jwt.sign({ id: u.id, email: u.email }, process.env.JWT_SECRET!, { expiresIn: '30d' });
    const { password: _, ...userOut } = u;
    res.json({ token, user: userOut });
  } catch (e: any) {
    res.status(500).json({ message: 'Server error.' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT id,name,email,institution,course,semester,created_at FROM users WHERE id=?',
      [req.user!.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found.' });
    res.json({ user: rows[0] });
  } catch (e) {
    res.status(500).json({ message: 'Server error.' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const { name, institution, course, semester } = req.body;
  try {
    await pool.query(
      'UPDATE users SET name=?,institution=?,course=?,semester=? WHERE id=?',
      [name, institution || null, course || null, semester || null, req.user!.id]
    );
    // Return the updated user (frontend calls login() with this)
    const [rows]: any = await pool.query(
      'SELECT id,name,email,institution,course,semester,created_at FROM users WHERE id=?',
      [req.user!.id]
    );
    res.json({ user: rows[0] });
  } catch (e) {
    res.status(500).json({ message: 'Server error.' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ message: 'Both current and new password are required.' });
  try {
    const [users]: any = await pool.query('SELECT password FROM users WHERE id=?', [req.user!.id]);
    if (!users.length) return res.status(404).json({ message: 'User not found.' });
    const match = await bcrypt.compare(current_password, users[0].password);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect.' });
    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password=? WHERE id=?', [hashed, req.user!.id]);
    res.json({ message: 'Password changed successfully.' });
  } catch (e) {
    res.status(500).json({ message: 'Server error.' });
  }
};