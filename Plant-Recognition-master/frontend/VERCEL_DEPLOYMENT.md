# Vercel Deployment Guide

## Environment Variables Setup

### For Development
The `.env` file contains local development variables:
```
VITE_BACKEND_URL=http://localhost:5000
```

### For Vercel Deployment

1. **Configure Backend URL in Vercel**
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add a new environment variable:
     - **Name:** `VITE_BACKEND_URL`
     - **Value:** Your deployed backend URL (e.g., `https://your-backend.com`)
     - **Environments:** Select Production, Preview, and Development as needed

2. **Supported Backend Deployment Options**
   - Node.js/Express backend deployed on Vercel
   - Backend on Render.com
   - Backend on Railway
   - Backend on AWS/DigitalOcean/any cloud provider
   - Example: `https://plant-api.yourdomain.com`

## How Vite Exposes Environment Variables

Your frontend uses Vite, which automatically exposes variables prefixed with `VITE_` as `import.meta.env.*`:

```javascript
// In your App.jsx
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
```

## Build Configuration

The `vercel.json` file tells Vercel how to build your project:
```json
{
  "buildCommand": "npm run build",
  "framework": "vite",
  "env": {
    "VITE_BACKEND_URL": "@vite_backend_url"
  }
}
```

## Deployment Steps

1. **Push to GitHub**
   ```bash
   cd frontend
   git add .
   git commit -m "Add environment configuration for Vercel"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `frontend` directory as root

3. **Configure Environment Variables**
   - In project settings, add `VITE_BACKEND_URL`
   - Set it to your backend deployment URL
   - Click "Deploy"

4. **Test the Deployment**
   - Once deployed, test image upload to verify backend connection works

## Important Notes

- Do NOT commit `.env` file to git (it's in .gitignore)
- Use `.env.example` to document required variables
- The `VITE_` prefix is required for Vite to expose variables to the browser
- Always use HTTPS for production URLs
- Backend must support CORS from your Vercel domain

## Common Issues

**"Failed to connect to backend"**
- Verify `VITE_BACKEND_URL` is set in Vercel environment variables
- Check that your backend URL is correctly formatted
- Ensure your backend has CORS enabled for your Vercel domain

**Variables not working**
- Rebuild/redeploy after changing environment variables
- Check that variable names start with `VITE_`
- Verify the build command runs successfully

## Troubleshooting

1. Check Vercel build logs for errors
2. Use browser DevTools Network tab to verify API calls
3. Enable CORS on your backend for your Vercel deployment URL
