# Quick Guide: Get Google OAuth Credentials

## Step 1: Go to Google Cloud Console
Visit: https://console.cloud.google.com/

## Step 2: Create a New Project (if you don't have one)
1. Click the project dropdown at the top
2. Click "New Project"
3. Name it "Prompt Royale" (or anything you like)
4. Click "Create"

## Step 3: Enable Google+ API (Optional but recommended)
1. Go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click "Enable"

## Step 4: Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External"
3. Click "Create"
4. Fill in:
   - App name: `Prompt Royale`
   - User support email: Your email
   - Developer contact: Your email
5. Click "Save and Continue" through all the steps
6. Add your email as a test user if in testing mode

## Step 5: Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "+ CREATE CREDENTIALS" > "OAuth client ID"
3. Application type: "Web application"
4. Name: "Prompt Royale Web"
5. **Authorized JavaScript origins:**
   - Add: `http://localhost:3000`
6. **Authorized redirect URIs:**
   - Add: `http://localhost:3000/api/auth/callback/google`
7. Click "Create"
8. **COPY** the Client ID and Client Secret shown in the popup

## Step 6: Update the Code
Open `src/lib/auth.ts` and replace:

```typescript
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE";
const GOOGLE_CLIENT_SECRET = "YOUR_GOOGLE_CLIENT_SECRET_HERE";
```

With your actual credentials:

```typescript
const GOOGLE_CLIENT_ID = "123456789-abcdefghijklmnop.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "GOCSPX-your_secret_here";
```

## Step 7: Test
1. Run `npm run dev`
2. Go to `http://localhost:3000`
3. Click "Sign in with Google"
4. You should be redirected to Google login

## Important Notes
- Keep your Client Secret private (don't share it publicly)
- The redirect URI must EXACTLY match: `http://localhost:3000/api/auth/callback/google`
- If you deploy to production, add your production URL to authorized origins and redirect URIs

## Troubleshooting

### "Redirect URI mismatch"
- Make sure you added `http://localhost:3000/api/auth/callback/google` to redirect URIs
- Check for typos - it must be exact

### "Access blocked: This app's request is invalid"
- Make sure you completed the OAuth consent screen setup
- Add your email as a test user in the consent screen settings

### "Invalid client"
- Double-check you copied the Client ID and Secret correctly
- Make sure there are no extra spaces when pasting
