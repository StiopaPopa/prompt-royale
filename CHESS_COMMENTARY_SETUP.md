# Chess Commentary System Setup Guide

This guide explains how to set up and use the AI-powered TTS commentary system for chess games.

## Overview

The commentary system adds live voice commentary to chess games using:
- **OpenAI GPT-4o-mini** for generating insightful, energetic commentary (via Lava if available)
- **Fish Audio** for high-quality text-to-speech conversion
- Real-time commentary every 3 moves during the game

## Setup Instructions

### 1. Get a Fish Audio API Key

1. Go to [Fish Audio](https://fish.audio/)
2. Sign up or log in to your account
3. Navigate to your API settings
4. Copy your API key

### 2. Configure Environment Variables

Add your Fish Audio API key to your `.env.local` file:

```bash
# Fish Audio API Key
FISH_API_KEY=your-fish-audio-api-key-here
```

Make sure you also have your OpenAI API key configured (or Lava token):

```bash
# OpenAI API Key
OPENAI_API_KEY=your-openai-api-key-here

# OR use Lava (optional)
LAVA_FORWARD_TOKEN=your-lava-token-here
```

### 3. Install Dependencies (Already Done)

No additional dependencies required - Fish Audio uses standard fetch API.

### 4. Start the Development Server

```bash
npm run dev
```

## How It Works

### Architecture

1. **Commentary Generation** (`/api/chess-commentary`)
   - Receives recent moves and game context
   - Uses GPT-4o-mini (via Lava or direct OpenAI) to generate engaging commentary
   - Considers both players' strategies
   - Returns 2-3 sentence commentary focusing on strategic significance

2. **Text-to-Speech** (`/api/text-to-speech`)
   - Converts commentary text to audio using Fish Audio API
   - Uses the "s1" model for natural-sounding speech
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

Fish Audio provides natural-sounding voices using their "s1" model. To explore additional voice options or models, visit the [Fish Audio documentation](https://fish.audio/).

## Usage

1. Navigate to the Chess Battle page
2. Check the "Enable Live Commentary (AI Voice)" checkbox in the setup screen
3. Enter strategies for both players
4. Click "Start Chess Battle"
5. Listen to the AI commentator analyze the game as moves are played!

## Features

- **Live Commentary**: AI-generated commentary every few moves
- **Voice Synthesis**: High-quality voice using Fish Audio
- **Visual Feedback**: See commentary text and audio playing indicator
- **Toggle Control**: Enable/disable commentary before starting the game
- **Context-Aware**: Commentary considers both players' strategies and recent moves

## Troubleshooting

### No Audio Playing

1. Check that your Fish Audio API key is correctly set in `.env.local`
2. Check browser console for errors
3. Ensure your browser allows audio playback (some browsers block autoplay)

### Commentary Not Generating

1. Verify OpenAI/Lava API key is set correctly
2. Check that commentary is enabled (checkbox is checked)
3. Check network tab for API call failures

### Audio Quality Issues

Fish Audio's "s1" model provides high-quality natural speech. Check the [Fish Audio documentation](https://fish.audio/) for additional voice options.

## API Rate Limits

Be aware of API rate limits:
- **Fish Audio**: Check your plan limits at [Fish Audio](https://fish.audio/)
- **OpenAI/Lava**: Depends on your plan

Each game with commentary enabled will use:
- ~20 OpenAI API calls (for commentary generation)
- ~2,000-3,000 characters for TTS conversion

## Future Enhancements

Potential improvements:
- Commentary at key moments (checks, captures, tactical moves)
- Multiple commentator voices (play-by-play + analyst)
- Commentary replay/history
- Export commentary as audio file
- Adjustable commentary frequency via UI
- Multiple language support
