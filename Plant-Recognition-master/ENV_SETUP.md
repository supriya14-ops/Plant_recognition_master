# Environment Variables Setup Guide

## Overview

Both the backend and frontend now use environment variables to manage sensitive data like the Gemini API key and configuration URLs. This approach:
- ✅ Keeps API keys out of version control
- ✅ Allows different configurations for development, staging, and production
- ✅ Makes deployment to Vercel and other platforms easier
- ✅ Improves security

## Backend Setup

### Required Environment Variable

**`GEMINI_API_KEY`** - Your Google Gemini API key (Required)
- Get it from: https://ai.google.dev/
- Sign in with your Google account
- Create a new API project
- Copy your API key

### Optional Environment Variables

**`PORT`** - Server port (default: 5000)

### Files

- **`.env`** - Development configuration (not committed to git)
- **`.env.production`** - Production configuration template
- **`.env.example`** - Template showing required variables

### Setup Steps

1. **Get your Gemini API Key**
   - Go to https://ai.google.dev/
   - Click "Get API Key"
   - Create a new project (if needed)
   - Copy the API key

2. **Add to .env file**
   ```bash
   GEMINI_API_KEY=your-actual-api-key-here
   PORT=5000
   ```

3. **Install dependencies with dotenv support**
   ```bash
   npm install
   ```

4. **Run the server**
   ```bash
   npm start
   # or
   node server.js
   ```

### Verification

The server will display an error and exit if `GEMINI_API_KEY` is not set:
```
ERROR: GEMINI_API_KEY environment variable is not set. Please add it to your .env file.
```

## Frontend Setup

### Environment Variables

**`VITE_BACKEND_URL`** - Backend API URL (required)
- Development: `http://localhost:5000`
- Production: Your deployed backend URL (e.g., `https://your-api.fly.dev`)

**`VITE_GEMINI_API_KEY`** - Optional, only if frontend needs direct Gemini access
- Currently, the frontend calls the backend API, so this is optional
- Use if you implement client-side AI features in the future

### Files

- **`.env`** - Development configuration
- **`.env.production`** - Production configuration
- **`.env.example`** - Template for required variables

### Setup Steps

1. **Update .env file**
   ```
   VITE_BACKEND_URL=http://localhost:5000
   ```

2. **For production deployment (Vercel)**
   - Update `.env.production` with your production backend URL
   - Or set environment variables in Vercel dashboard:
     - Dashboard → Settings → Environment Variables
     - Add: `VITE_BACKEND_URL` = `https://your-backend-domain.com`

3. **Usage in code**
   ```javascript
   const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
   ```

## Deployment

### Backend Deployment (Render, Railway, Fly.io, etc.)

1. Create an account on your chosen platform
2. Set environment variable `GEMINI_API_KEY` in the platform's dashboard
3. Deploy your backend code
4. Copy the deployment URL (e.g., `https://plant-api.onrender.com`)

### Frontend Deployment (Vercel)

1. Push your code to GitHub
2. Connect GitHub repo to Vercel
3. Select `frontend` directory as root
4. Add environment variable in Vercel:
   - Name: `VITE_BACKEND_URL`
   - Value: Your backend deployment URL
5. Deploy

## Security Best Practices

✅ **DO:**
- Keep `.env` files in `.gitignore`
- Use different API keys for development and production
- Rotate API keys periodically
- Set API key quotas/limits in Google Cloud Console

❌ **DON'T:**
- Commit `.env` files to git
- Share API keys in emails or messages
- Hardcode values in source code
- Push sensitive data to public repositories

## Troubleshooting

### Backend Issues

**Error: "GEMINI_API_KEY environment variable is not set"**
- Solution: Check that `.env` file exists in backend directory with your API key

**Error: "GEMINI_API_KEY quota exceeded"**
- Solution: Check your API usage in Google Cloud Console

### Frontend Issues

**Error: "Failed to connect to server"**
- Check `VITE_BACKEND_URL` is set correctly
- Verify backend is running
- Check backend has CORS enabled for your frontend URL

**Variables not loaded**
- Restart your dev server after changing `.env` file
- For Vercel: Redeploy after changing environment variables

## File Structure

```
Plant-Recognition-master/
├── frontend/
│   ├── .env                 # Development env vars (not in git)
│   ├── .env.production      # Production env template
│   ├── .env.example         # Template documentation
│   ├── .gitignore           # Includes .env files
│   └── src/
│       └── App.jsx          # Uses VITE_BACKEND_URL
│
└── backend/
    ├── .env                 # Development env vars (not in git)
    ├── .env.production      # Production env template
    ├── .env.example         # Template documentation
    ├── .gitignore           # Includes .env files
    ├── server.js            # Reads GEMINI_API_KEY
    └── package.json         # Includes dotenv dependency
```

## Environment Variable Reference

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | - | Your Google Gemini API key |
| `PORT` | No | 5000 | Port to run the server on |

### Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_BACKEND_URL` | No | http://localhost:5000 | Backend API URL |
| `VITE_GEMINI_API_KEY` | No | - | Gemini API key (if needed) |

## Getting Help

- Google Gemini API Docs: https://ai.google.dev/docs
- Vite Environment Variables: https://vitejs.dev/guide/env-and-mode.html
- dotenv Documentation: https://www.npmjs.com/package/dotenv
