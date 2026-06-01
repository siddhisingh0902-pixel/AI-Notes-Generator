import { Response } from 'express';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const createTest = async (req: AuthRequest, res: Response) => {
  const { syllabus_id, title, unit_number, num_questions = 20, time_limit = 30 } = req.body;
  if (!syllabus_id || !title) return res.status(400).json({ message: 'syllabus_id and title are required.' });

  try {
    let mcqQuery: string;
    let mcqParams: any[];

    if (unit_number) {
      mcqQuery = `SELECT m.id FROM mcqs m
                  JOIN topics t ON m.topic_id = t.id
                  WHERE t.syllabus_id=? AND t.unit_number=? AND m.user_id=?
                  ORDER BY RAND() LIMIT ?`;
      mcqParams = [syllabus_id, unit_number, req.user!.id, num_questions];
    } else {
      mcqQuery = `SELECT m.id FROM mcqs m
                  JOIN topics t ON m.topic_id = t.id
                  WHERE t.syllabus_id=? AND m.user_id=?
                  ORDER BY RAND() LIMIT ?`;
      mcqParams = [syllabus_id, req.user!.id, num_questions];
    }

    const [mcqs]: any = await pool.query(mcqQuery, mcqParams);
    if (!mcqs.length) return res.status(422).json({ message: 'No MCQs available for this syllabus/unit yet.' });

    const [testResult]: any = await pool.query(
      'INSERT INTO tests (user_id, syllabus_id, title, num_questions, time_limit, status) VALUES (?,?,?,?,?,?)',
      [req.user!.id, syllabus_id, title, mcqs.length, time_limit, 'ready']
    );
    const testId = testResult.insertId;

    for (const mcq of mcqs) {
      await pool.query('INSERT INTO test_questions (test_id, mcq_id) VALUES (?,?)', [testId, mcq.id]);
    }

    const [tests]: any = await pool.query('SELECT * FROM tests WHERE id=?', [testId]);
    res.status(201).json({ test: tests[0] });
  } catch (e: any) {
    res.status(500).json({ message: 'Server error.', error: e.message });
  }
};

export const getTest = async (req: AuthRequest, res: Response) => {
  try {
    const [tests]: any = await pool.query('SELECT * FROM tests WHERE id=? AND user_id=?', [req.params.id, req.user!.id]);
    if (!tests.length) return res.status(404).json({ message: 'Test not found.' });

    const isCompleted = !!tests[0].completed_at;

    // Security optimization: Return answer data ONLY if the user has already submitted the test
    const [questions]: any = await pool.query(
      `SELECT m.id, m.question_text, m.option_a, m.option_b, m.option_c, m.option_d
              ${isCompleted ? ', m.correct_option, m.explanation' : ''}
       FROM test_questions tq
       JOIN mcqs m ON tq.mcq_id = m.id
       WHERE tq.test_id=?`,
      [req.params.id]
    );

    let answers: Record<number, string> = {};
    if (isCompleted) {
      const [attempts]: any = await pool.query(
        'SELECT answers FROM test_attempts WHERE test_id=? AND user_id=? ORDER BY completed_at DESC LIMIT 1',
        [req.params.id, req.user!.id]
      );
      if (attempts.length && attempts[0].answers) {
        try {
          const parsed = JSON.parse(attempts[0].answers);
          if (Array.isArray(parsed)) {
            parsed.forEach((a: any) => { answers[a.mcq_id] = a.user_answer; });
          } else {
            answers = parsed;
          }
        } catch {}
      }
    }

    res.json({ test: tests[0], questions, answers });
  } catch (e) {
    res.status(500).json({ message: 'Server error.' });
  }
};

export const startTest = async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      'UPDATE tests SET started_at=NOW(), status=? WHERE id=? AND user_id=? AND started_at IS NULL',
      ['in_progress', req.params.id, req.user!.id]
    );
    res.json({ message: 'Test started.' });
  } catch (e) {
    res.status(500).json({ message: 'Server error.' });
  }
};

