import { Router } from 'express';
import { getTopicNotes, getTopicQuestions, getTopicMCQs, getAllNotesForSyllabus, markTopicComplete } from '../controllers/contentController';
import { createTest, getTest, startTest, submitTest, getUserTests, deleteTest, getDashboardStats } from '../controllers/testController';
import { sendMessage, getChatHistory, clearHistory } from '../controllers/chatController';
import { uploadAndGenerate, getAllNotes, getNoteById, deleteNote } from '../controllers/notesController';
import { verifyToken } from '../middleware/auth';
import { upload } from '../config/multer';

const router = Router();

// Protect all sub-routes via global authentication layer
router.use(verifyToken);

// --- Core Academic Content ---
router.get('/topics/:topicId/notes', getTopicNotes);
router.get('/topics/:topicId/questions', getTopicQuestions);
router.get('/topics/:topicId/mcqs', getTopicMCQs);
router.put('/topics/:topicId/complete', markTopicComplete);
router.get('/syllabi/:syllabusId/notes', getAllNotesForSyllabus);

// --- Document Notes Management ---
// UPGRADED: Changed to upload.array('files') to support notesController structure and added clean error handling
router.post('/notes/upload', (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        message: 'File upload validation failed.',
        error: err.message
      });
    }
    next();
  });
}, uploadAndGenerate);

router.get('/notes', getAllNotes);
router.get('/notes/:id', getNoteById);
router.delete('/notes/:id', deleteNote);

// --- Tests & Performance Testing Evaluation ---
router.post('/tests', createTest);
router.get('/tests', getUserTests);
router.get('/tests/:id', getTest);
router.put('/tests/:id/start', startTest);       
router.post('/tests/:id/submit', submitTest);
router.delete('/tests/:id', deleteTest);          
router.get('/dashboard/stats', getDashboardStats);

// --- AI Companion Interactive Assistant ---
router.post('/chat', sendMessage);
router.get('/chat/history', getChatHistory);
router.delete('/chat/history', clearHistory);

export default router;