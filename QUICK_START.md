# Quick Start Checklist

## 🚀 Get Google Login Working in 5 Minutes

### ☐ Step 1: Create Google OAuth App (2 minutes)
1. Go to https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Type: "Web application"
4. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
5. **Copy the Client ID and Secret**

### ☐ Step 2: Add Credentials to Code (1 minute)
Open: `src/lib/auth.ts`

Find lines 6-7 and replace with your credentials:
```typescript
const GOOGLE_CLIENT_ID = "paste-your-client-id-here";
const GOOGLE_CLIENT_SECRET = "paste-your-client-secret-here";
```

### ☐ Step 3: Run the App (30 seconds)
```bash
npm run dev
```

### ☐ Step 4: Test (1 minute)
1. Open http://localhost:3000
2. Click "Sign in with Google" (top right)
3. Sign in with your Google account
4. You're logged in! 🎉

---

## ❓ Having Issues?

**Can't find credentials screen?**
→ See detailed guide: `GET_GOOGLE_CREDENTIALS.md`

**"Redirect URI mismatch" error?**
→ Make sure redirect URI is exactly: `http://localhost:3000/api/auth/callback/google`

**"Invalid client" error?**
→ Double-check credentials in `src/lib/auth.ts` (no extra spaces!)

**Need step-by-step help?**
→ See: `SETUP_INSTRUCTIONS.md`

---

## 📍 Where Everything Is

| What | Where |
|------|-------|
| Add your credentials | `src/lib/auth.ts` (lines 6-7) |
| Quick guide | `GET_GOOGLE_CREDENTIALS.md` |
| Full setup guide | `SETUP_INSTRUCTIONS.md` |
| Google Cloud Console | https://console.cloud.google.com/ |

---

That's it! Your app will have Google login in under 5 minutes. 🚀
