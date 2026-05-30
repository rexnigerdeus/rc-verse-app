import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  Platform,
  View,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from '../../providers/ThemeProvider';
import i18n from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";
import { Database } from "../../types/database.types";
import { ScreenWrapper } from "../../components/ScreenWrapper";

type HistoryItem = Database["public"]["Tables"]["verse_history"]["Row"] & {
  verses: Database["public"]["Tables"]["verses"]["Row"] | null;
};

const VerseHistoryItem = ({ item }: { item: HistoryItem }) => {
  const formattedDate = item.viewed_on
    ? new Date(item.viewed_on).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : i18n.t("history.dateNotAvailable");

  if (!item.verses) {
    return null;
  }

  // 1. Récupération des couleurs dynamiques
  const { colors } = useTheme();
  // 2. Génération des styles
  const styles = createStyles(colors);

  return (
    <View style={styles.itemContainer}>
      <Text style={styles.itemDate}>{formattedDate}</Text>
      <Text style={styles.itemText}>"{item.verses.text}"</Text>
      <Text style={styles.itemReference}>
        - {item.verses.book} {item.verses.chapter}:{item.verses.verse_number}
      </Text>
    </View>
  );
};

export default function HistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Récupération des couleurs dynamiques
  const { colors } = useTheme();
  // 2. Génération des styles
  const styles = createStyles(colors);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("verse_history")
        .select("*, verses(*)")
        .eq("user_id", user.id)
        .order("viewed_on", { ascending: false });

      if (data) {
        setHistory(data as HistoryItem[]);
      }
      if (error) {
        console.error("Error fetching history:", error);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [user]);

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator color={colors.text} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Historique</Text>
          <View style={{width: 24}} />
        </View>
        <FlatList
          data={history}
          renderItem={({ item }) => <VerseHistoryItem item={item} />}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 15 }}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>{i18n.t("history.empty")}</Text>
          )}
        />
      </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  backButton: { padding: 8 },
  headerTitle: { fontFamily: 'Brand_Heading', fontSize: 20, color: colors.text },
  itemContainer: {
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  itemDate: {
    fontFamily: "Outfit_400Regular",
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginBottom: 5,
  },
  itemText: {
    fontFamily: "Lora_400Regular_Italic",
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  itemReference: {
    fontFamily: "Outfit_700Bold",
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    textAlign: "right",
    marginTop: 10,
  },
  emptyText: {
    fontFamily: "Outfit_400Regular",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 50,
  },
});
