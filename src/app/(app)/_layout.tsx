// src/app/(app)/_layout.tsx

import { Feather } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context"; 
import { useTheme } from "../../providers/ThemeProvider"; 
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
  
  // 1. Récupération des couleurs dynamiques et de la zone de sécurité
  const { colors, isDark } = useTheme(); 
  const insets = useSafeAreaInsets(); 

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
          backgroundColor: colors.primary,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        // On ajuste la couleur inactive selon le mode clair ou sombre
        tabBarInactiveTintColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)', 
        tabBarStyle: { 
          backgroundColor: colors.primary, 
          borderTopColor: colors.border,
          borderTopWidth: 1,
          // CORRECTION DE L'ESPACEMENT ICI :
          height: Platform.OS === 'ios' ? 60 + insets.bottom : 70, 
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 10,
          paddingTop: 10,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontFamily: 'Brand_Body',
          fontSize: 10,
          paddingTop: 4,       
        }
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
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="cloud-lightning" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Carnet",
          tabBarIcon: ({ color }) => <TabBarIcon name="feather" color={color} />,
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          href: null, 
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
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