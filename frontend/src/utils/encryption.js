/**
 * Client-side AES-256-GCM Encryption & Decryption
 * 
 * Security Features:
 * - AES-256-GCM for authenticated encryption
 * - 12-byte random IV (nonce) per encryption
 * - Authentication tag for tampering detection
 * - No IV reuse with same key
 * - Secure random generation using crypto.getRandomValues()
 */

/**
 * Generates a 256-bit (32-byte) encryption key from a password/seed
 * Using PBKDF2 for key derivation
 * 
 * @param {string} password - Password/seed for key derivation
 * @returns {Promise<CryptoKey>} - AES-256 key suitable for WebCrypto
 */
async function deriveKey(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // Use PBKDF2 to derive a key from password
    const baseKey = await crypto.subtle.importKey(
        'raw',
        data,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );
    
    // Derive 256-bit key using PBKDF2
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: new Uint8Array(16), // Static salt for now (in production, use dynamic salt)
            iterations: 100000,
            hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
    
    return key;
}

/**
 * Generates a random 32-byte (256-bit) encryption key
 * 
 * @returns {Promise<CryptoKey>} - Random AES-256 key
 */
async function generateRandomKey() {
    const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true, // Extractable - allows export to sessionStorage (cleared on tab close)
        ['encrypt', 'decrypt']
    );
    
    return key;
}

/**
 * Encrypts a file using AES-256-GCM
 * 
 * ENCRYPTION FLOW:
 * 1. Read file as ArrayBuffer
 * 2. Generate random 12-byte IV
 * 3. Use AES-256-GCM with key + IV
 * 4. Return { ciphertext, iv, authTag }
 * 
 * @param {File} file - File object from file input
 * @param {CryptoKey} key - AES-256 encryption key
 * @returns {Promise<{ciphertext: Uint8Array, iv: Uint8Array, authTag: Uint8Array}>}
 * @throws {Error} If encryption fails or file cannot be read
 */
async function encryptFile(file, key) {
    try {
        // Step 1: Read file as ArrayBuffer
        const fileBuffer = await file.arrayBuffer();
        
        // Step 2: Generate random 12-byte IV (nonce)
        // IV MUST be unique per encryption with the same key
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Step 3: Encrypt using AES-256-GCM
        const ciphertext = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            fileBuffer
        );
        
        // Step 4: GCM automatically provides authentication tag (last 16 bytes)
        const ciphertextArray = new Uint8Array(ciphertext);
        const authTag = ciphertextArray.slice(-16); // Last 16 bytes are auth tag
        const encryptedData = ciphertextArray.slice(0, -16); // Actual ciphertext
        
        // Development logging (only in development)
        if (process.env.NODE_ENV === 'development') {
            console.log(
                '✅ [ENCRYPTION SUCCESS]',
                {
                    originalSize: fileBuffer.byteLength,
                    encryptedSize: encryptedData.byteLength,
                    ivHex: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
                    authTagHex: Array.from(authTag).map(b => b.toString(16).padStart(2, '0')).join('')
                }
            );
        }
        
        return {
            ciphertext: encryptedData,
            iv: iv,
            authTag: authTag
        };
    } catch (error) {
        console.error('❌ [ENCRYPTION FAILED]', error);
        throw new Error(`Encryption failed: ${error.message}`);
    }
}

/**
 * Decrypts an encrypted file using AES-256-GCM
 * 
 * DECRYPTION FLOW:
 * 1. Reconstruct ciphertext with auth tag
 * 2. Use AES-256-GCM to decrypt
 * 3. Validate authentication (GCM checks integrity)
 * 4. Return decrypted buffer
 * 
 * SECURITY:
 * - If authTag is invalid → GCM raises error
 * - If data is tampered → GCM raises error
 * - Tampering is IMMEDIATELY detected
 * 
 * @param {Uint8Array} encryptedData - Encrypted ciphertext (without auth tag)
 * @param {Uint8Array} iv - 12-byte IV used during encryption
 * @param {Uint8Array} authTag - 16-byte authentication tag from encryption
 * @param {CryptoKey} key - Same AES-256 key used for encryption
 * @returns {Promise<ArrayBuffer>} - Decrypted file data
 * @throws {Error} If decryption fails, auth fails, or data is tampered
 */
async function decryptFile(encryptedData, iv, authTag, key) {
    try {
        // Step 1: Reconstruct full ciphertext (encrypted data + auth tag)
        const fullCiphertext = new Uint8Array(encryptedData.length + authTag.length);
        fullCiphertext.set(encryptedData, 0);
        fullCiphertext.set(authTag, encryptedData.length);
        
        // Step 2: Decrypt using AES-256-GCM
        // NOTE: If authTag is invalid or data is tampered, this throws an error
        const decrypted = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            fullCiphertext
        );
        
        // Step 3: Success - file integrity verified
        if (process.env.NODE_ENV === 'development') {
            console.log(
                '✅ [DECRYPTION SUCCESS - FILE INTEGRITY VERIFIED]',
                {
                    decryptedSize: decrypted.byteLength,
                    ivHex: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
                    authTagHex: Array.from(authTag).map(b => b.toString(16).padStart(2, '0')).join('')
                }
            );
        }
        
        return decrypted;
    } catch (error) {
        console.error('❌ [DECRYPTION FAILED - POSSIBLE TAMPERING]', error);
        
        // Provide specific error messages
        if (error.message.includes('Unsupported state or unable to decrypt')) {
            throw new Error('File integrity compromised. Authentication tag verification failed. The file may have been tampered with.');
        }
        
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

/**
 * Exports encryption key to raw bytes for storage/transmission
 * Use with caution - store securely
 * 
 * @param {CryptoKey} key - Key to export
 * @returns {Promise<Uint8Array>} - Raw key bytes
 */
async function exportKey(key) {
    const exported = await crypto.subtle.exportKey('raw', key);
    return new Uint8Array(exported);
}

/**
 * Imports raw key bytes back to CryptoKey
 * 
 * @param {Uint8Array} keyBytes - Raw key bytes (32 bytes for AES-256)
 * @returns {Promise<CryptoKey>} - Imported key
 */
async function importKey(keyBytes) {
    const key = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
    
    return key;
}

/**
 * Converts Uint8Array to hex string for storage/logging
 * 
 * @param {Uint8Array} bytes - Bytes to convert
 * @returns {string} - Hex string
 */
function bytesToHex(bytes) {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Converts hex string back to Uint8Array
 * 
 * @param {string} hex - Hex string
 * @returns {Uint8Array} - Bytes
 */
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

export {
    deriveKey,
    generateRandomKey,
    encryptFile,
    decryptFile,
    exportKey,
    importKey,
    bytesToHex,
    hexToBytes
};
