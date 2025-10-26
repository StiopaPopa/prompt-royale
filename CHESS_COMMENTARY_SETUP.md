# Chess Commentary System Setup Guide

This guide explains how to set up and use the AI-powered TTS commentary system for chess games.

## Overview

The commentary system adds live voice commentary to chess games using:
- **OpenAI GPT-4o-mini** for generating insightful, energetic commentary
- **ElevenLabs** for high-quality text-to-speech conversion
- Real-time commentary every 3 moves during the game

## Setup Instructions

### 1. Get an ElevenLabs API Key

1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Sign up or log in to your account
3. Navigate to your profile settings
4. Copy your API key

### 2. Configure Environment Variables

Add your ElevenLabs API key to your `.env.local` file:

```bash
# ElevenLabs API Key
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
```

Make sure you also have your OpenAI API key configured:

```bash
# OpenAI API Key
OPENAI_API_KEY=your-openai-api-key-here
```

### 3. Install Dependencies (Already Done)

The required dependency `@elevenlabs/elevenlabs-js` is already installed in the project.

### 4. Start the Development Server

```bash
npm run dev
```

## How It Works

### Architecture

1. **Commentary Generation** (`/api/chess-commentary`)
   - Receives recent moves and game context
   - Uses GPT-4o-mini to generate engaging commentary
   - Considers both players' strategies
   - Returns 2-3 sentence commentary focusing on strategic significance

2. **Text-to-Speech** (`/api/text-to-speech`)
   - Converts commentary text to audio using ElevenLabs
   - Uses the "Adam" voice (great for sports commentary)
   - Returns MP3 audio stream

3. **Frontend Integration**
   - Commentary triggers every 3 moves (configurable)
   - Audio plays automatically when generated
   - Visual indicator shows when audio is playing
   - Commentary text displays in a dedicated panel

### Commentary Frequency

By default, commentary is generated every 3 moves. To change this, edit line 268 in `/src/app/games/chess/page.tsx`:

```typescript
// Generate commentary every 3 moves (adjustable)
if (moves.length % 3 === 0) {
  await generateCommentary(moves);
}
```

Change `% 3` to any number (e.g., `% 2` for every 2 moves, `% 5` for every 5 moves).

### Voice Customization

To change the voice, edit the `voiceId` in `/src/app/api/text-to-speech/route.ts`:

```typescript
// Current voice: Adam
const selectedVoiceId = voiceId || "pNInz6obpgDQGcFmaJgB";
```

Available ElevenLabs voice IDs can be found in your ElevenLabs dashboard.

## Usage

1. Navigate to the Chess Battle page
2. Check the "Enable Live Commentary (AI Voice)" checkbox in the setup screen
3. Enter strategies for both players
4. Click "Start Chess Battle"
5. Listen to the AI commentator analyze the game as moves are played!

## Features

- **Live Commentary**: AI-generated commentary every few moves
- **Voice Synthesis**: High-quality voice using ElevenLabs
- **Visual Feedback**: See commentary text and audio playing indicator
- **Toggle Control**: Enable/disable commentary before starting the game
- **Context-Aware**: Commentary considers both players' strategies and recent moves

## Troubleshooting

### No Audio Playing

1. Check that your ElevenLabs API key is correctly set in `.env.local`
2. Check browser console for errors
3. Ensure your browser allows audio playback (some browsers block autoplay)

### Commentary Not Generating

1. Verify OpenAI API key is set correctly
2. Check that commentary is enabled (checkbox is checked)
3. Check network tab for API call failures

### Audio Quality Issues

1. Try a different ElevenLabs voice ID
2. Adjust voice settings in `/src/app/api/text-to-speech/route.ts`

## API Rate Limits

Be aware of API rate limits:
- **ElevenLabs Free Tier**: 10,000 characters/month
- **OpenAI**: Depends on your plan

Each game with commentary enabled will use:
- ~20 OpenAI API calls (for commentary generation)
- ~2,000-3,000 ElevenLabs characters (for TTS conversion)

## Future Enhancements

Potential improvements:
- Commentary at key moments (checks, captures, tactical moves)
- Multiple commentator voices (play-by-play + analyst)
- Commentary replay/history
- Export commentary as audio file
- Adjustable commentary frequency via UI
- Multiple language support
