# Frontend Environment Configuration - Example

# Copy this file to .env and update with your environment

# ============================================

# API CONFIGURATION

# ============================================

# API Base URL

# For Local Development: http://localhost:5000/api

# For LAN Access: http://192.168.x.x:5000/api (replace with your IP)

# For Production: https://api.yourdomain.com/api

VITE_API_BASE_URL=http://localhost:5000/api

# ============================================

# APPLICATION CONFIGURATION

# ============================================

# App name (optional)

VITE_APP_NAME=SecureShare

# App version (optional)

VITE_APP_VERSION=1.0.0

# ============================================

# DEBUGGING

# ============================================

# Enable debug mode (optional)

# VITE_DEBUG=true

# ============================================

# NOTES

# ============================================

# 1. Vite uses VITE\_ prefix for environment variables

# 2. Access in JavaScript: import.meta.env.VITE_API_BASE_URL

# 3. Changes to .env require restarting npm run dev

# 4. Don't store sensitive data here (frontend is public)

# 5. For production, use your API domain instead of localhost
