import { app } from 'electron';

/**
 * Returns the environment-aware reminder configuration.
 *
 * Requirements:
 * - Development:
 *   - Reminder interval: 60 seconds (or overridden via WATER_BUDDY_REMINDER_INTERVAL_MS for automated tests)
 *   - Snooze interval: 60 seconds (or overridden via WATER_BUDDY_SNOOZE_INTERVAL_MS)
 *   - Response display duration: 2 seconds
 * - Production:
 *   - Reminder interval: 60 minutes (3,600,000 ms)
 *   - Snooze interval: 10 minutes (600,000 ms)
 *   - Response display duration: 2 seconds (2,000 ms)
 *
 * @returns {object} The configuration object
 */
export function getReminderConfig() {
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  const defaultReminderIntervalMs = isDev ? 60 * 1000 : 60 * 60 * 1000;
  const defaultSnoozeIntervalMs = isDev ? 60 * 1000 : 10 * 60 * 1000;

  // Allow test scripts to supply temporary overrides while preserving dev/prod defaults
  const reminderIntervalMs = isDev && process.env.WATER_BUDDY_REMINDER_INTERVAL_MS
    ? Number(process.env.WATER_BUDDY_REMINDER_INTERVAL_MS)
    : defaultReminderIntervalMs;

  const snoozeIntervalMs = isDev && process.env.WATER_BUDDY_SNOOZE_INTERVAL_MS
    ? Number(process.env.WATER_BUDDY_SNOOZE_INTERVAL_MS)
    : defaultSnoozeIntervalMs;

  const responseDisplayDurationMs = 2000;

  return {
    isDev,
    reminderIntervalMs,
    snoozeIntervalMs,
    responseDisplayDurationMs,
    messages: {
      prompt: "Hey! It's time to drink water! 💧",
      confirmed: "Awesome! Stay hydrated! 💧✨",
      snoozed: "No worries! I'll remind you again soon! 💧",
      manual: "Water Buddy is active & keeping you hydrated! 💧",
    },
  };
}
