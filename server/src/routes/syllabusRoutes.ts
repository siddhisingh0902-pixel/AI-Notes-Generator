import { Router } from 'express';
import { uploadSyllabus, getSyllabi, getSyllabusById, getSyllabusStatus, deleteSyllabus } from '../controllers/syllabusController';
import { verifyToken } from '../middleware/auth';
import { upload } from '../config/multer';

const router = Router();

// Secure all endpoints with token validation middleware
router.use(verifyToken);

/**
 * UPGRADED: Handles single PDF/Text files or an array of multiple images (up to 10 files)
 * The field name on the frontend FormData must be 'files' to match upload.array('files')
 */
router.post('/upload', upload.array('files', 10), uploadSyllabus);

router.get('/', getSyllabi);
router.get('/:id', getSyllabusById);
router.get('/:id/status', getSyllabusStatus);
router.delete('/:id', deleteSyllabus);

export default router;