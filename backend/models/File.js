const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    // Client-side encryption metadata
    // IV (Initialization Vector) - 12 bytes for AES-GCM, stored as hex string
    encryptionIv: {
        type: String,
        required: false,
        description: 'Base64-encoded 12-byte IV from client-side AES-256-GCM encryption'
    },
    // Authentication tag - 16 bytes from AES-GCM, stored as hex string
    encryptionAuthTag: {
        type: String,
        required: false,
        description: 'Base64-encoded 16-byte auth tag from AES-256-GCM for tampering detection'
    },
    // For backward compatibility - whether this file was encrypted on client or server
    encryptedOnClient: {
        type: Boolean,
        default: false
    },
    shareToken: {
        type: String,
        default: null
    },
    expirationDate: {
        type: Date,
        default: null
    },
    isPublic: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('File', fileSchema);
