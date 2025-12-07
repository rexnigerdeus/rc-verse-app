// src/hooks/useNotifications.ts
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";
import i18n from "../lib/i18n";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const scheduleVisitationNotifications = async () => {
  // First, cancel any existing notifications to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  const times = [
    { hour: 0, minute: 0, bodyKey: "notificationBodyTransition" }, // 12:00 AM
    { hour: 5, minute: 30, bodyKey: "notificationBodySunrise" }, // 5:30 AM
    { hour: 11, minute: 30, bodyKey: "notificationBodyFullDay" }, // 11:30 AM
    { hour: 18, minute: 0, bodyKey: "notificationBodySunset" }, // 6:00 PM
  ];

  for (const time of times) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t("visitations.notificationTitle"),
        body: i18n.t(`visitations.${time.bodyKey}`),
      },
      trigger: {
        hour: time.hour,
        minute: time.minute,
        repeats: true,
      },
    });
  }
  console.log("Visitation notifications scheduled.");
};

async function registerForPushNotificationsAsync() {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    alert("Must use physical device for Push Notifications");
  }

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return token;
}

export const useNotifications = () => {
    useEffect(() => {
        // NEW: Stop here if we are on the web
        if (Platform.OS === 'web') return;

        registerForPushNotificationsAsync().then(token => {
            if(token) {
                scheduleVisitationNotifications();
            }
        });
    }, []);
};
