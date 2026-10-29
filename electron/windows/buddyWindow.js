import { BrowserWindow, screen, app } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates and configures the transparent desktop Water Buddy window.
 *
 * Phase 3 Requirements:
 * - Window starts HIDDEN until the first reminder is due.
 * - Closing the window hides it instead of terminating the background application.
 * - Transparent, frameless, always-on-top, and non-resizable.
 * - Initial size ~400 x 500 pixels, positioned near bottom-left of primary workArea.
 *
 * @returns {BrowserWindow} The created BrowserWindow instance.
 */
export function createBuddyWindow() {
  const preloadPath = path.join(__dirname, '..', 'preload.js');

  // Obtain primary display work area (excludes taskbar)
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight, x: screenX, y: screenY } = primaryDisplay.workArea;

  // Window dimensions around 400 x 500, clamped if display workArea is smaller
  const windowWidth = Math.min(400, Math.max(300, Math.floor(screenWidth * 0.35)));
  const windowHeight = Math.min(500, Math.max(360, Math.floor(screenHeight * 0.55)));

  // Position near bottom-left corner of the primary display workArea
  const margin = 24;
  const posX = screenX + margin;
  const posY = screenY + screenHeight - windowHeight - margin;

  const mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: posX,
    y: posY,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    show: false, // Window starts hidden; shown by scheduler when reminder is due
    skipTaskbar: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Intercept window close to hide instead of destroying, keeping background app alive
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  }

  return mainWindow;
}
