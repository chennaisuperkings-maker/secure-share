const multer = require('multer');

// We use memory storage so we can encrypt the buffer before writing it to disk
const storage = multer.memoryStorage();

// File validation
const fileFilter = (req, file, cb) => {
    // You can restrict file types here if needed
    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: fileFilter
});

module.exports = upload;
