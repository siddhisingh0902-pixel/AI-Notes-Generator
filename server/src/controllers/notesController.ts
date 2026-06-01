import fs from 'fs';
import pdfParse from 'pdf-parse';
import { Request, Response } from 'express';
import { pool } from '../config/db';
import { generateNotes, extractTopicsFromMultimodal } from '../services/gemini';

interface AuthRequest extends Request {
  user?: { id: number; email: string };
}

export const uploadAndGenerate = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  // 1. Array implementation check (req.files use karein instead of req.file)
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    res.status(400).json({
      message: 'No files uploaded. Please provide a PDF, text file, or syllabus images.',
    });
    return;
  }

  try {
    let combinedRawText = '';

    // 2. Loop over all uploaded files to extract string blocks
    for (const file of files) {
      const filePath = file.path;

      try {
        if (file.mimetype === 'text/plain') {
          combinedRawText += '\n' + fs.readFileSync(filePath, 'utf-8');
        } else if (file.mimetype === 'application/pdf') {
          const pdfBuffer = fs.readFileSync(filePath);
          const pdfData = await pdfParse(pdfBuffer);
          combinedRawText += '\n' + (pdfData.text || '');
        } else if (file.mimetype.startsWith('image/')) {
          // Multimodal processing: Agar raw image buffer mile toh direct text structures extract karein
          const imageBuffer = fs.readFileSync(filePath);
          const parsedStructure = await extractTopicsFromMultimodal(imageBuffer, file.mimetype);
          
          // Structure data stringify convert for aggregation safely
          parsedStructure.forEach((unit: any) => {
            combinedRawText += `\nUnit ${unit.unit_number || ''}: ${unit.unit_title || ''}\n`;
            if (Array.isArray(unit.topics)) {
              combinedRawText += unit.topics.join('\n');
            }
          });
        }
      } finally {
        // Hamesha temporary file cleanup schedule karein taaki storage full na ho
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    if (combinedRawText.trim().length < 20) {
      res.status(422).json({
        message: 'Unable to extract readable technical content from provided files.',
      });
      return;
    }

    // 3. Fire the custom schema generate note utility
    const notes = await generateNotes(combinedRawText);

    // Save notes text block straight to your LONGTEXT column
    const [result]: any = await pool.query(
      `INSERT INTO notes 
      (user_id, filename, original_text, generated_notes) 
      VALUES (?, ?, ?, ?)`,
      [
        req.user!.id,
        files[0].originalname + (files.length > 1 ? ` (+${files.length - 1} files)` : ''),
        combinedRawText.slice(0, 5000),
        notes.content,
      ]
    );

    res.status(201).json({
      note: {
        id: result.insertId,
        filename: files[0].originalname,
        generated_notes: notes.content, // frontend friendly format mapping
        created_at: new Date(),
      },
    });

  } catch (err: any) {
    console.error('======= NOTES CONTROLLER CRASH LOG =======');
    console.error(err);
    console.error('==========================================');
    res.status(500).json({
      message: 'Failed to generate notes.',
      error: err.message
    });
  }
};

export const getAllNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [notes] = await pool.query(
      `SELECT id, filename, generated_notes, created_at
       FROM notes
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user!.id]
    );
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notes.' });
  }
};

export const getNoteById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [notes]: any = await pool.query(
      `SELECT * FROM notes WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user!.id]
    );
    if (notes.length === 0) {
      res.status(404).json({ message: 'Note not found.' });
      return;
    }
    res.json({ note: notes[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch note.' });
  }
};

export const deleteNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [result]: any = await pool.query(
      `DELETE FROM notes WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user!.id]
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ message: 'Note not found.' });
      return;
    }
    res.json({ message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete note.' });
  }
};