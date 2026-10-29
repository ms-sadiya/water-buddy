const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script exposing a secure, minimal IPC API to the React renderer.
 *
 * Security guarantees:
 * - contextIsolation: true
 * - nodeIntegration: false
 * - sandbox: true
 * - Raw ipcRenderer is NEVER exposed
 * - Only explicit, whitelisted methods and event subscriptions are provided
 */
contextBridge.exposeInMainWorld('waterBuddyAPI', {
  appVersion: '1.0.0',

  /**
   * Confirms water consumption to the main process scheduler.
   * @returns {Promise<{ success: boolean, message: string, displayDuration: number }>}
   */
  confirmWater: () => ipcRenderer.invoke('water-buddy:confirm-water'),

  /**
   * Snoozes the reminder in the main process scheduler.
   * @returns {Promise<{ success: boolean, message: string, displayDuration: number }>}
   */
  snoozeReminder: () => ipcRenderer.invoke('water-buddy:snooze-reminder'),

  /**
   * Retrieves the current scheduler state for renderer synchronization.
   * @returns {Promise<{ state: string, nextDueTimestamp: number, remainingMs: number, messages: object }>}
   */
  getReminderState: () => ipcRenderer.invoke('water-buddy:get-state'),

  /**
   * Subscribes to reminder triggers from the main process.
   * @param {(data: { message: string, dueTimestamp: number }) => void} callback
   * @returns {() => void} Cleanup function to unsubscribe listener
   */
  onReminderShown: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('water-buddy:reminder-triggered', listener);
    return () => {
      ipcRenderer.removeListener('water-buddy:reminder-triggered', listener);
    };
  },

  /**
   * Subscribes to manual show events from the system tray.
   * @param {(data: { message: string, isReminding: boolean }) => void} callback
   * @returns {() => void} Cleanup function to unsubscribe listener
   */
  onManualShow: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('water-buddy:manual-show', listener);
    return () => {
      ipcRenderer.removeListener('water-buddy:manual-show', listener);
    };
  },
});
