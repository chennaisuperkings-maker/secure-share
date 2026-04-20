const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const {
    uploadFile,
    getFiles,
    deleteFile,
    generateShareLink,
    downloadFile,
    downloadSharedFile,
    getSharedFileInfo
} = require('../controllers/fileController');

// Protected routes (require JWT)
router.post('/upload', protect, upload.single('file'), uploadFile);
router.get('/', protect, getFiles);
router.delete('/:id', protect, deleteFile);
router.post('/:id/share', protect, generateShareLink);
router.get('/download/:id', protect, downloadFile);

// Public route for shared files
router.get('/shared/:token', downloadSharedFile);
router.get('/info/:token', getSharedFileInfo);

module.exports = router;


