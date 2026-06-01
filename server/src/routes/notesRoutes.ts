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

// UPGRADED: Changed to upload.array('files') with inline error interceptors
router.post('/upload', (req, res, next) => {
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

// Get all notes
router.get('/', getAllNotes);

// Get single note
router.get('/:id', getNoteById);

// Delete note
router.delete('/:id', deleteNote);

export default router;