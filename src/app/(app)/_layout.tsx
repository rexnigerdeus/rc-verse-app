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
  const { session, loading } = useAuth();

  // Les hooks offline (useStreakNotifications, useSyncQueue) sont importés
  // dynamiquement via require() pour qu'ils ne soient JAMAIS évalués si
  // l'utilisateur n'est pas connecté. Cela évite tout crash iOS natif au boot
  // si le module expo-sqlite n'est pas encore lié (cf. crash logs TestFlight).
  // En cas de crash d'import, on catch et on continue avec un fallback no-op.

  // Hooks toujours actifs (pas de dépendance native lourde) :
  useNotifications();

  // Hooks offline : activés seulement quand un user est connecté
  if (session?.user?.id) {
    try {
      // require dynamique pour différer l'évaluation jusqu'à l'activation
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useStreakNotifications } = require("../../hooks/useStreakNotifications");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useSyncQueue } = require("../../hooks/useSyncQueue");
      useStreakNotifications();
      useSyncQueue({ userId: session.user.id });
    } catch (e) {
      // Si les modules offline crashent au boot (module natif manquant),
      // on logge mais on n'empêche pas l'app de fonctionner.
      console.warn('[AppLayout] Offline hooks failed to init', e);
    }
  }

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