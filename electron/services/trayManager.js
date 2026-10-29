import { Tray, Menu, nativeImage, app } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initializes the Windows system tray icon and context menu.
 *
 * @param {import('./reminderScheduler.js').ReminderScheduler} scheduler
 * @param {() => import('electron').BrowserWindow | null} getWindow
 * @returns {Tray} The created Tray instance
 */
export function createTray(scheduler, getWindow) {
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);

  const tray = new Tray(trayIcon);
  tray.setToolTip('Water Buddy 💧');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Water Buddy',
      click: () => {
        scheduler.showManually();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Water Buddy',
      click: () => {
        app.isQuitting = true;
        scheduler.stop();
        const win = getWindow();
        if (win && !win.isDestroyed()) {
          win.destroy();
        }
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Left click toggles or shows the window manually
  tray.on('click', () => {
    scheduler.showManually();
  });

  return tray;
}
