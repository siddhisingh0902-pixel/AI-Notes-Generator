import { Response } from 'express';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { extractTopics, generateAllTopicContent } from '../services/gemini';

// Helper utility to pause execution and prevent Gemini API rate limiting (RPM/TPM)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const uploadSyllabus = async (req: AuthRequest, res: Response) => {
  const { title, subject } = req.body;

  // 1. Check req.files array (populated by upload.array('files'))
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({ 
      message: 'No files or pasted text detected. Please upload a file or paste your syllabus text.' 
    });
  }

  try {
    let combinedRawText = '';

    // 2. Loop through the uploaded files/text blobs
    for (const file of files) {
      const filePath = file.path;

      try {
        if (file.mimetype === 'text/plain') {
          // If the user pasted text, read it directly
          combinedRawText += '\n' + fs.readFileSync(filePath, 'utf-8');
        } else if (file.mimetype === 'application/pdf') {
          // Read and parse the raw binary buffers of your PDF uploads
          const pdfBuffer = fs.readFileSync(filePath);
          const pdfData = await pdfParse(pdfBuffer);
          combinedRawText += '\n' + (pdfData.text || '');
        }
      } finally {
        // Always clean up the temp storage files
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    if (!combinedRawText.trim()) {
      return res.status(422).json({ message: 'Could not extract any readable content.' });
    }

    // 3. Save the syllabus into MySQL with 'processing' state so the frontend knows to show the loading badge
    const [result]: any = await pool.query(
      'INSERT INTO syllabi (user_id, title, subject, status) VALUES (?, ?, ?, ?)',
      [req.user!.id, title, subject || null, 'processing']
    );

    const syllabusId = result.insertId;

    // 4. Hand off data stream to your asynchronous background engine worker
    processSyllabusInBackground(syllabusId, combinedRawText, subject || '', req.user!.id);

    return res.status(201).json({
      success: true,
      message: 'Syllabus submitted successfully! AI is parsing content in the background.',
      syllabus: {
        id: syllabusId,
        title,
        subject,
        status: 'processing'
      }
    });

  } catch (error: any) {
    console.error('Syllabus Controller Error:', error);
    return res.status(500).json({ 
      message: 'Server error processing syllabus data.', 
      error: error.message 
    });
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

          // FIXED: Added 'filename' field and a default fallback string ('Generated via Syllabus') to bypass ER_NO_DEFAULT_FOR_FIELD MySQL error
          if (data.notes) {
            await pool.query(
              'INSERT INTO notes (topic_id,user_id,content,summary,key_points,filename) VALUES (?,?,?,?,?,?)',
              [topicId, userId, data.notes.content, data.notes.summary, JSON.stringify(data.notes.key_points), 'Generated via Syllabus']
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

        // Wait 3 seconds before hitting the Gemini API with the next topic to prevent rate limit blocks
        await sleep(3000);
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