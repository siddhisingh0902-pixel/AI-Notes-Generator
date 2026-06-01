import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    file.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error('PDFs only'));
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});