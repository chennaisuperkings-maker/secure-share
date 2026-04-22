/\*\*

- ========================================
- API DOCUMENTATION
- END-TO-END ENCRYPTED FILE SHARING
- ========================================
  \*/

// ============================================
// POST /api/files/upload
// ============================================
/\*
DESCRIPTION:
Upload an encrypted file to the server.
Files MUST be encrypted on the client-side before upload.

AUTHENTICATION:
✅ Required - Bearer JWT token in Authorization header

METHOD: POST
CONTENT-TYPE: multipart/form-data

REQUEST BODY:
{
file: File (multipart), // Encrypted file binary data
encryptionIv: string (base64), // 12-byte IV from AES-256-GCM
encryptionAuthTag: string (base64) // 16-byte auth tag from AES-256-GCM
}

RESPONSE (201 Created):
{
\_id: ObjectId,
filename: string, // Storage name (e.g., abc123def456)
originalName: string, // Original filename with extension
owner: ObjectId, // User ID
size: number, // File size in bytes
mimetype: string, // MIME type
encryptionIv: string, // Stored IV (base64)
encryptionAuthTag: string, // Stored auth tag (base64)
encryptedOnClient: boolean, // true (client-side encryption)
shareToken: null,
expirationDate: null,
isPublic: boolean,
createdAt: Date,
updatedAt: Date
}

RESPONSE (400 Bad Request):
{
message: "No file uploaded"
}

RESPONSE (401 Unauthorized):
{
message: "Unauthorized"
}

RESPONSE (500 Server Error):
{
message: "Server error during upload"
}

SECURITY NOTES:
✅ Original plaintext file NEVER reaches server
✅ Only encrypted ciphertext is uploaded
✅ IV and authTag stored for later decryption
✅ Server cannot decrypt the file (key on client)
✅ File integrity guaranteed by authTag

EXAMPLE USAGE (Frontend):

```javascript
const encryptionKey = await generateRandomKey();
const encrypted = await encryptFile(file, encryptionKey);

const formData = new FormData();
formData.append("file", new Blob([encrypted.ciphertext]));
formData.append("encryptionIv", btoa(String.fromCharCode(...encrypted.iv)));
formData.append(
  "encryptionAuthTag",
  btoa(String.fromCharCode(...encrypted.authTag)),
);

await api.post("/files/upload", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});
```

\*/

// ============================================
// GET /api/files
// ============================================
/\*
DESCRIPTION:
Retrieve list of uploaded files for authenticated user.

AUTHENTICATION:
✅ Required - Bearer JWT token

METHOD: GET

RESPONSE (200 OK):
[
{
_id: ObjectId,
filename: string,
originalName: string,
owner: ObjectId,
size: number,
mimetype: string,
encryptionIv: string,
encryptionAuthTag: string,
encryptedOnClient: boolean,
shareToken: string | null,
expirationDate: Date | null,
isPublic: boolean,
createdAt: Date,
updatedAt: Date
},
...
]

RESPONSE (401 Unauthorized):
{
message: "Unauthorized"
}

RESPONSE (500 Server Error):
{
message: "Server error fetching files"
}

SECURITY NOTES:
✅ Only returns files owned by authenticated user
✅ Returns IV and authTag (needed for decryption)
✅ Does NOT return plaintext data
✅ Frontend handles decryption locally
\*/

// ============================================
// GET /api/files/download/:id
// ============================================
/\*
DESCRIPTION:
Download an encrypted file for the owner.
File remains encrypted on download - frontend decrypts.

AUTHENTICATION:
✅ Required - Bearer JWT token
✅ User must be file owner

METHOD: GET
PARAMETERS:
{
id: string (MongoDB ObjectId)
}

RESPONSE HEADERS (200 OK):
{
'Content-Type': 'application/octet-stream' (or original MIME type),
'Content-Disposition': 'attachment; filename\*=UTF-8\\'\\'{encoded}\\'; filename="{name}"',
'Content-Length': string,
'X-Encrypted-On-Client': 'true', // File was client-encrypted
'X-Encryption-IV': string (base64), // 12-byte IV for decryption
'X-Encryption-Auth-Tag': string (base64) // 16-byte auth tag
}

RESPONSE BODY:
Binary encrypted file data (ciphertext only, no IV/authTag prepended)

RESPONSE (404 Not Found):
{
message: "File not found"
}

