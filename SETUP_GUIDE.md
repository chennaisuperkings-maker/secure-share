# 🔐 Encrypted File Sharing System - Complete Setup Guide

## ✅ Project Architecture

```
Upload → File Selected
   ↓
Encrypt (AES-256-CBC) → In-Memory
   ↓
Store → /uploads/ directory + MongoDB metadata
   ↓
Share → Generate link + expiration
   ↓
Download (Public Link) → Retrieve encrypted file
   ↓
Decrypt → Browser displays file
```

---

## 📋 Prerequisites

- **Node.js** v16+ (Check: `node -v`)
- **npm** v7+ (Check: `npm -v`)
- **MongoDB** - Either:
  - **Local MongoDB** installed on your machine, OR
  - **MongoDB Atlas** (Cloud) - Free tier available at https://www.mongodb.com/cloud/atlas

---

## 🚀 STEP-BY-STEP SETUP

### **STEP 1: Prepare MongoDB Connection**

**Option A: Using Local MongoDB** (Recommended for beginners)

```
If you don't have MongoDB installed:
- Download: https://www.mongodb.com/try/download/community
- Install with default settings
- MongoDB will run on: mongodb://localhost:27017

✓ Backend .env already configured for this
```

**Option B: Using MongoDB Atlas** (Cloud - Recommended for production)

```
1. Go to: https://www.mongodb.com/cloud/atlas
2. Create free account & sign in
3. Create a new cluster (M0 Free tier)
4. Get connection string from "Connect" → "Drivers" → Python 3.6+
   Format: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/secure-file-share?retryWrites=true&w=majority
5. Update backend/.env:
   MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/secure-file-share?retryWrites=true&w=majority
```

---

### **STEP 2: Setup Backend**

#### 2.1 Install Dependencies

```powershell
cd E:\minorgit\secure-share\backend
npm install
```

Expected output:

```
added 50+ packages
```

#### 2.2 Verify .env Configuration

Check `backend/.env`:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/secure-file-share
JWT_SECRET=your_super_secret_jwt_key_change_in_production_12345
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

**For Production**, generate new keys:

```powershell
# Generate JWT Secret (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Encryption Key (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2.3 Start Backend Server

```powershell
cd E:\minorgit\secure-share\backend
npm run dev
```

Expected output:

```
✓ Server running on port 5000
✓ Connected to MongoDB
```

**Test Backend**:

```powershell
# In another PowerShell terminal, test API
curl http://localhost:5000/api/auth/login
# Should return an error (which is OK - we're just checking the server is running)
```

---

### **STEP 3: Setup Frontend**

#### 3.1 Install Dependencies

```powershell
cd E:\minorgit\secure-share\frontend
npm install
```

Expected output:

```
added 200+ packages
```

#### 3.2 Verify .env Configuration

Check `frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

#### 3.3 Start Frontend Development Server

```powershell
cd E:\minorgit\secure-share\frontend
npm run dev
```

Expected output:

```
  VITE v5.x.x  ready in XXX ms
  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
✓ API Base URL: http://localhost:5000/api
```

**Open in Browser**: http://localhost:5173

---

## ✅ TESTING THE COMPLETE WORKFLOW

### **Test 1: User Registration**

1. Go to http://localhost:5173
2. Click "Register"
3. Enter:
   - Username: `testuser`
   - Password: `password123`
4. Click "Register"
5. **Expected**: Redirected to Dashboard
6. **Check Backend logs**: Should see "Connected to MongoDB"

### **Test 2: File Upload & Encryption**

1. On Dashboard, drag & drop a file OR click upload
2. Wait for upload to complete (should show "Uploading: 100%")
3. **Backend logs should show**: File encrypted, stored in `/uploads/`
4. **Frontend should show**: File appears in the grid

### **Test 3: Download & Decryption**

1. Click the download icon on any file
2. **Expected**: File downloads to your computer
3. Open the downloaded file
4. **Expected**: File content is readable (successfully decrypted)

### **Test 4: Generate Share Link**

1. Click the share icon on any file
2. Enter expiration time: `24` (24 hours)
3. **Expected**: Link copied to clipboard
4. **Link format**: `http://localhost:5173/shared/[TOKEN]`

### **Test 5: Download Shared File (Public)**

1. Paste the share link in a new browser window
2. Or send link to someone else
3. Page should show file info: name, size, uploaded by
4. Click "Download File"
5. **Expected**: File downloads and can be decrypted

---

## 🔧 TROUBLESHOOTING

### **Issue: "Cannot find module 'mongoose'"**

```powershell
Solution: npm install in backend folder
cd backend && npm install
```

### **Issue: "Server not running" / Port 5000 Error**