export const submitTest = async (req: AuthRequest, res: Response) => {
  const answers = req.body?.answers || {}; 
  
  try {
    // 1. Check if the test exists
    const [tests]: any = await pool.query('SELECT * FROM tests WHERE id=? AND user_id=?', [req.params.id, req.user!.id]);
    if (!tests.length) return res.status(404).json({ message: 'Test not found.' });

    // 2. Fetch questions mapped to this test
    const [questions]: any = await pool.query(
      'SELECT m.id, m.correct_option, m.explanation FROM test_questions tq JOIN mcqs m ON tq.mcq_id=m.id WHERE tq.test_id=?',
      [req.params.id]
    );

    let score = 0;
    const results = questions.map((q: any) => {
      const userAnswer = answers[String(q.id)] || answers[Number(q.id)] || null;
      const isCorrect = userAnswer && String(userAnswer).trim().toUpperCase() === String(q.correct_option).trim().toUpperCase();
      
      if (isCorrect) score++;
      
      return { 
        mcq_id: q.id, 
        user_answer: userAnswer, 
        correct_answer: q.correct_option, 
        is_correct: !!isCorrect, 
        explanation: q.explanation || "" 
      };
    });

    const total = questions.length;
    
    // Percentage calculation
    const rawPercentage = total > 0 ? (score / total) * 100 : 0;
    const percentage = parseFloat(Math.min(100, Math.max(0, rawPercentage)).toFixed(2)) || 0.00;

    // 3. Insert results into database
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const stringifiedAnswers = JSON.stringify(results) || "[]";

      // Matches exactly with your newly updated database columns
      await connection.query(
        `INSERT INTO test_attempts 
        (test_id, user_id, score, percentage, time_taken_minutes, answers, completed_at) 
        VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [Number(req.params.id), Number(req.user!.id), score, percentage, 0, stringifiedAnswers]
      );

      await connection.query(
        'UPDATE tests SET status=?, score=?, percentage=?, completed_at=NOW() WHERE id=?',
        ['completed', score, percentage, Number(req.params.id)]
      );

      await connection.commit();
      return res.json({ result: { score, total, percentage } });

    } catch (txError) {
      await connection.rollback();
      throw txError; 
    } finally {
      connection.release();
    }

  } catch (e: any) {
    console.error('======= SERVER ENCOUNTERED SUBMISSION ERROR =======');
    console.error(e);
    console.error('====================================================');
    
    return res.status(500).json({ 
      message: 'Server encountered an issue evaluating your responses.', 
      error: e?.message || 'Internal Database Exception' 
    });
  }
};
export const getUserTests = async (req: AuthRequest, res: Response) => {
  try {
    const [tests]: any = await pool.query(
      `SELECT t.*, s.title as syllabus_title
       FROM tests t
       JOIN syllabi s ON t.syllabus_id = s.id
       WHERE t.user_id=?
       ORDER BY t.created_at DESC`,
      [req.user!.id]
    );
    res.json({ tests });
  } catch (e) {
    res.status(500).json({ message: 'Server error.' });
  }
};

export const deleteTest = async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM tests WHERE id=? AND user_id=?', [req.params.id, req.user!.id]);
    res.json({ message: 'Deleted.' });
  } catch (e) {
    res.status(500).json({ message: 'Server error.' });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user!.id;
    const [[syllabi]]: any = await pool.query('SELECT COUNT(*) as count FROM syllabi WHERE user_id=?', [uid]);
    const [[topics]]: any = await pool.query('SELECT COUNT(*) as total, SUM(is_completed) as completed FROM topics WHERE user_id=?', [uid]);
    const [[tests]]: any = await pool.query('SELECT COUNT(*) as count FROM test_attempts WHERE user_id=?', [uid]);
    const [[avgScore]]: any = await pool.query('SELECT AVG(percentage) as avg FROM test_attempts WHERE user_id=?', [uid]);
    const [recentTests]: any = await pool.query(
      `SELECT ta.*, t.title FROM test_attempts ta
       JOIN tests t ON ta.test_id = t.id
       WHERE ta.user_id=?
       ORDER BY ta.completed_at DESC LIMIT 5`,
      [uid]
    );
    res.json({
      stats: {
        totalSyllabi: syllabi.count,
        totalTopics: topics.total || 0,
        completedTopics: topics.completed || 0,
        completionRate: topics.total ? Math.round((topics.completed / topics.total) * 100) : 0,
        testsAttempted: tests.count,
        averageScore: avgScore.avg ? Math.round(avgScore.avg) : 0,
      },
      recentTests,
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error.' });
  }
};