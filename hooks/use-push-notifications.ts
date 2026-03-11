import { useEffect, useRef } from "react";
import type { Subscription } from "expo-notifications";
import {
  registerForPushNotifications,
  savePushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from "@/lib/notifications";

export function usePushNotifications(userId: string | undefined) {
  const notificationListener = useRef<Subscription>(null);
  const responseListener = useRef<Subscription>(null);

  useEffect(() => {
    if (!userId) return;

    registerForPushNotifications().then((token) => {
      if (token) {
        savePushToken(userId, token).catch(console.warn);
      }
    });

    notificationListener.current = addNotificationReceivedListener((_notification) => {
      // Foreground notification received - the handler in notifications.ts
      // already configures shouldShowAlert: true so it displays automatically
    });

    responseListener.current = addNotificationResponseListener((_response) => {
      // User tapped on a notification - can add deep linking logic here
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [userId]);
}
