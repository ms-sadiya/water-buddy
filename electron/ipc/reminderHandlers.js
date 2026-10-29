import { ipcMain } from 'electron';

/**
 * Registers secure IPC handlers for the hydration reminder system.
 *
 * @param {import('../services/reminderScheduler.js').ReminderScheduler} scheduler
 * @param {() => import('electron').BrowserWindow | null} getWindow
 */
export function registerReminderHandlers(scheduler, getWindow) {
  // Validate that the request originates from the trusted Water Buddy window
  function isTrustedSender(event) {
    const window = getWindow();
    if (!window || window.isDestroyed()) return false;
    return event.sender.id === window.webContents.id;
  }

  ipcMain.handle('water-buddy:confirm-water', async (event) => {
    if (!isTrustedSender(event)) {
      throw new Error('Unauthorized IPC sender');
    }
    return scheduler.confirmWater();
  });

  ipcMain.handle('water-buddy:snooze-reminder', async (event) => {
    if (!isTrustedSender(event)) {
      throw new Error('Unauthorized IPC sender');
    }
    return scheduler.snoozeReminder();
  });

  ipcMain.handle('water-buddy:get-state', async (event) => {
    if (!isTrustedSender(event)) {
      throw new Error('Unauthorized IPC sender');
    }
    return scheduler.getState();
  });
}

/**
 * Unregisters IPC handlers on application cleanup.
 */
export function unregisterReminderHandlers() {
  ipcMain.removeHandler('water-buddy:confirm-water');
  ipcMain.removeHandler('water-buddy:snooze-reminder');
  ipcMain.removeHandler('water-buddy:get-state');
}
