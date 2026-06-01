import { Response } from 'express';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { extractTopics, generateAllTopicContent } from '../services/gemini';

export const uploadSyllabus = async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'No PDF uploaded.' });
  const { title, subject } = req.body;
  const filePath = req.file.path;

  try {
    const buffer = fs.readFileSync(filePath);
    const pdf = await pdfParse(buffer);
    const rawText = pdf.text;

    // Insert syllabus record
    const [syllabusResult]: any = await pool.query(
      'INSERT INTO syllabi (user_id,title,subject,filename,raw_text,status) VALUES (?,?,?,?,?,?)',
      [req.user!.id, title || req.file.originalname, subject || 'General', req.file.originalname, rawText.slice(0, 50000), 'processing']
    );
    const syllabusId = syllabusResult.insertId;

    fs.unlinkSync(filePath);

    // Respond immediately so frontend doesn't timeout
    res.status(201).json({ message: 'Syllabus uploaded. Processing started.', syllabusId });

    // Process async in background
    processSyllabusInBackground(syllabusId, rawText, subject || 'General', req.user!.id).catch(console.error);

  } catch (e: any) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error("Syllabus processing startup failure:", e);
    res.status(500).json({ message: 'Failed to process PDF.', error: e.message });
  }
};

const processSyllabusInBackground = async (syllabusId: number, rawText: string, subject: string, userId: number) => {
  try {
    // Extract units and topics structure from text
    const units = await extractTopics(rawText);
    let topicOrder = 0;

    for (const unit of units) {
      for (const topicName of unit.topics) {
        topicOrder++;
        
        // 1. Create the topic entry in the database
        const [topicResult]: any = await pool.query(
          'INSERT INTO topics (syllabus_id,user_id,unit_number,unit_title,topic_name,topic_order) VALUES (?,?,?,?,?,?)',
          [syllabusId, userId, unit.unit_number, unit.unit_title, topicName, topicOrder]
        );
        const topicId = topicResult.insertId;

        // 2. Fetch Notes, Questions, and MCQs in ONE combined API Call
        try {
          console.log(`[Batch Generation]: Fetching all data components for topic: ${topicName}`);
          const data = await generateAllTopicContent(topicName, subject);

          // Save Notes component
          if (data.notes) {
            await pool.query(
              'INSERT INTO notes (topic_id,user_id,content,summary,key_points) VALUES (?,?,?,?,?)',
              [topicId, userId, data.notes.content, data.notes.summary, JSON.stringify(data.notes.key_points)]
            );
          }

          // Save Questions component array
          if (Array.isArray(data.questions)) {
            for (const q of data.questions) {
              await pool.query(
                'INSERT INTO questions (topic_id,user_id,question_text,answer,type,difficulty) VALUES (?,?,?,?,?,?)',
                [topicId, userId, q.question_text, q.answer, q.type, q.difficulty]
              );
            }
          }

          // Save MCQs component array
          if (Array.isArray(data.mcqs)) {
            for (const m of data.mcqs) {
              await pool.query(
                'INSERT INTO mcqs (topic_id,user_id,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,difficulty) VALUES (?,?,?,?,?,?,?,?,?,?)',
                [topicId, userId, m.question_text, m.option_a, m.option_b, m.option_c, m.option_d, m.correct_option, m.explanation, m.difficulty]
              );
            }
          }

          console.log(`[Batch Generation Successfully Done]: Row logging complete for topic: ${topicName}`);

        } catch (topicError) {
          console.error(`Batch generation failed for topic entry [${topicName}]:`, topicError);
          // Keep loop moving to parse remaining items even if one topic faults
        }
      }
    }

    // Mark syllabus generation complete
    await pool.query('UPDATE syllabi SET status=? WHERE id=?', ['ready', syllabusId]);
    console.log(`\n✅ Syllabus ${syllabusId} fully processed with optimized request batching.`);
    
  } catch (e) {
    await pool.query('UPDATE syllabi SET status=? WHERE id=?', ['error', syllabusId]);
    console.error('Background processing critically failed:', e);
  }
};

export const getSyllabi = async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM syllabi WHERE user_id=? ORDER BY created_at DESC', [req.user!.id]
    );
    res.json({ syllabi: rows });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
};

export const getSyllabusById = async (req: AuthRequest, res: Response) => {
  try {
    const [syllabi]: any = await pool.query('SELECT * FROM syllabi WHERE id=? AND user_id=?', [req.params.id, req.user!.id]);
    if (!syllabi.length) return res.status(404).json({ message: 'Not found.' });
    const [topics]: any = await pool.query('SELECT * FROM topics WHERE syllabus_id=? ORDER BY topic_order', [req.params.id]);
    res.json({ syllabus: syllabi[0], topics });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
};

export const getSyllabusStatus = async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.query('SELECT id,status FROM syllabi WHERE id=? AND user_id=?', [req.params.id, req.user!.id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found.' });
    res.json({ status: rows[0].status });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
};

export const deleteSyllabus = async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM syllabi WHERE id=? AND user_id=?', [req.params.id, req.user!.id]);
    res.json({ message: 'Deleted.' });
  } catch (e) { res.status(500).json({ message: 'Server error.' }); }
};