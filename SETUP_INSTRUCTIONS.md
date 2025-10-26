# Setup Instructions for Google Authentication

## Current Status

✅ All authentication code is implemented and hardcoded in the project
✅ Build is successful
⚠️ You need to add your Google OAuth credentials

## What You Need to Do

### Step 1: Get Google OAuth Credentials

Follow the detailed instructions in `GET_GOOGLE_CREDENTIALS.md` or use this quick version:

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Go to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Choose "Web application"
6. Add these URLs:
   - **Authorized JavaScript origins:** `http://localhost:3000`
   - **Authorized redirect URIs:** `http://localhost:3000/api/auth/callback/google`
7. Copy the Client ID and Client Secret

### Step 2: Update the Code

Open `src/lib/auth.ts` and replace lines 6-7:

**Replace this:**
```typescript
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE";
const GOOGLE_CLIENT_SECRET = "YOUR_GOOGLE_CLIENT_SECRET_HERE";
```

**With your actual credentials:**
```typescript
const GOOGLE_CLIENT_ID = "123456789-abc123.apps.googleusercontent.com";  // Your actual Client ID
const GOOGLE_CLIENT_SECRET = "GOCSPX-your_actual_secret";  // Your actual Client Secret
```

### Step 3: Run the Application

```bash
npm run dev
```

Then visit `http://localhost:3000`

## How to Test

1. Open the app at `http://localhost:3000`
2. You should see a "Sign in with Google" button in the top right
3. Click on any game (without signing in)
4. You should see a login modal pop up
5. Click "Sign in with Google"
6. Complete the Google sign-in flow
7. You should be redirected back and logged in
8. Your profile picture and name should appear in the nav
9. You can now play games without interruption

## File Locations

- **Authentication config:** `src/lib/auth.ts` - This is where you add your Google credentials
- **Quick setup guide:** `GET_GOOGLE_CREDENTIALS.md`
- **Detailed setup guide:** `GOOGLE_OAUTH_SETUP.md`

## Important Notes

⚠️ **Security Note:** Since the credentials are hardcoded, do NOT push this to a public GitHub repository without first moving them to environment variables or a secrets manager.

✅ **The redirect URI must be EXACTLY:** `http://localhost:3000/api/auth/callback/google`

✅ **Your Client ID will look like:** `123456789-abcdefg.apps.googleusercontent.com`

✅ **Your Client Secret will look like:** `GOCSPX-xxxxxxxxxxxx`

## Troubleshooting

### "Invalid client" error
- Double-check you copied the credentials correctly
- Make sure there are no extra spaces

### "Redirect URI mismatch" error
- Verify you added `http://localhost:3000/api/auth/callback/google` to Google Cloud Console
- Check for typos - it must match exactly

### "Access blocked" error
- Complete the OAuth consent screen in Google Cloud Console
- Add your email as a test user

### Login button doesn't work
- Open browser console (F12) to see errors
- Make sure credentials are properly pasted in `src/lib/auth.ts`

## What's Already Done

✅ NextAuth.js installed and configured
✅ Google OAuth provider set up
✅ Navigation with login button created
✅ Login modal for unauthenticated users
✅ All game pages protected with authentication
✅ User profile display when logged in
✅ Sign out functionality
✅ Build tested and working

You just need to add your Google OAuth credentials and you're ready to go!
