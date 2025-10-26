# Lava Payments Integration Guide

## Overview

This project now integrates **Lava Payments** as an AI gateway for the Image Similarity game. Lava acts as a transparent proxy that routes requests to Google Gemini while providing:

- ✅ Automatic usage tracking and cost monitoring
- ✅ Centralized billing across multiple AI providers
- ✅ < 20ms additional latency
- ✅ Built-in request logging in the Lava dashboard

## Architecture

```
Your App → Lava Proxy → Google Gemini API
         (tracks usage)  (image generation & judging)
```

Lava sits between your application and Gemini, forwarding requests transparently while metering API calls and charging your Lava wallet.

## Setup Instructions

### 1. Get Your Lava API Token

1. Sign up at [Lava Dashboard](https://www.lavapayments.com/dashboard)
2. Claim your $10 free credits (if available)
3. Navigate to **Build > Secret Keys**
4. Copy your **Self Forward Token** (auto-generated on signup)

### 2. Configure Environment Variables

Create or update `.env.local` in your project root:

```bash
# Required: Lava authentication
LAVA_FORWARD_TOKEN=your_lava_self_forward_token_here
LAVA_BASE_URL=https://api.lavapayments.com/v1

# Optional: Custom Gemini endpoints (defaults provided)
GEMINI_IMAGE_GENERATION_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent
GEMINI_JUDGE_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent

# Legacy fallback (if not using Lava)
GEMINI_API_KEY=your_gemini_api_key_here
```

**Important:** Add `.env.local` to your `.gitignore` to keep tokens secure!

### 3. Install Dependencies (if needed)

No additional dependencies required - the integration uses native `fetch` API.

### 4. Verify the Integration

**Run the verification script first to confirm everything is configured correctly:**

```bash
node test-lava.js
```

The script checks:
- ✅ Environment variables are set
- ✅ Lava API connection works
- ✅ Your token is valid
- ✅ Returns a request ID you can find in the dashboard

**Expected output:**
```
🔍 Checking environment variables...
✅ LAVA_FORWARD_TOKEN is set
✅ LAVA_BASE_URL is set: https://api.lavapayments.com/v1

🧪 Testing Lava API connection...
✅ Lava API connection successful!
📊 Request ID: req_abc123xyz456
```

**If you see errors:**
- `❌ LAVA_FORWARD_TOKEN not found` → Add your token to `.env.local`
- `401 Unauthorized` → Token is invalid, get a new one from dashboard
- `402 Payment Required` → Add credits to your Lava wallet

### 5. Test the Integration

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Navigate to the Image Similarity game at `http://localhost:3000/games/image-similarity`

3. Generate images and compare them

4. Check the [Lava Dashboard > Monetize > Explore](https://www.lavapayments.com/dashboard/monetize/explore) to see:
   - Request logs with timestamps
   - Token usage (input/output)
   - Cost breakdown per request
   - Model and provider details
   - The request IDs from your API calls

## How It Works

### Image Generation Flow

```javascript
// Player submits prompt → API routes through Lava
POST /api/image-similarity (mode: generate-image)
  ↓
Lava proxy adds usage tracking
  ↓
Google Gemini generates image
  ↓
Response returns to client + logged in dashboard
```

### Image Judging Flow

```javascript
// Three images sent to judge → Routed via Lava
POST /api/image-similarity (mode: judge)
  ↓
Lava tracks multimodal request
  ↓
Gemini 2.5 Flash scores images
  ↓
Scores returned + usage tracked
```

## Code Changes

The integration automatically detects if `LAVA_FORWARD_TOKEN` is present:

**With Lava (new):**
```typescript
const url = `${LAVA_BASE_URL}/forward?u=${encodeURIComponent(geminiEndpoint)}`;
const headers = {
  'Authorization': `Bearer ${LAVA_FORWARD_TOKEN}`,
  'Content-Type': 'application/json'
};
```

**Without Lava (legacy fallback):**
```typescript
const url = geminiEndpoint;
const headers = {
  'x-goog-api-key': GEMINI_API_KEY,
  'Content-Type': 'application/json'
};
```

## Benefits

### For Development
- **Single Dashboard**: Monitor all AI usage in one place
- **Cost Control**: Set spending limits and alerts
- **Request Debugging**: View full request/response logs with IDs

### For Production
- **Multi-Provider**: Easy to switch between Gemini, OpenAI, Anthropic, etc.
- **Monetization Ready**: Built-in infrastructure to charge customers
- **Usage Analytics**: Detailed metrics for optimization

## Troubleshooting

### "Missing LAVA_FORWARD_TOKEN"
- Verify `.env.local` exists and contains `LAVA_FORWARD_TOKEN`
- Restart your dev server after adding env vars
- Check the token is copied correctly from dashboard

### "Insufficient Balance"
- Add funds to your Lava wallet at [Dashboard > Billing](https://www.lavapayments.com/dashboard/billing)
- Claim free credits if available

### "Request Not Showing in Dashboard"
- Allow 1-2 seconds for logs to appear
- Check you're viewing the correct time range
- Verify the `x-lava-request-id` header in browser dev tools

### Legacy Mode (Without Lava)
If `LAVA_FORWARD_TOKEN` is not set, the code automatically falls back to direct Gemini API calls using `GEMINI_API_KEY`. This ensures backward compatibility.

## Advanced: Custom Billing

To charge customers for AI usage:

1. Generate customer-specific forward tokens using the [Lava SDK](https://www.lavapayments.com/docs/quickstart-monetize)
2. Pass tokens from your auth layer to the API route
3. Customer wallets are charged automatically per request

See [Lava Monetization Guide](https://www.lavapayments.com/docs/quickstart-monetize) for details.

## Resources

- [Lava Documentation](https://www.lavapayments.com/docs)
- [Forward Proxy Guide](https://www.lavapayments.com/docs/guides/forward-proxy)
- [Dashboard](https://www.lavapayments.com/dashboard)
- [Support](mailto:support@lavapayments.com)

## Summary

Lava Payments integration adds **zero-friction AI gateway** capabilities:
- Drop-in replacement for direct Gemini API calls
- Automatic usage tracking and billing
- Production-ready monetization infrastructure
- Minimal code changes, maximum flexibility

The Image Similarity game now routes all Gemini requests through Lava while maintaining the exact same functionality and response format.
