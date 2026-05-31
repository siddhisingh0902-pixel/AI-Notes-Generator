const fs = require('fs');
const pdfParse = require('pdf-parse');
const { pool } = require('../config/db');
const { generateNotes } = require('../services/openai');

const uploadAndGenerate = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  const filePath = req.file.path;

  try {
    const pdfData = await pdfParse(fs.readFileSync(filePath));
    if (!pdfData.text || pdfData.text.trim().length < 50) {
      fs.unlinkSync(filePath);
      return res.status(422).json({ message: 'PDF has no readable text.' });
    }

    const notes = await generateNotes(pdfData.text);

    const [result] = await pool.query(
      'INSERT INTO notes (user_id, filename, original_text, generated_notes) VALUES (?, ?, ?, ?)',
      [req.user.id, req.file.originalname, pdfData.text.slice(0, 5000), notes]
    );

    fs.unlinkSync(filePath);
    res.status(201).json({
      note: {
        id: result.insertId,
        filename: req.file.originalname,
        generated_notes: notes,
        created_at: new Date(),
      },
    });
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error(err);
    res.status(500).json({ message: 'Failed to generate notes.' });
  }
};

const getAllNotes = async (req, res) => {
  try {
    const [notes] = await pool.query(
      'SELECT id, filename, generated_notes, created_at FROM notes WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notes.' });
  }
};

const getNoteById = async (req, res) => {
  try {
    const [notes] = await pool.query(
      'SELECT * FROM notes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    notes.length === 0
      ? res.status(404).json({ message: 'Note not found.' })
      : res.json({ note: notes[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch note.' });
  }
};

const deleteNote = async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM notes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    result.affectedRows === 0
      ? res.status(404).json({ message: 'Note not found.' })
      : res.json({ message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete note.' });
  }
};

module.exports = { uploadAndGenerate, getAllNotes, getNoteById, deleteNote };