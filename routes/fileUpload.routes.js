// src/routes/fileRoutes.js
import express from 'express';
import multer from 'multer';
import { uploadFile } from '../controllers/fileUpload.controller.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });  // Files are uploaded to 'uploads' folder

// POST route to handle file uploads
router.post('/upload', upload.single('file'), uploadFile);

export default router;
