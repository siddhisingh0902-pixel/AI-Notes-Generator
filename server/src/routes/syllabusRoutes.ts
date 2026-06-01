import { Router } from 'express';
import { uploadSyllabus, getSyllabi, getSyllabusById, getSyllabusStatus, deleteSyllabus } from '../controllers/syllabusController';
import { verifyToken } from '../middleware/auth';
import { upload } from '../config/multer';

const router = Router();

// Secure all endpoints with token validation middleware
router.use(verifyToken);

/**
 * UPGRADED: Added an inline interceptor to catch custom text/pdf Multer validation errors gracefully
 */
router.post('/upload', (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        message: 'Syllabus upload validation failed.',
        error: err.message
      });
    }
    next();
  });
}, uploadSyllabus);

router.get('/', getSyllabi);
router.get('/:id', getSyllabusById);
router.get('/:id/status', getSyllabusStatus);
router.delete('/:id', deleteSyllabus);

export default router;