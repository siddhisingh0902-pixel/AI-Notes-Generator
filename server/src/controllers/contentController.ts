import { Response } from 'express';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const getTopicNotes = async (req: AuthRequest, res: Response) => {
  try {
    const [notes]: any = await pool.query(
      'SELECT n.*, t.topic_name, t.unit_title FROM notes n JOIN topics t ON n.topic_id=t.id WHERE n.topic_id=? AND n.user_id=?',
      [req.params.topicId, req.user!.id]
    );
    if (!notes.length) return res.status(404).json({ message: 'Notes not generated yet.' });
    res.json({ notes: notes[0] });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
};

export const getTopicQuestions = async (req: AuthRequest, res: Response) => {
  const { type } = req.query;
  try {
    let query = 'SELECT * FROM questions WHERE topic_id=? AND user_id=?';
    const params: any[] = [req.params.topicId, req.user!.id];
    if (type) { query += ' AND type=?'; params.push(type); }
    query += ' ORDER BY type, difficulty';
    const [questions]: any = await pool.query(query, params);
    res.json({ questions });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
};

export const getTopicMCQs = async (req: AuthRequest, res: Response) => {
  try {
    const [mcqs]: any = await pool.query(
      'SELECT * FROM mcqs WHERE topic_id=? AND user_id=? ORDER BY difficulty',
      [req.params.topicId, req.user!.id]
    );
    res.json({ mcqs });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
};

export const getAllNotesForSyllabus = async (req: AuthRequest, res: Response) => {
  try {
    const [notes]: any = await pool.query(
      `SELECT n.*, t.topic_name, t.unit_title, t.unit_number 
       FROM notes n 
       JOIN topics t ON n.topic_id=t.id 
       WHERE t.syllabus_id=? AND n.user_id=? 
       ORDER BY t.unit_number, t.topic_order`,
      [req.params.syllabusId, req.user!.id]
    );
    res.json({ notes });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
};

export const markTopicComplete = async (req: AuthRequest, res: Response) => {
  try {
    const { completed } = req.body;
    await pool.query('UPDATE topics SET is_completed=? WHERE id=? AND user_id=?', [completed, req.params.topicId, req.user!.id]);
    res.json({ message: 'Updated.' });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
};