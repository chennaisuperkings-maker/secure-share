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
