// src/app/(app)/_layout.tsx

import { Feather } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View, Platform } from "react-native";
import { useTheme } from "../../providers/ThemeProvider"; 
import { useNotifications } from "../../hooks/useNotifications";
import { useStreakNotifications } from "../../hooks/useStreakNotifications";
import { useSyncQueue } from "../../hooks/useSyncQueue";
import i18n from "../../lib/i18n";
import { useAuth } from "../../providers/AuthProvider";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Feather>["name"];
  color: string;
}) {
  return <Feather size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function AppLayout() {
  useNotifications();
  useStreakNotifications();
  const { session, loading } = useAuth();
  // Sync queue globale : drain la file dès qu'on a un user connecté.
  useSyncQueue({ userId: session?.user?.id });
  
  const { colors, isDark } = useTheme(); 

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/(auth)/login");
    }
  }, [session, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.primary }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Détection d'iOS pour la zone de sécurité (encoche du bas)
  const isIOS = Platform.OS === 'ios';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: String(colors.accent),
        tabBarInactiveTintColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
        tabBarStyle: { 
          backgroundColor: colors.primary, 
          borderTopColor: colors.border,
          borderTopWidth: 1,
          // SOLUTION DÉFINITIVE : minHeight au lieu de height, et padding plus grand
          minHeight: isIOS ? 85 : 85, 
          paddingBottom: isIOS ? 25 : 20,
          paddingTop: 10,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontFamily: 'Brand_Body',
          fontSize: 10,
          marginTop: 4,      
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: i18n.t("tabs.dailyVerse"),
          tabBarIcon: ({ color }) => <TabBarIcon name="bookmark" color={color} />,
        }}
      />
      <Tabs.Screen
        name="meditate"
        options={{
          title: "Méditation",
          tabBarIcon: ({ color }) => <TabBarIcon name="play-circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="bible"
        options={{
          title: i18n.t("tabs.bible"),
          tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="visitations"
        options={{
          title: i18n.t("tabs.visitations"),
          href: null,
          tabBarIcon: ({ color }) => <TabBarIcon name="sun" color={color} />,
        }}
      />
      <Tabs.Screen
        name="prayers"
        options={{
          title: i18n.t("tabs.prayers"),
          tabBarIcon: ({ color }) => <TabBarIcon name="cloud-lightning" color={color} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Carnet",
          tabBarIcon: ({ color }) => <TabBarIcon name="feather" color={color} />,
        }}
      />
      <Tabs.Screen name="contact" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="admin_dashboard" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}