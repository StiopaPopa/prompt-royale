# Troubleshooting: "Stuck at Loading" After Google Sign-In

## Quick Fixes

### Fix 1: Restart Your Dev Server
1. Stop the server (Ctrl+C or Cmd+C in terminal)
2. Restart it:
   ```bash
   npm run dev
   ```
3. Try signing in again

### Fix 2: Verify Redirect URI in Google Cloud Console
This is the most common issue!

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID: `916465466525-sdbtg2fv6tlnurtku7gc6mm7vnboc7pk`
3. Check "Authorized redirect URIs" section
4. Make sure you have **EXACTLY** this URI (copy-paste it):
   ```
   http://localhost:3000/api/auth/callback/google
   ```
5. Also add this as a backup:
   ```
   http://localhost:3000
   ```
6. Click **SAVE**
7. Wait 1 minute for changes to propagate
8. Try signing in again

### Fix 3: Clear Browser Cache & Cookies
1. Open DevTools (F12 or Right-click → Inspect)
2. Go to "Application" tab (Chrome) or "Storage" tab (Firefox)
3. Under "Cookies", delete all cookies for `localhost:3000`
4. Under "Local Storage", delete all entries for `localhost:3000`
5. Close the DevTools
6. Refresh the page (Cmd+Shift+R or Ctrl+Shift+R for hard refresh)
7. Try signing in again

### Fix 4: Check Browser Console for Errors
1. Open DevTools (F12)
2. Go to "Console" tab
3. Try signing in again
4. Look for any red error messages
5. Take a screenshot and share it if you see errors

### Fix 5: Check Terminal for Errors
While trying to sign in, check your terminal (where `npm run dev` is running) for any error messages. The debug mode is now enabled, so you should see detailed logs.

## Expected Flow

After clicking "Continue" on Google:
1. Google redirects to: `http://localhost:3000/api/auth/callback/google?code=...`
2. NextAuth processes the callback
3. You get redirected to: `http://localhost:3000`
4. You should see "Welcome, Rudy Pathak" in the top right

## Common Error Messages

### "Redirect URI mismatch"
- Fix: Add exact URI to Google Cloud Console (see Fix 2)

### "Invalid client"
- Fix: Double-check credentials in `src/lib/auth.ts`

### Page just spins/loads forever
- Fix: Restart dev server (Fix 1) and clear cache (Fix 3)

## Check These Settings in Google Cloud Console

Your OAuth Client should have:

**Client ID:** `916465466525-sdbtg2fv6tlnurtku7gc6mm7vnboc7pk.apps.googleusercontent.com`

**Authorized JavaScript origins:**
- `http://localhost:3000`

**Authorized redirect URIs:**
- `http://localhost:3000/api/auth/callback/google`
- `http://localhost:3000` (add this as backup)

## Still Not Working?

Try this diagnostic:

1. Open: http://localhost:3000/api/auth/signin
2. You should see a NextAuth sign-in page
3. Click "Sign in with Google"
4. If this page doesn't load, there's an issue with NextAuth setup

If none of these work, share:
1. Any error messages from browser console (F12 → Console tab)
2. Any error messages from terminal
3. Screenshot of what you see when it's "stuck"
