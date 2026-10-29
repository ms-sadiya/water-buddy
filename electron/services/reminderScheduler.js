import { powerMonitor } from 'electron';
import { getReminderConfig } from '../config/reminderConfig.js';

/**
 * Service managing reminder scheduling and window visibility in the Electron main process.
 */
export class ReminderScheduler {
  /**
   * @param {() => import('electron').BrowserWindow | null} getWindow - Function returning the main BrowserWindow instance
   * @param {object} [configOverride] - Optional configuration overrides (for testing)
   */
  constructor(getWindow, configOverride) {
    this.getWindow = getWindow;
    this.config = configOverride || getReminderConfig();

    this.timerId = null;
    this.hideTimerId = null;
    this.heartbeatTimerId = null;

    this.nextDueTimestamp = 0;
    this.state = 'idle'; // 'idle' | 'reminding' | 'confirmed' | 'snoozed'

    this.onPowerResume = this.handlePowerResume.bind(this);
    this.onUnlockScreen = this.handlePowerResume.bind(this);
  }

  /**
   * Starts the reminder scheduler and schedules the first reminder.
   */
  start() {
    this.stop(); // Clear any existing timers

    // Register powerMonitor listeners for sleep/resume events
    try {
      powerMonitor.on('resume', this.onPowerResume);
      powerMonitor.on('unlock-screen', this.onUnlockScreen);
    } catch (err) {
      console.warn('[ReminderScheduler] powerMonitor not available in this context:', err.message);
    }

    // Periodic heartbeat (every 5 seconds) to detect clock jumps or timer suspension during sleep
    this.heartbeatTimerId = setInterval(() => {
      this.checkDueReminder();
    }, 5000);

    // Schedule initial reminder
    this.schedule(this.config.reminderIntervalMs);
    console.log(`[ReminderScheduler] Started. Next reminder in ${this.config.reminderIntervalMs / 1000}s`);
  }

  /**
   * Stops all active timers and cleans up listeners.
   */
  stop() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.hideTimerId) {
      clearTimeout(this.hideTimerId);
      this.hideTimerId = null;
    }
    if (this.heartbeatTimerId) {
      clearInterval(this.heartbeatTimerId);
      this.heartbeatTimerId = null;
    }

    try {
      powerMonitor.removeListener('resume', this.onPowerResume);
      powerMonitor.removeListener('unlock-screen', this.onUnlockScreen);
    } catch (_) {
      // Ignore if listeners were not registered
    }

    this.state = 'idle';
  }

  /**
   * Schedules a reminder after the given interval.
   * @param {number} intervalMs - Delay in milliseconds
   */
  schedule(intervalMs) {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    this.nextDueTimestamp = Date.now() + intervalMs;

    this.timerId = setTimeout(() => {
      this.triggerReminder();
    }, intervalMs);
  }

  /**
   * Triggers the reminder when due.
   */
  triggerReminder() {
    this.timerId = null;

    // Prevent overlapping if already showing a response or reminding
    if (this.state === 'reminding') {
      return;
    }

    const window = this.getWindow();
    if (!window || window.isDestroyed()) {
      console.warn('[ReminderScheduler] Window not available to show reminder.');
      return;
    }

    this.state = 'reminding';

    // Show window without stealing keyboard focus
    if (!window.isVisible()) {
      window.showInactive();
    }
    window.setAlwaysOnTop(true, 'screen-saver');

    // Notify renderer to display the reminder prompt and enable buttons
    try {
      window.webContents.send('water-buddy:reminder-triggered', {
        message: this.config.messages.prompt,
        dueTimestamp: this.nextDueTimestamp,
      });
    } catch (err) {
      console.error('[ReminderScheduler] Failed to send reminder-triggered event:', err);
    }

    console.log('[ReminderScheduler] Reminder displayed to user.');
  }

  /**
   * Handles user clicking "Yes, I did!".
   * @returns {{ success: boolean, message: string, displayDuration: number }}
   */
  confirmWater() {
    if (this.state === 'confirmed' || this.state === 'snoozed') {
      // Prevent duplicate clicks while already processing
      return {
        success: false,
        message: this.config.messages.confirmed,
        displayDuration: this.config.responseDisplayDurationMs,
      };
    }

    this.state = 'confirmed';

    // Schedule next full reminder immediately from confirmation time
    this.schedule(this.config.reminderIntervalMs);

    // Hide window after celebration duration (2s)
    this.queueHideWindow();

    console.log(`[ReminderScheduler] Confirmed. Next reminder in ${this.config.reminderIntervalMs / 1000}s`);

    return {
      success: true,
      message: this.config.messages.confirmed,
      displayDuration: this.config.responseDisplayDurationMs,
    };
  }

  /**
   * Handles user clicking "Not yet".
   * @returns {{ success: boolean, message: string, displayDuration: number }}
   */
  snoozeReminder() {
    if (this.state === 'confirmed' || this.state === 'snoozed') {
      // Prevent duplicate clicks while already processing
      return {
        success: false,
        message: this.config.messages.snoozed,
        displayDuration: this.config.responseDisplayDurationMs,
      };
    }

    this.state = 'snoozed';

    // Schedule next snooze reminder immediately from snooze action time
    this.schedule(this.config.snoozeIntervalMs);

    // Hide window after feedback duration (2s)
    this.queueHideWindow();

    console.log(`[ReminderScheduler] Snoozed. Next reminder in ${this.config.snoozeIntervalMs / 1000}s`);

    return {
      success: true,
      message: this.config.messages.snoozed,
      displayDuration: this.config.responseDisplayDurationMs,
    };
  }

  /**
   * Queues window hiding after response display duration.
   */
  queueHideWindow() {
    if (this.hideTimerId) {
      clearTimeout(this.hideTimerId);
    }

    this.hideTimerId = setTimeout(() => {
      const window = this.getWindow();
      if (window && !window.isDestroyed()) {
        window.hide();
      }
      this.state = 'idle';
      this.hideTimerId = null;
    }, this.config.responseDisplayDurationMs);
  }

  /**
   * Manually shows the window without disrupting the active schedule.
   */
  showManually() {
    const window = this.getWindow();
    if (!window || window.isDestroyed()) return;

    if (!window.isVisible()) {
      window.showInactive();
      window.setAlwaysOnTop(true, 'screen-saver');
    }

    try {
      window.webContents.send('water-buddy:manual-show', {
        message: this.state === 'reminding'
          ? this.config.messages.prompt
          : this.config.messages.manual,
        isReminding: this.state === 'reminding',
      });
    } catch (err) {
      console.error('[ReminderScheduler] Failed to send manual-show event:', err);
    }
  }

  /**
   * Checks if an absolute due timestamp has elapsed (e.g. after system resume or clock drift).
   */
  checkDueReminder() {
    if (this.state === 'reminding') return;

    if (this.nextDueTimestamp > 0 && Date.now() >= this.nextDueTimestamp) {
      console.log('[ReminderScheduler] Due timestamp passed (wake/heartbeat). Triggering reminder.');
      this.triggerReminder();
    }
  }

  /**
   * Handles system resume from sleep or screen unlock.
   */
  handlePowerResume() {
    console.log('[ReminderScheduler] System resumed or unlocked. Checking due time.');
    this.checkDueReminder();
  }

  /**
   * Returns current scheduler state for renderer synchronization.
   * @returns {object}
   */
  getState() {
    return {
      state: this.state,
      nextDueTimestamp: this.nextDueTimestamp,
      remainingMs: Math.max(0, this.nextDueTimestamp - Date.now()),
      messages: this.config.messages,
    };
  }
}
