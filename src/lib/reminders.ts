// Agenda reminders: local notifications only — nothing leaves the phone. Each
// detected date can carry one scheduled notification, fired the morning of the
// day it refers to.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { dateFromDayKey, formatDayHeader } from '../utils/date';

const REMINDER_HOUR = 9; // fire at 9:00 local time, morning-of
const CHANNEL_ID = 'agenda-reminders';

// Show reminders even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Agenda reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** True once the user has granted (or grants now) notification permission. */
export async function ensureReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Schedule a reminder for the morning of dateKey. Returns the notification id,
 * or null when that morning has already passed (nothing to schedule).
 */
export async function scheduleReminder(dateKey: string, snippet: string): Promise<string | null> {
  const when = dateFromDayKey(dateKey);
  when.setHours(REMINDER_HOUR, 0, 0, 0);
  if (when.getTime() <= Date.now()) return null;

  await ensureChannel();
  return Notifications.scheduleNotificationAsync({
    content: {
      title: formatDayHeader(dateKey),
      body: snippet,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
      channelId: CHANNEL_ID,
    },
  });
}

/** Cancel a scheduled reminder. Never throws (the id may already have fired). */
export async function cancelReminder(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // best-effort
  }
}
