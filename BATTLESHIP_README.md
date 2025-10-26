# Battleship Game Implementation

## Overview
A fully functional Battleship game where two LLM players compete by placing ships strategically and taking turns shooting at coordinates to sink their opponent's fleet.

## ✨ Key Feature: Enhanced LLM Context

### Complete Game State Information
At **every move**, each LLM receives comprehensive status information including:

#### Offensive Status (Your Attacks)
- Opponent ships remaining count
- Total shots fired
- **All coordinates you've hit**: Listed explicitly (e.g., "A1, B2, C5")
- **All coordinates you've missed**: Listed explicitly
- **Enemy ships you've sunk**: With ship length and final hit coordinate

#### Defensive Status (Opponent's Attacks on You)
- Total coordinates opponent has shot at
- **All coordinates opponent hit on you**: Listed explicitly
- **All coordinates opponent missed**: Listed explicitly
- Your remaining ships count

#### Your Fleet Status
- Detailed status of each of your ships:
  - Ship 1 (length 5): Intact / 2/5 hit / SUNK
  - Ship 2 (length 4): Intact / SUNK
  - etc.

This comprehensive information allows LLMs to:
- Make intelligent targeting decisions based on hit patterns
- Adapt strategy based on defensive vulnerabilities
- Understand which of their ships are under attack
- Make probabilistic decisions about opponent ship locations

## Features

### Game Mechanics
- **10x10 Grid**: Rows labeled A-J, columns numbered 1-10
- **5 Ships per Player**:
  - 1 Carrier (length 5)
  - 1 Battleship (length 4)
  - 2 Cruisers/Submarines (length 3)
  - 1 Destroyer (length 2)

### Gameplay Phases

#### 1. Setup Phase
- Players enter their strategy prompts
- Strategy guides both ship placement and targeting decisions

#### 2. Placement Phase **✨ WITH VISUAL FEEDBACK**
- LLMs place ships based on their strategies
- **Visual indicators**: Each ship placement is highlighted with:
  - Yellow pulsing ring around newly placed ship coordinates
  - Banner showing which player is placing and ship details
  - Coordinate list of the ship being placed
  - Animated transitions between placements

#### 3. Battle Phase **✨ WITH VISUAL FEEDBACK**
- Players alternate taking shots
- **Visual indicators**: Each shot is highlighted with:
  - Yellow pulsing ring on the shot coordinate
  - Banner showing who fired and at which coordinate
  - Current round number display
  - Different colors for hits (💥), sinks (💀), and misses (○)

#### 4. Results Phase
- Displays winner and game statistics
- Shows both players' final fleet positions
- Attack pattern visualization with accuracy percentages
- Complete turn history

## Visual Feedback System

### Ship Placement Indicators
```typescript
// Highlights recently placed ship coordinates
- Yellow pulsing ring (ring-2 ring-yellow-400 animate-pulse)
- Banner: "🚢 Player X placing ship of length Y"
- Shows coordinates: "A1, A2, A3, A4, A5"
- Animates through each ship placement with delays
```

### Shot Indicators
```typescript
// Highlights recently fired shots
- Yellow pulsing ring on shot coordinate
- Color-coded banner (blue for Player 1, red for Player 2)
- Shows: "💥 Player X fires at A5!"
- Displays current round number
```

## Files Created

### Backend API
- `/src/app/api/play-battleship-stream/route.ts`
  - Streaming API endpoint
  - Ship placement with LLM
  - Turn-based shooting logic
  - Win condition detection
  - Coordinate validation

### Frontend
- `/src/app/games/battleship/page.tsx`
  - Complete game UI
  - Grid rendering with visual feedback
  - Real-time shot/placement highlighting
  - Phase-based rendering (setup, placing, playing, finished)
  - Turn history display

### Main Menu
- Updated `/src/app/page.tsx`
  - Added Battleship game tile
  - Strategy game category
  - Medium difficulty rating

## How Visual Feedback Works

### State Management
```typescript
const [lastShipPlaced, setLastShipPlaced] = useState<{
  player: 1 | 2;
  ship: Ship;
} | null>(null);

const [lastShot, setLastShot] = useState<{
  player: 1 | 2;
  coordinate: Coordinate;
} | null>(null);
```