RESPONSE (401 Unauthorized):
{
message: "Not authorized to download this file"
}

RESPONSE (500 Server Error):
{
message: "Server error downloading file"
}

SECURITY NOTES:
✅ File served encrypted (ciphertext)
✅ IV and authTag in headers (for frontend decryption)
✅ Server does NOT decrypt client-encrypted files
✅ Ownership verified via JWT token
✅ File integrity guaranteed by authTag

EXAMPLE USAGE (Frontend):

```javascript
const response = await api.get(`/api/files/download/${fileId}`, {
  responseType: "blob",
});

const iv = new Uint8Array(
  atob(response.headers["x-encryption-iv"])
    .split("")
    .map((c) => c.charCodeAt(0)),
);
const authTag = new Uint8Array(
  atob(response.headers["x-encryption-auth-tag"])
    .split("")
    .map((c) => c.charCodeAt(0)),
);
const encryptedData = new Uint8Array(await response.data.arrayBuffer());

const decrypted = await decryptFile(encryptedData, iv, authTag, encryptionKey);
```

\*/

// ============================================
// DELETE /api/files/:id
// ============================================
/\*
DESCRIPTION:
Delete a file and its encrypted data from server.

AUTHENTICATION:
✅ Required - Bearer JWT token
✅ User must be file owner

METHOD: DELETE
PARAMETERS:
{
id: string (MongoDB ObjectId)
}

RESPONSE (200 OK):
{
message: "File removed"
}

RESPONSE (404 Not Found):
{
message: "File not found"
}

RESPONSE (401 Unauthorized):
{
message: "Not authorized to delete this file"
}

RESPONSE (500 Server Error):
{
message: "Server error deleting file"
}

SECURITY NOTES:
✅ Only file owner can delete
✅ Encrypted file data deleted from disk
✅ Database record deleted
✅ Irreversible operation
\*/

// ============================================
// POST /api/files/:id/share
// ============================================
/\*
DESCRIPTION:
Generate a shareable link for a file.
Link can be shared publicly, but file remains encrypted.

AUTHENTICATION:
✅ Required - Bearer JWT token
✅ User must be file owner

METHOD: POST
PARAMETERS:
{
id: string (MongoDB ObjectId)
}

REQUEST BODY (optional):
{
expiresInHours: number // Link expiration time (optional)
}

RESPONSE (200 OK):
{
shareToken: string, // Random token for share link
expirationDate: Date | null, // When link expires (null = never)
shareUrl: string // Complete shareable URL
}

RESPONSE (404 Not Found):
{
message: "File not found"
}

RESPONSE (401 Unauthorized):
{
message: "Not authorized to share this file"
}

RESPONSE (500 Server Error):
{
message: "Server error generating link"
}

