# Span - Be the first to connect borders

A strategy connection game on 15x15 or 25x25 board with multiplayer sessions, game recording, and admin interface.

## Game Modes

- **Human vs AI** - Play against the AI (you are O, AI is X)
- **Human vs Human** - Play against a friend online via shareable link

## Features

- Multi-user session support
- Automatic game recording (saved to server)
- Admin interface for downloading recorded games
- Human moves marked as "teacher" for ML training
- WebSocket-based real-time multiplayer

## Local Development

```bash
npm install
npm start
```

Open http://localhost:8000

## Pages

- `/` - Home page (choose game mode)
- `/ai-vs-human.html` - Play vs AI
- `/human-vs-human.html` - Play vs friend
- `/admin.html` - Admin panel (download recorded games)

## Environment Variables

- `PORT` - Server port (default: 8000)
- `ADMIN_PASSWORD` - Admin panel password (default: admin123)
- `DATA_DIR` - Directory for recorded games (default: ./data)

## Deploy to Koyeb

1. Create new App → Deploy from GitHub
2. Select `Utekhin/line_game`, branch `sessions`
3. Builder: Dockerfile
4. Set environment variable: `ADMIN_PASSWORD=your_secure_password`
5. Deploy

## Admin API

All admin endpoints require `?password=ADMIN_PASSWORD`

- `GET /api/admin/stats` - Get game statistics
- `GET /api/admin/games` - Get recent games
- `GET /api/admin/download?format=json` - Download all games as JSON
- `GET /api/admin/download?format=csv` - Download all games as CSV

## Data Format

Recorded games include:
- `gameId` - Unique identifier
- `gameType` - "human-vs-ai" or "human-vs-human"
- `winner` - "X", "O", or null
- `moves` - Array of moves with board state
- Each move has `source`: "teacher" (human) or "ai"

## License

MIT
