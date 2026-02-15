// src/hooks/useNotifications.ts
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import i18n from "../lib/i18n";

// 1. Configure the Handler (How notifications look when app is open)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 2. Define your times clearly
const SCHEDULED_TIMES = [
    { hour: 0, minute: 0, bodyKey: "notificationBodyTransition" }, // 00:00
    { hour: 5, minute: 30, bodyKey: "notificationBodySunrise" },   // 05:30
    { hour: 11, minute: 30, bodyKey: "notificationBodyFullDay" },  // 11:30
    { hour: 18, minute: 0, bodyKey: "notificationBodySunset" },    // 18:00
];

const scheduleVisitationNotifications = async () => {
  try {
    // A. Check what is currently scheduled to avoid duplicates/spam
    const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // If we already have exactly 4 notifications, we assume they are set correctly.
    // This effectively stops the "repeatedly" bug on app reload.
    if (existingNotifications.length === SCHEDULED_TIMES.length) {
        console.log("✅ Notifications are already scheduled. Skipping.");
        return;
    }

    // B. If the count is wrong, we wipe the slate clean and start over.
    console.log("🔄 updating schedule...");
    await Notifications.cancelAllScheduledNotificationsAsync();

    // C. Schedule the new ones
    for (const time of SCHEDULED_TIMES) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: i18n.t("visitations.notificationTitle"),
          body: i18n.t(`visitations.${time.bodyKey}`),
          sound: true,
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
        },
      });
    }
    console.log("✅ Visitation notifications scheduled successfully.");
  } catch (error) {
    console.error("Error scheduling notifications:", error);
  }
};

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'web') return;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return;
    }
    
    // We get the token, but for local notifications (which these are), 
    // we don't strictly need the token unless you send from a server.
    // But keeping it here is good practice.
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    console.log("Must use physical device for Push Notifications");
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return token;
}

export const useNotifications = () => {
    // Use a ref to ensure we don't run this logic multiple times if the component re-renders
    const isSetup = useRef(false);

    useEffect(() => {
        if (Platform.OS === 'web' || isSetup.current) return;
        
        isSetup.current = true; // Mark as running

        registerForPushNotificationsAsync().then(() => {
            scheduleVisitationNotifications();
        });

    }, []);
};