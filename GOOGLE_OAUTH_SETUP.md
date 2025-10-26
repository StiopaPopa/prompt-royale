# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for the Prompt Royale application.

## Prerequisites

- A Google account
- Access to the Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "Prompt Royale")
5. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, select your project
2. Go to "APIs & Services" > "Library"
3. Search for "Google+ API"
4. Click on it and press "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" as the user type
3. Click "Create"
4. Fill in the required information:
   - App name: Prompt Royale
   - User support email: Your email
   - Developer contact information: Your email
5. Click "Save and Continue"
6. On the "Scopes" page, click "Save and Continue" (no additional scopes needed)
7. On the "Test users" page (if in testing mode), add your email as a test user
8. Click "Save and Continue"
9. Review and click "Back to Dashboard"

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Enter a name (e.g., "Prompt Royale Web Client")
5. Under "Authorized JavaScript origins", add:
   - `http://localhost:3000` (for local development)
   - Your production URL when deploying
6. Under "Authorized redirect URIs", add:
   - `http://localhost:3000/api/auth/callback/google` (for local development)
   - `https://your-production-domain.com/api/auth/callback/google` (for production)
7. Click "Create"
8. Copy the "Client ID" and "Client Secret" that are displayed

## Step 5: Configure Environment Variables

1. Create a `.env.local` file in the root of your project (if it doesn't exist)
2. Add the following environment variables:

```env
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

3. Generate a secure `NEXTAUTH_SECRET` by running:
```bash
openssl rand -base64 32
```

4. Replace the placeholder values with your actual credentials

## Step 6: Test the Authentication

1. Start your development server:
```bash
npm run dev
```

2. Navigate to `http://localhost:3000`
3. Click the "Sign in with Google" button in the top right
4. You should be redirected to Google's login page
5. After signing in, you should be redirected back to your application

## Production Deployment

When deploying to production:

1. Update `NEXTAUTH_URL` to your production URL
2. Add your production domain to the "Authorized JavaScript origins" in Google Cloud Console
3. Add the production callback URL to "Authorized redirect URIs"
4. Ensure all environment variables are set in your production environment

## Troubleshooting

### "Redirect URI mismatch" error
- Make sure the redirect URI in Google Cloud Console exactly matches the one NextAuth is using
- The format should be: `http://localhost:3000/api/auth/callback/google`

### "Access blocked: This app's request is invalid"
- Ensure you've configured the OAuth consent screen
- If in testing mode, make sure your email is added as a test user

### Authentication not working
- Check that all environment variables are set correctly
- Verify that `NEXTAUTH_SECRET` is set and is a secure random string
- Make sure you've restarted your development server after adding environment variables

## Security Notes

- Never commit your `.env.local` file to version control
- Keep your `GOOGLE_CLIENT_SECRET` secure and never expose it publicly
- Rotate your `NEXTAUTH_SECRET` periodically
- Use different OAuth credentials for development and production environments
