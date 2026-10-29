# Water Buddy 💧

Water Buddy is a desktop hydration reminder companion built with **Electron**, **React**, and **Vite**.

---

## 🏛️ Architecture & Separation of Concerns

Water Buddy strictly separates the Electron native host from the React frontend, adhering to the latest Electron security best practices.

```
┌────────────────────────────────────────────────────────┐
│                  Electron Main Process                 │
│  - electron/main.js (App lifecycle management)         │
│  - electron/windows/buddyWindow.js (Window creation)   │
│  • Node.js native access                               │
│  • Controls BrowserWindow creation & security options  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │ Spawns window with preload
                           ▼
┌────────────────────────────────────────────────────────┐
│                  Preload Script                        │
│  - electron/preload.js                                 │
│  • Sandboxed bridge execution                          │
│  • contextBridge.exposeInMainWorld()                   │
│  • Whitelists safe APIs onto window.waterBuddyAPI      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │ Exposes safe window APIs
                           ▼
┌────────────────────────────────────────────────────────┐
│                  React Renderer                        │
│  - src/main.jsx & src/App.jsx                          │
│  • Isolated Chromium browser context                   │
│  • nodeIntegration: false, contextIsolation: true      │
│  • Interacts purely through window.waterBuddyAPI       │
└────────────────────────────────────────────────────────┘
```

### How the Main Process, Preload Script, and React Renderer Connect

1. **Main Process (`electron/main.js` & `electron/windows/buddyWindow.js`)**:
   - The entry point for the desktop application running in a Node.js runtime.
   - `buddyWindow.js` creates a native `BrowserWindow` with security parameters:
     - `contextIsolation: true`: Ensures the preload script and renderer run in separate JavaScript contexts.
     - `nodeIntegration: false`: Prevents the renderer from directly accessing Node.js APIs or `require()`.
     - `sandbox: true`: Restricts renderer OS access using Chromium's sandbox.
   - Loads the Vite development server (`http://localhost:5173`) in development, or the production bundle (`dist/index.html`) using `mainWindow.loadFile()` in production.

2. **Preload Script (`electron/preload.js`)**:
   - Executes in a privileged, isolated context prior to any renderer scripts running.
   - Serves as the secure mediator: using `contextBridge.exposeInMainWorld('waterBuddyAPI', { ... })`, it selectively exposes only sanitized, safe properties and methods to the renderer's `window` object.
   - Prevents the renderer from gaining arbitrary access to Node.js or Electron internals.

3. **React Renderer (`src/`)**:
   - A standard React 18 single-page application built with Vite and ES modules.
   - Runs in the isolated browser context. It treats the environment like a secure web page while accessing native desktop capabilities exclusively through `window.waterBuddyAPI`.

---

## 📁 Project Structure (Phase 1)

```
water-buddy/
├── electron/
│   ├── main.js                 # Electron app lifecycle & initialization
│   ├── preload.js              # Secure contextBridge preload script
│   └── windows/
│       └── buddyWindow.js      # Dedicated window creation module
│
├── src/
│   ├── components/             # Reusable React UI components
│   ├── styles/
│   │   └── global.css          # Modern dark-mode styling & hydration themes
│   ├── App.jsx                 # Initial welcome view
│   └── main.jsx                # React root mount entry
│
├── public/                     # Static assets directory
├── index.html                  # HTML entry point with Content Security Policy
├── vite.config.js              # Vite configuration (relative base path)
├── package.json                # Project dependencies & scripts
├── .gitignore                  # Git ignore rules
└── README.md                   # Documentation
```

### Roadmap to Final Architecture
In subsequent phases, the application expands to:
- `electron/ipc/` — secure IPC handlers
- `electron/services/` — background scheduling, settings persistence, animation control
- `electron/utils/` — desktop utilities
- `src/features/` — hydration tracking, character animations, reminder timers
- `src/hooks/` — custom React hooks
- `src/constants/` — UI constants
- `public/character/` & `public/sounds/` — companion assets and sound effects
- `tests/` — automated testing suite

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher

### Installation
Clone or navigate to the project directory and install dependencies:
```bash
npm install
```

### Development
Launch Vite and Electron concurrently with live reloading:
```bash
npm run dev
```

### Production Build & Preview
Build the React application for production and test local file loading in Electron:
```bash
# Build the frontend into dist/
npm run build

# Run Electron loading dist/index.html without a dev server
npm run start
```
