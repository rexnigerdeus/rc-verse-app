// src/app/(app)/history.tsx

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors } from "../../constants/colors";
import i18n from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";
import { Database } from "../../types/database.types";

type HistoryItem = Database["public"]["Tables"]["verse_history"]["Row"] & {
  // We add a check to ensure verses is not null
  verses: Database["public"]["Tables"]["verses"]["Row"] | null;
};

const VerseHistoryItem = ({ item }: { item: HistoryItem }) => {
  // CHANGED: We now check if the date exists before trying to format it.
  const formattedDate = item.viewed_on
    ? new Date(item.viewed_on).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : i18n.t("history.dateNotAvailable");

  // We also check if the linked verse exists
  if (!item.verses) {
    return null; // Don't render if the verse data is missing
  }

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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

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
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.text} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t("history.title")}</Text>
      <FlatList
        data={history}
        renderItem={({ item }) => <VerseHistoryItem item={item} />}
        // CHANGED: We now use the unique 'id' of the history record as the key.
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>{i18n.t("history.empty")}</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (styles remain the same)
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingTop: 60,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 28,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 20,
  },
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
    color: Colors.text,
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
