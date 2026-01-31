# Connection Game - AI with Neural Network Training

A 15x15 connection game where X connects top-to-bottom and O connects left-to-right. Features AI opponents, game recording for ML training, and in-browser neural network training.

## Game Modes

- **AI vs Human** - Play against the AI. Your moves are recorded as "teacher" data for neural network training.
- **AI vs AI** - Watch two AIs compete with auto-play mode for generating training data.

## Features

- Gap registry AI with L/I/Diagonal pattern detection
- Game recording with export to CSV/JSON
- Neural network AI system (TensorFlow.js)
- In-browser model training
- Model persistence (IndexedDB)
- Hybrid fallback (neural + heuristics)

## Local Development

```bash
npm install
npm start
```

Open http://localhost:3000

## Deploy to Koyeb

### Option 1: Deploy from GitHub

1. Go to [Koyeb Console](https://app.koyeb.com)
2. Create new App → Deploy from GitHub
3. Select repository: `Utekhin/line_game`
4. Select branch: `recorder`
5. Build settings:
   - Builder: Buildpack
   - Run command: `npm start`
6. Environment variables:
   - `PORT`: 8000 (Koyeb uses 8000 by default)
7. Deploy

### Option 2: Deploy with Koyeb CLI

```bash
# Install Koyeb CLI
brew install koyeb/tap/koyeb

# Login
koyeb login

# Deploy
koyeb app create line-game --git github.com/Utekhin/line_game --git-branch recorder --ports 8000:http --routes /:8000
```

## ML Training Workflow

1. **Record games**: Play AI vs Human (human moves weighted 2x as "teacher") or use AI vs AI auto-play
2. **Export data**: Click "Export JSON" to download training data
3. **Train model**: In AI vs AI page, use the Neural AI Training panel
4. **Save model**: Model persists in browser IndexedDB
5. **Export model**: Download trained model files for backup

## Project Structure

```
├── index.html              # Landing page
├── ai-vs-human.html        # Human vs AI mode
├── ai-vs-ai.html           # AI vs AI mode with training UI
├── server.js               # Node.js static file server
├── package.json            # Dependencies
└── js/
    ├── neural-ai/          # Neural network modules
    │   ├── feature-extractor.js
    │   ├── model-architecture.js
    │   ├── neural-network-ai.js
    │   ├── training-manager.js
    │   └── model-storage.js
    ├── simple-chain.js     # Main AI logic
    ├── gap-registry.js     # Gap detection system
    └── ...                 # Other game modules
```

## License

MIT