```powershell
# Check if port 5000 is in use
netstat -an | findstr :5000

# Kill process on port 5000
taskkill /PID [PID] /F

# Or use different port
# Edit backend/.env: PORT=5001
```

### **Issue: "MongoDB connection failed"**

```powershell
# Check if MongoDB is running
# For local: Admin → Services → Look for "MongoDB Server"
# For Atlas: Check connection string in .env is correct

# Test connection with:
node -e "const mongoose = require('mongoose'); mongoose.connect('your-uri').then(() => console.log('✓ Connected')).catch(e => console.log('✗ Error:', e))"
```

### **Issue: "API calls failing" / CORS errors**

```
Solution: Ensure both servers are running:
- Backend: http://localhost:5000
- Frontend: http://localhost:5173
- Check .env files have correct URLs
```

### **Issue: "File won't decrypt after download"**

```
This means:
1. File was encrypted with one ENCRYPTION_KEY
2. But decrypted with a different ENCRYPTION_KEY
3. Solution: Keep ENCRYPTION_KEY same in backend/.env

The ENCRYPTION_KEY must be exactly 64 hex characters
```

---

## 📝 ENCRYPTION DETAILS

**Algorithm**: AES-256-CBC (Cipher Block Chaining)
**Key Size**: 256 bits (32 bytes = 64 hex characters)
**IV**: Random 16 bytes generated for each file

**Process**:

```
1. User uploads file
2. Generate random IV
3. Encrypt file with: AES-256-CBC + IV + ENCRYPTION_KEY
4. Store: IV + Encrypted Data (together)
5. On download: Extract IV, decrypt with AES-256-CBC
```

**Security Notes**:

- Each file has unique random IV (very secure)
- ENCRYPTION_KEY is server-side only (never sent to client)
- Password is hashed with bcrypt
- JWT tokens expire in 30 days
- Share links can have custom expiration

---

## 📦 BUILD FOR PRODUCTION

### **Build Frontend**

```powershell
cd E:\minorgit\secure-share\frontend
npm run build
```

Output: `dist/` folder

### **Deploy**

- Host `dist/` folder on web server (Vercel, Netlify, etc.)
- Update `frontend/.env` with production API URL
- Update `backend/.env` with secure secrets
- Use MongoDB Atlas for database
- Keep `ENCRYPTION_KEY` and `JWT_SECRET` safe

---

## 🎯 KEY FILES & WHAT THEY DO

| File                                    | Purpose                            |
| --------------------------------------- | ---------------------------------- |
| `backend/server.js`                     | Express app setup                  |
| `backend/routes/authRoutes.js`          | Login/Register endpoints           |
| `backend/routes/fileRoutes.js`          | Upload/Download/Share endpoints    |
| `backend/controllers/authController.js` | User registration & login logic    |
| `backend/controllers/fileController.js` | File upload, encrypt, share logic  |
| `backend/utils/encryption.js`           | AES-256 encrypt/decrypt functions  |
| `backend/models/User.js`                | User database schema               |
| `backend/models/File.js`                | File metadata database schema      |
| `backend/middleware/authMiddleware.js`  | JWT verification                   |
| `frontend/src/services/api.js`          | Axios API client with interceptors |
| `frontend/src/pages/Login.jsx`          | Login page                         |
| `frontend/src/pages/Dashboard.jsx`      | File management interface          |
| `frontend/src/pages/DownloadPage.jsx`   | Public file download page          |

---

## ✨ DEBUGGING TIPS

**Backend Debugging**:

```powershell
# Enable more verbose logging (set in server.js)
console.log("📝 Debug info:", data);

# Monitor MongoDB queries
# Add to mongoose.connect(): { debug: true }
```

**Frontend Debugging**:

```javascript
// Check API base URL
console.log("API Base URL:", api.defaults.baseURL);

// Check stored user token
console.log("Token:", JSON.parse(localStorage.getItem("userInfo")).token);

// Check encryption/decryption
console.log("File encrypted buffer size:", encryptedBuffer.length);
```

**Test API Directly** (PowerShell):

```powershell
# Register user
$body = @{username="test"; password="pass123"} | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:5000/api/auth/register -Method POST -ContentType "application/json" -Body $body

# Login
Invoke-WebRequest -Uri http://localhost:5000/api/auth/login -Method POST -ContentType "application/json" -Body $body
```

---

## 📞 QUICK COMMAND REFERENCE

```powershell
# Install ALL dependencies
cd backend && npm install && cd ../frontend && npm install

# Start backend
cd backend && npm run dev

# Start frontend (new terminal)
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Check if servers are running
curl http://localhost:5000/api/auth/login
curl http://localhost:5173

# View logs
# Ctrl+C to stop server
# npm run dev again to restart with fresh logs
```

---

✅ **You're all set! Happy file sharing! 🎉**
