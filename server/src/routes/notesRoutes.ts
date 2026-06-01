import { Router } from 'express';
import {
  uploadAndGenerate,
  getAllNotes,
  getNoteById,
  deleteNote,
} from '../controllers/notesController';

import { verifyToken } from '../middleware/auth';
import { upload } from '../config/multer';

const router = Router();

// Protect all routes
router.use(verifyToken);

// Upload PDF and generate notes
router.post('/upload', upload.single('pdf'), uploadAndGenerate);

// Get all notes
router.get('/', getAllNotes);

// Get single note
router.get('/:id', getNoteById);

// Delete note
router.delete('/:id', deleteNote);

export default router;