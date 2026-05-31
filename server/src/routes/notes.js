const express = require('express');
const { uploadAndGenerate, getAllNotes, getNoteById, deleteNote } = require('../controllers/notesController');
const { verifyToken } = require('../middleware/auth');
const upload = require('../config/multer');
const router = express.Router();

router.use(verifyToken);

router.post('/upload', upload.single('pdf'), uploadAndGenerate);
router.get('/', getAllNotes);
router.get('/:id', getNoteById);
router.delete('/:id', deleteNote);

module.exports = router;