EXAMPLE RESPONSE:
{
"shareToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
"expirationDate": "2025-12-22T15:30:00Z",
"shareUrl": "http://localhost:5173/shared/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}

SECURITY NOTES:
✅ File remains encrypted
✅ Shareable link contains only token (not encryption key)
✅ Recipient must know password (shared separately)
✅ Password used to derive same encryption key
✅ Link can expire automatically
✅ Token is random and not guessable
\*/

// ============================================
// GET /api/files/shared/:token
// ============================================
/\*
DESCRIPTION:
Download a file via public shareable link.
File is encrypted - frontend must decrypt with password.

AUTHENTICATION:
❌ NOT required - Public endpoint

METHOD: GET
PARAMETERS:
{
token: string (shareable link token)
}

RESPONSE HEADERS (200 OK):
{
'Content-Type': 'application/octet-stream',
'Content-Disposition': 'attachment; filename\*=UTF-8\\'\\'{encoded}\\'; filename="{name}"',
'Content-Length': string,
'X-Encrypted-On-Client': 'true',
'X-Encryption-IV': string (base64),
'X-Encryption-Auth-Tag': string (base64)
}

RESPONSE BODY:
Binary encrypted file data

RESPONSE (404 Not Found):
{
message: "Invalid or expired share link"
}

RESPONSE (410 Gone):
{
message: "Share link has expired"
}

RESPONSE (500 Server Error):
{
message: "Server error downloading shared file"
}

DECRYPTION FLOW:

1. Recipient opens shared link
2. Frontend downloads encrypted file + metadata
3. Frontend prompts: "Enter decryption password"
4. Frontend derives key from password using PBKDF2
5. Frontend decrypts using AES-256-GCM
   - If password wrong → authTag validation fails → error
   - If tampering detected → authTag validation fails → error
   - If valid → file decrypted successfully
6. Frontend triggers browser download

SECURITY NOTES:
✅ No authentication required (public)
✅ File served encrypted
✅ Password-based key derivation (PBKDF2)
✅ 100,000 iterations against brute-force
✅ File integrity guaranteed by authTag
✅ Tampering immediately detected
✅ Link can have expiration time
\*/

// ============================================
// GET /api/files/info/:token
// ============================================
/\*
DESCRIPTION:
Retrieve metadata about a shared file without downloading it.

AUTHENTICATION:
❌ NOT required - Public endpoint

METHOD: GET
PARAMETERS:
{
token: string (shareable link token)
}

RESPONSE (200 OK):
{
fileName: string, // Original filename
fileSize: number, // File size in bytes
fileType: string, // MIME type
uploadedBy: string, // Username/email of uploader
uploadedAt: Date, // Upload timestamp
expiresAt: Date | null // Share expiration
}

RESPONSE (404 Not Found):
{
message: "Invalid link"
}

RESPONSE (410 Gone):
{
message: "Link expired"
}

RESPONSE (500 Server Error):
{
message: "Server error"
}

SECURITY NOTES:
✅ Only metadata revealed (filename, size, type)
✅ File content NOT accessed
✅ No password/decryption needed
✅ Public information only
\*/

// ============================================
// ENCRYPTION WORKFLOW SUMMARY
// ============================================

/\*
OWNER UPLOADING FILE:

1. Frontend: File → AES-256-GCM encrypt → (ciphertext, IV, authTag)
2. Frontend: Store IV, authTag, key (sessionStorage)
3. Frontend: POST /api/files/upload (ciphertext + IV + authTag)
4. Backend: Receive encrypted data
5. Backend: Check if client-encrypted ✓ Yes
6. Backend: Store encrypted data as-is (no re-encryption)
7. Backend: Save IV, authTag to database
8. Backend: Send 201 Created response

OWNER DOWNLOADING OWN FILE:

1. Frontend: GET /api/files/download/:id
2. Backend: Find file, check ownership ✓
3. Backend: Check if client-encrypted ✓ Yes
4. Backend: Send encrypted data + IV + authTag (headers)
5. Frontend: Retrieve IV, authTag from response headers
6. Frontend: Retrieve key from sessionStorage
7. Frontend: AES-256-GCM decrypt (ciphertext + IV + authTag + key)
8. Frontend: Verify authTag ✓ OK → File integrity confirmed
9. Frontend: Trigger browser download of decrypted file

RECIPIENT DOWNLOADING SHARED FILE:

1. Frontend: GET /api/files/shared/:token
2. Backend: Check if share link valid ✓
3. Backend: Check if not expired ✓
4. Backend: Send encrypted data + IV + authTag (headers)
5. Frontend: Prompt user for password
6. Frontend: PBKDF2 derive key from password (100k iterations)
7. Frontend: AES-256-GCM decrypt (ciphertext + IV + authTag + derived_key)
8. Frontend: Verify authTag
   - If wrong password → authTag fails → "File integrity compromised"
   - If tampered → authTag fails → "File integrity compromised"
   - If valid → "File decrypted successfully"
9. Frontend: Trigger browser download of decrypted file
   \*/

// ============================================
// ERROR HANDLING
// ============================================

/\*
UPLOAD ERRORS:

- "No file uploaded" → Multipart form data missing
- "Server error during upload" → Check backend logs
- "Encryption failed" → Frontend encryption utility error

DOWNLOAD ERRORS:

- "File not found" → File ID invalid or deleted
- "Not authorized to download this file" → Not file owner
- "File integrity compromised" → Tampering detected (wrong password for shared files)
- "Server error downloading file" → Backend error

SHARED DOWNLOAD ERRORS:

- "Invalid or expired share link" → Token not found or invalid
- "Share link has expired" → Expiration date passed
- "File integrity compromised" → Password wrong or data tampered
- "Server error downloading shared file" → Backend error

DECRYPTION ERRORS (Frontend):

- "Missing encryption metadata" → IV or authTag missing
- "Encryption key not found" → Key not in sessionStorage
- "File integrity compromised" → authTag validation failed
- "Decryption failed" → General decryption error
  \*/

export { };