### Ship Placement Animation
```typescript
// Animate ship placements one by one
for (let i = 0; i < ships.length; i++) {
  await delay(600ms);
  setLastShipPlaced({ player: 1, ship: ships[i] });
  await delay(600ms);
  setLastShipPlaced({ player: 2, ship: ships[i] });
}
```

### Shot Highlighting
```typescript
// Highlight each shot as it happens
setLastShot({
  player: currentPlayer,
  coordinate: shotCoordinate,
});
await delay(500ms); // Keep highlight visible
```

## Grid Rendering

The `renderGrid()` function includes:
- Player identification for proper highlighting
- Ship position tracking
- Hit/miss/sunk status display
- Visual highlighting for recent actions
- Different views for own fleet vs. attack grid

## UI Components

### Grid Cell States
- **Water**: Blue tint background
- **Ship (Own Grid)**: Ship emoji 🚢 with player color
- **Hit**: Orange background with 💥
- **Sunk**: Red background with 💀
- **Miss**: Gray background with ○
- **Recently Placed/Shot**: Yellow pulsing ring

### Information Banners
- **Placement Banner**: Yellow theme, shows ship being placed
- **Shot Banner**: Player-colored (blue/red), shows current attack
- Both use animate-pulse for attention

## LLM Prompt Structure

### Example Prompt (Player 1, Mid-Game)
```
You are Player 1 playing Battleship.

Your strategy: [User's strategy prompt]

=== OFFENSIVE STATUS (Your Attacks) ===
- Opponent has 3 ships remaining
- You have fired 12 shots so far
- Your Hits: A1, A2, D5, D6, D7
- Your Misses: B3, C4, E8, F2, G1, H9, J10
- Enemy Ships Sunk: Length 4 at D7, Length 2 at A2

=== DEFENSIVE STATUS (Opponent's Attacks on You) ===
- Opponent has shot at 11 coordinates
- Opponent Hits on you: C3, C4, C5
- Opponent Misses: A8, B9, D1, E5, F6, G7, H2, I3
- Your ships remaining: 4 / 5

=== YOUR FLEET STATUS ===
  Ship 1 (length 5): Intact
  Ship 2 (length 4): Intact
  Ship 3 (length 3): 3/3 hit (SUNK)
  Ship 4 (length 3): Intact
  Ship 5 (length 2): Intact

BOARD:
- Rows: A-J (10 rows)
- Columns: 1-10 (10 columns)

RULES:
- You CANNOT shoot at a coordinate you've already shot at
- Already shot: A1, A2, B3, C4, D5, D6, D7, E8, F2, G1, H9, J10
- Choose a coordinate you haven't shot yet
- Use both offensive AND defensive information to make strategic decisions
```

### Strategic Implications
With this information, LLMs can:
1. **Pattern Recognition**: Identify hit clusters to finish off ships
2. **Defensive Adaptation**: Notice opponent's search patterns and anticipate next targets
3. **Risk Assessment**: Understand own fleet vulnerability
4. **Probabilistic Targeting**: Make educated guesses about ship locations

## Technical Details

### Streaming Implementation
- Server-Sent Events (SSE) for real-time updates
- Events: `start`, `ships_placed`, `turn`, `end`
- Client-side state updates on each event

### Coordinate System
- Format: `{row: "A"-"J", col: 1-10}`
- String representation: "A5", "J10"
- Validation for valid board positions

### Win Conditions
- First player to sink all opponent ships wins
- Maximum 100 turns per game (tie if reached)
- Real-time ship remaining counter

## Strategy Examples

**Defensive Clustering**:
```
"Place ships close together in corners for protection. 
Hunt in checkerboard pattern, then target adjacent cells on hits."
```

**Spread & Systematic**:
```
"Spread ships across the board. Target center grid first, 
then systematically work outward in a spiral pattern."
```

## Performance
- Build size: 4.38 kB for battleship page
- Smooth animations with CSS transitions
- Efficient state updates via React hooks
- Real-time streaming with minimal latency

## Future Enhancements
- Sound effects for hits/misses/sinks
- Animation effects on hits
- Replay functionality
- Strategy effectiveness analytics
- Multiplayer (human vs. LLM)

