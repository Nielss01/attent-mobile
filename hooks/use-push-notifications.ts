import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import type { Subscription } from "expo-notifications";
import {
  registerForPushNotifications,
  savePushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from "@/lib/notifications";
import { setPendingMoment, setPendingHolidayNotification } from "@/lib/deep-link";

function extractMomentId(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data;
  return typeof data?.momentId === "string" ? data.momentId : null;
}

function extractNotificationType(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data;
  return typeof data?.type === "string" ? data.type : null;
}

function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const type = extractNotificationType(response);
  if (type === "holiday_reminder") {
    setPendingHolidayNotification();
    return;
  }
  const momentId = extractMomentId(response);
  if (momentId) setPendingMoment(momentId);
}

export function usePushNotifications(userId: string | undefined) {
  const notificationListener = useRef<Subscription>(null);
  const responseListener = useRef<Subscription>(null);
  const coldStartHandled = useRef(false);

  useEffect(() => {
    if (!userId) return;

    registerForPushNotifications().then((token) => {
      if (token) {
        savePushToken(userId, token).catch(console.warn);
      }
    });

    if (!coldStartHandled.current) {
      coldStartHandled.current = true;
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) handleNotificationResponse(response);
      });
    }

    notificationListener.current = addNotificationReceivedListener((_notification) => {
      // Foreground notification received - the handler in notifications.ts
      // already configures shouldShowAlert: true so it displays automatically
    });

    responseListener.current = addNotificationResponseListener((response) => {
      handleNotificationResponse(response);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [userId]);
}
