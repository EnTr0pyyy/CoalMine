const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = {
  documents: path.join(__dirname, '../../uploads/documents'),
  reports: path.join(__dirname, '../../uploads/reports'),
  responses: path.join(__dirname, '../../uploads/responses'),
};

Object.values(uploadDirs).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.query.category || req.body.category || 'documents';
    const targetDir = uploadDirs[category] || uploadDirs.documents;
    cb(null, targetDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  },
});

// File filter: accept PDFs, spreadsheets (CSV, XLSX), text files, DOCX, and images
const fileFilter = (_req, file, cb) => {
  const allowedExtensions = ['.pdf', '.csv', '.tsv', '.xlsx', '.xls', '.txt', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedMimeTypes = [
    'application/pdf',
    'text/csv',
    'text/plain',
    'text/tab-separated-values',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/octet-stream',
  ];

  if (allowedExtensions.includes(ext) || allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype} (${ext}). Supported formats: PDF, CSV, XLSX, TXT, DOCX, and images.`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
});

module.exports = {
  upload,
  uploadDirs,
};
