// src/app/(app)/_layout.tsx

import { Feather } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Colors } from "../../constants/colors";
import { useNotifications } from "../../hooks/useNotifications";
import i18n from "../../lib/i18n";
import { useAuth } from "../../providers/AuthProvider";

// Helper component for tab icons
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Feather>["name"];
  color: string;
}) {
  return <Feather size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function AppLayout() {
  useNotifications();

  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/(auth)/login");
    }
  }, [session, loading]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: Colors.primary,
        }}
      >
        <ActivityIndicator size="large" color={Colors.text} />
      </View>
    );
  }

  // CHANGED: We now return a Tabs navigator
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.accent, // Abidjan Clay
        tabBarInactiveTintColor: 'rgba(244, 241, 234, 0.7)', // Cream with opacity
        tabBarStyle: { 
          backgroundColor: Colors.primary, 
          borderTopColor: 'rgba(244, 241, 234, 0.1)',
          height: 60, // Slightly taller for elegance
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontFamily: 'Brand_Body',
          fontSize: 10,
          paddingTop: 4,       }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: i18n.t("tabs.dailyVerse"),
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="bookmark" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="meditate"
        options={{
          title: "Méditation",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="play-circle" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bible" 
        options={{
          title: i18n.t("tabs.bible"),
          href: null,
          tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} />, // Example icon
        }}
      />
      <Tabs.Screen
        name="visitations"
        options={{
          title: i18n.t("tabs.visitations"),
          tabBarIcon: ({ color }) => <TabBarIcon name="sun" color={color} />,
        }}
      />
      <Tabs.Screen
        name="prayers"
        options={{
          title: i18n.t("tabs.prayers"),
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="cloud-lightning" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: i18n.t("tabs.contact"),
          tabBarIcon: ({ color }) => <TabBarIcon name="cast" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          // This is the magic property that hides the tab button
          href: null, 
        }}
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          href: null, 
          headerShown: false 
        }} 
      />
      <Tabs.Screen 
        name="admin_dashboard" 
        options={{ 
          href: null, 
          headerShown: false 
        }} 
      />
    </Tabs>
  );
}
