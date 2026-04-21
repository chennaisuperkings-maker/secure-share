const File = require('../models/File');
const fs = require('fs');
const path = require('path');
const { encryptBuffer, decryptBuffer } = require('../utils/encryption');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Ensure uploads dir exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// @desc    Upload a file
// @route   POST /api/files/upload
// @access  Private
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Encrypt the file buffer
        const encryptedBuffer = encryptBuffer(req.file.buffer);

        // Generate a random filename for storage to avoid collisions
        const storageFilename = crypto.randomBytes(16).toString('hex') + path.extname(req.file.originalname);
        const storagePath = path.join(UPLOADS_DIR, storageFilename);

        // Write encrypted file to disk
        fs.writeFileSync(storagePath, encryptedBuffer);

        // Save file metadata in database
        const fileDoc = await File.create({
            filename: storageFilename,
            originalName: req.file.originalname,
            owner: req.user._id,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        res.status(201).json(fileDoc);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during upload' });
    }
};

// @desc    Get user files
// @route   GET /api/files
// @access  Private
const getFiles = async (req, res) => {
    try {
        const files = await File.find({ owner: req.user._id }).sort({ createdAt: -1 });
        res.json(files);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching files' });
    }
};

// @desc    Delete file
// @route   DELETE /api/files/:id
// @access  Private
const deleteFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Check ownership
        if (file.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to delete this file' });
        }

        // Delete from disk
        const filePath = path.join(UPLOADS_DIR, file.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await file.deleteOne();
        res.json({ message: 'File removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting file' });
    }
};

// @desc    Generate shareable link
// @route   POST /api/files/:id/share
// @access  Private
const generateShareLink = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Check ownership
        if (file.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to share this file' });
        }

        // Generate a random token
        const shareToken = crypto.randomBytes(20).toString('hex');

        // Optional expiration from request (in hours)
        let expirationDate = null;
        if (req.body.expiresInHours) {
            expirationDate = new Date();
            expirationDate.setHours(expirationDate.getHours() + parseInt(req.body.expiresInHours));
        }

        file.shareToken = shareToken;
        file.expirationDate = expirationDate;
        file.isPublic = true;
        await file.save();

        const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/shared/${shareToken}`;
        console.log("NEW SHARE LINK:", shareUrl);

        res.json({
            shareToken,
            expirationDate,
            shareUrl
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error generating link' });
    }
};

// @desc    Download file (for owner)
// @route   GET /api/files/download/:id
// @access  Private
const downloadFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Check ownership
        if (file.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to download this file' });
        }

        const filePath = path.join(UPLOADS_DIR, file.filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        // Read encrypted file and decrypt
        const encryptedBuffer = fs.readFileSync(filePath);
        const decryptedBuffer = decryptBuffer(encryptedBuffer);

        // Use RFC 5987 encoding for proper filename handling with special characters
        const encodedFilename = encodeURIComponent(file.originalName);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}; filename="${file.originalName}"`);
        res.setHeader('Content-Type', file.mimetype);
        res.setHeader('Content-Length', decryptedBuffer.length);
        res.send(decryptedBuffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error downloading file' });
    }
};

// @desc    Download shared file
// @route   GET /api/files/shared/:token
// @access  Public
const downloadSharedFile = async (req, res) => {
    try {
        const file = await File.findOne({ shareToken: req.params.token, isPublic: true });

        if (!file) {
            return res.status(404).json({ message: 'Invalid or expired share link' });
        }

        // Check expiration
        if (file.expirationDate && new Date() > file.expirationDate) {
            return res.status(410).json({ message: 'Share link has expired' });
        }

        const filePath = path.join(UPLOADS_DIR, file.filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        // Read encrypted file and decrypt
        const encryptedBuffer = fs.readFileSync(filePath);
        const decryptedBuffer = decryptBuffer(encryptedBuffer);

        // Use RFC 5987 encoding for proper filename handling with special characters
        const encodedFilename = encodeURIComponent(file.originalName);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}; filename="${file.originalName}"`);
        res.setHeader('Content-Type', file.mimetype);
        res.setHeader('Content-Length', decryptedBuffer.length);
        res.send(decryptedBuffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error downloading shared file' });
    }
};
const getSharedFileInfo = async (req, res) => {
    try {
        console.log("TOKEN RECEIVED:", req.params.token);

        const file = await File.findOne({
            shareToken: req.params.token,
            isPublic: true
        }).populate('owner', 'username email');

        console.log("ALL FILES:", await File.find());

        if (!file) {
            return res.status(404).json({ message: 'Invalid link' });
        }

        if (file.expirationDate && new Date() > file.expirationDate) {
            return res.status(410).json({ message: 'Link expired' });
        }

        res.json({
            fileName: file.originalName,
            fileSize: file.size,
            fileType: file.mimetype,
            uploadedBy: file.owner?.username || file.owner?.name || file.owner?.email,
            uploadedAt: file.createdAt,
            expiresAt: file.expirationDate
        });

    } catch (err) {
        console.error("ERROR:", err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    uploadFile,
    getFiles,
    deleteFile,
    generateShareLink,
    downloadFile,
    downloadSharedFile,
    getSharedFileInfo
};

