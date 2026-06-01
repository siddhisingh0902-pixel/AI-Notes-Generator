import { Response } from 'express';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { chatWithAI } from '../services/gemini';
import { RowDataPacket } from 'mysql2';

interface ChatMessage extends RowDataPacket {
  role: string;
  content: string;
}

interface Topic extends RowDataPacket {
  topic_name: string;
}

export const sendMessage = async (req: AuthRequest, res: Response) => {
  const { message, topicId } = req.body;

  // Validate message
  if (!message?.trim()) {
    return res.status(400).json({
      message: 'Message required.'
    });
  }

  // Check authentication
  if (!req.user) {
    return res.status(401).json({
      message: 'Unauthorized'
    });
  }

  try {
    let context = '';

    // 1. Fetch topic context using standard pool query (No open transaction)
    if (topicId) {
      const [topics] = await pool.query<Topic[]>(
        `
        SELECT topic_name
        FROM topics
        WHERE id = ?
        AND user_id = ?
        LIMIT 1
        `,
        [topicId, req.user.id]
      );

      if (topics.length > 0) {
        context = topics[0].topic_name;
      }
    }

    // 2. Fetch last 20 chat messages securely
    const [history] = await pool.query<ChatMessage[]>(
      `
      SELECT role, content
      FROM chat_messages
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [req.user.id]
    );

    // Reverse history to keep oldest → newest chronology
    history.reverse();

    // 3. Fire long-running external Gemini AI request BEFORE opening database transaction strings
    const reply = await chatWithAI(message, history, context);

    // 4. Open isolated database worker connection solely for fast logging
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Save user message
      await connection.query(
        `
        INSERT INTO chat_messages
        (user_id, role, content, context_topic_id)
        VALUES (?, ?, ?, ?)
        `,
        [req.user.id, 'user', message, topicId || null]
      );

      // Save assistant response
      await connection.query(
        `
        INSERT INTO chat_messages
        (user_id, role, content, context_topic_id)
        VALUES (?, ?, ?, ?)
        `,
        [req.user.id, 'assistant', reply, topicId || null]
      );

      await connection.commit();
      return res.json({ reply });

    } catch (txError) {
      await connection.rollback();
      throw txError;
    } finally {
      connection.release(); // Hand connection back to the thread pool immediately
    }

  } catch (error) {
    console.error('AI Chat Error:', error);

    return res.status(500).json({
      message: 'AI error.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getChatHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Unauthorized'
      });
    }

    const [messages] = await pool.query(
      `
      SELECT *
      FROM chat_messages
      WHERE user_id = ?
      ORDER BY created_at ASC
      LIMIT 100
      `,
      [req.user.id]
    );

    return res.json({ messages });

  } catch (error) {
    console.error('History Error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};

export const clearHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Unauthorized'
      });
    }

    await pool.query(
      `
      DELETE FROM chat_messages
      WHERE user_id = ?
      `,
      [req.user.id]
    );

    return res.json({ message: 'History cleared.' });

  } catch (error) {
    console.error('Clear History Error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};