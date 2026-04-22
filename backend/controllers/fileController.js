const File = require('../models/File');
const fs = require('fs');
const path = require('path');
const { decryptBuffer } = require('../utils/encryption');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Ensure uploads dir exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// ================= UPLOAD =================
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // ✅ STRICT: Require encryption
        if (!req.body.encryptionIv || !req.body.encryptionAuthTag) {
            return res.status(400).json({
                message: "File must be encrypted on client before upload"
            });
        }

        console.log("REQ.BODY:", req.body);

        const storageFilename = crypto.randomBytes(16).toString('hex') + path.extname(req.file.originalname);
        const storagePath = path.join(UPLOADS_DIR, storageFilename);

        const fileBuffer = req.file.buffer;

        console.log('✅ [SECURE] Client-side encrypted file received');

        fs.writeFileSync(storagePath, fileBuffer);

        const fileDoc = await File.create({
            filename: storageFilename,
            originalName: req.file.originalname,
            owner: req.user._id,
            size: req.file.size,
            mimetype: req.file.mimetype,

            encryptionIv: req.body.encryptionIv,
            encryptionAuthTag: req.body.encryptionAuthTag,
            encryptedOnClient: true
        });

        res.status(201).json(fileDoc);

    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({ message: 'Server error during upload' });
    }
};

// ================= GET FILES =================
const getFiles = async (req, res) => {
    try {
        const files = await File.find({ owner: req.user._id }).sort({ createdAt: -1 });
        res.json(files);
    } catch {
        res.status(500).json({ message: 'Server error fetching files' });
    }
};

// ================= DELETE =================
const deleteFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) return res.status(404).json({ message: 'File not found' });

        if (file.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const filePath = path.join(UPLOADS_DIR, file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await file.deleteOne();
        res.json({ message: 'File removed' });

    } catch {
        res.status(500).json({ message: 'Server error deleting file' });
    }
};

// ================= SHARE LINK =================
const generateShareLink = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) return res.status(404).json({ message: 'File not found' });

        if (file.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const shareToken = crypto.randomBytes(20).toString('hex');

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

        res.json({ shareToken, expirationDate, shareUrl });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating share link' });
    }
};

// ================= DOWNLOAD =================
const downloadFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) return res.status(404).json({ message: 'File not found' });

        if (file.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const filePath = path.join(UPLOADS_DIR, file.filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File missing' });
        }

        const fileBuffer = fs.readFileSync(filePath);

        // ✅ Send encrypted file
        if (file.encryptedOnClient) {
            res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
            res.setHeader('Content-Type', file.mimetype);

            res.setHeader('X-Encryption-IV', file.encryptionIv);
            res.setHeader('X-Encryption-Auth-Tag', file.encryptionAuthTag);
            res.setHeader('X-Encrypted-On-Client', 'true');

            return res.send(fileBuffer);
        }

        // fallback (optional)
        const decryptedBuffer = decryptBuffer(fileBuffer);
        res.send(decryptedBuffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Download error' });
    }
};

// ================= SHARED DOWNLOAD =================
const downloadSharedFile = async (req, res) => {
    try {
        const file = await File.findOne({
            shareToken: req.params.token,
            isPublic: true
        });

        if (!file) return res.status(404).json({ message: 'Invalid link' });

        const filePath = path.join(UPLOADS_DIR, file.filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File missing' });
        }

        const fileBuffer = fs.readFileSync(filePath);

        res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
        res.setHeader('Content-Type', file.mimetype);

        res.setHeader('X-Encryption-IV', file.encryptionIv);
        res.setHeader('X-Encryption-Auth-Tag', file.encryptionAuthTag);
        res.setHeader('X-Encrypted-On-Client', 'true');

        res.send(fileBuffer);

    } catch {
        res.status(500).json({ message: 'Shared download error' });
    }
};

// ================= SHARED INFO =================
const getSharedFileInfo = async (req, res) => {
    try {
        const file = await File.findOne({
            shareToken: req.params.token,
            isPublic: true
        }).populate('owner', 'username email');

        if (!file) return res.status(404).json({ message: 'Invalid link' });

        res.json({
            fileName: file.originalName,
            fileSize: file.size,
            fileType: file.mimetype,
            uploadedBy: file.owner?.username || file.owner?.email,
            uploadedAt: file.createdAt
        });

    } catch {
        res.status(500).json({ message: 'Error fetching file info' });
    }
};

module.exports = {
    uploadFile,
    getFiles,
    deleteFile,
    generateShareLink,   // ✅ FIXED
    downloadFile,
    downloadSharedFile,
    getSharedFileInfo    // ✅ FIXED
};