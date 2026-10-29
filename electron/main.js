import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { createBuddyWindow } from './windows/buddyWindow.js';
import { ReminderScheduler } from './services/reminderScheduler.js';
import { registerReminderHandlers, unregisterReminderHandlers } from './ipc/reminderHandlers.js';
import { createTray } from './services/trayManager.js';

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

// Explicitly set the application name to avoid defaulting to generic binary names
app.name = isDev ? 'water-buddy-dev' : 'water-buddy';
app.isQuitting = false;

// Configure a dedicated, writable user-data directory in appData (outside source tree)
const appDataPath = app.getPath('appData');
const userDataPath = path.join(appDataPath, app.name);

try {
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  // Verify write permission
  fs.accessSync(userDataPath, fs.constants.W_OK);
  app.setPath('userData', userDataPath);
} catch (err) {
  console.error('[Main] Failed to initialize user-data path:', err);
}

// Request single-instance lock to prevent competing instances from locking Chromium cache files
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  console.warn('[Main] Another instance of Water Buddy is already running. Quitting duplicate instance.');
  app.quit();
} else {
  let mainWindow = null;
  let scheduler = null;
  let tray = null;

  app.on('second-instance', () => {
    // Show and focus the existing window if a user attempts to launch a second instance
    if (scheduler) {
      scheduler.showManually();
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // 1. Create the window (hidden until reminder is due)
    mainWindow = createBuddyWindow();

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // 2. Instantiate and wire up the reminder scheduler
    scheduler = new ReminderScheduler(() => mainWindow);

    // 3. Register secure IPC communication
    registerReminderHandlers(scheduler, () => mainWindow);

    // 4. Initialize system tray
    tray = createTray(scheduler, () => mainWindow);

    // 5. Start scheduling background reminders
    scheduler.start();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createBuddyWindow();
      } else if (scheduler) {
        scheduler.showManually();
      }
    });
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
    if (scheduler) {
      scheduler.stop();
    }
    unregisterReminderHandlers();
    if (tray && !tray.isDestroyed()) {
      tray.destroy();
      tray = null;
    }
  });

  // Keep background process running even if window is hidden/closed
  app.on('window-all-closed', () => {
    if (app.isQuitting) {
      app.quit();
    }
  });
}
