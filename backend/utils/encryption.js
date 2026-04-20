const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

const getKey = () => {
    const key = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    return Buffer.from(key.substring(0, 64), 'hex');
};

const encryptBuffer = (buffer) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(buffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Prepend the IV to the encrypted data
    return Buffer.concat([iv, encrypted]);
};

const decryptBuffer = (buffer) => {
    try {
        const iv = buffer.slice(0, IV_LENGTH);
        const encryptedText = buffer.slice(IV_LENGTH);
        const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('File decryption failed');
    }
};

module.exports = {
    encryptBuffer,
    decryptBuffer
};
