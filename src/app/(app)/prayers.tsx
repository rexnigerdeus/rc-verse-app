// src/app/(app)/prayers.tsx
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Colors } from "../../constants/colors";
import i18n from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";
import { Database } from "../../types/database.types";

type PrayerRequest = Database["public"]["Tables"]["prayer_requests"]["Row"];

export default function PrayersScreen() {
  const { user } = useAuth();
  const [newRequest, setNewRequest] = useState("");
  const [activeRequests, setActiveRequests] = useState<PrayerRequest[]>([]);
  const [answeredRequests, setAnsweredRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!user) return;
    try {
      // Fetch active requests
      const { data: activeData, error: activeError } = await supabase
        .from("prayer_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_fulfilled", false)
        .order("created_at", { ascending: false });
      if (activeError) throw activeError;
      setActiveRequests(activeData);

      // Fetch answered requests
      const { data: answeredData, error: answeredError } = await supabase
        .from("prayer_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_fulfilled", true)
        .order("fulfilled_at", { ascending: false });
      if (answeredError) throw answeredError;
      setAnsweredRequests(answeredData);
    } catch (error: any) {
      Alert.alert("Error", "Could not fetch prayer requests.");
    } finally {
      setLoading(false);
    }
  };

  // useFocusEffect will refetch data every time the screen comes into view
  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [user])
  );

  const handleSubmit = async () => {
    if (!user || newRequest.trim() === "") return;
    setLoading(true);
    const { error } = await supabase
      .from("prayer_requests")
      .insert({ user_id: user.id, request_text: newRequest.trim() });

    if (error) {
      Alert.alert("Error", "Could not save your prayer request.");
    } else {
      setNewRequest(""); // Clear input on success
    }
    await fetchRequests(); // Refetch all requests
  };

  const handleMarkAsAnswered = async (id: number) => {
    setLoading(true);
    const { error } = await supabase
      .from("prayer_requests")
      .update({ is_fulfilled: true, fulfilled_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      Alert.alert("Error", "Could not update your prayer request.");
    }
    await fetchRequests(); // Refetch all requests
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{i18n.t("prayers.title")}</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder={i18n.t("prayers.placeholder")}
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={newRequest}
          onChangeText={setNewRequest}
          multiline
        />
        <Pressable style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>
            {i18n.t("prayers.submit")}
          </Text>
        </Pressable>
      </View>

      {loading && (
        <ActivityIndicator color={Colors.text} style={{ marginVertical: 20 }} />
      )}

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>{i18n.t("prayers.active")}</Text>
        {activeRequests.length === 0 && !loading ? (
          <Text style={styles.emptyText}>You have no active requests.</Text>
        ) : (
          activeRequests.map((req) => (
            <View key={req.id} style={styles.requestItem}>
              <Text style={styles.requestText}>{req.request_text}</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.markAnsweredButton,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => handleMarkAsAnswered(req.id)}
              >
                <Feather name="check-circle" size={16} color={Colors.text} />
                <Text style={styles.markAnsweredButtonText}>
                  {i18n.t("prayers.markAsAnswered")}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>{i18n.t("prayers.answered")}</Text>
        {answeredRequests.length === 0 && !loading ? (
          <Text style={styles.emptyText}>
            You have no answered prayers yet.
          </Text>
        ) : (
          answeredRequests.map((req) => (
            <View
              key={req.id}
              style={[styles.requestItem, styles.answeredItem]}
            >
              <Text style={[styles.requestText, styles.answeredText]}>
                {req.request_text}
              </Text>
              <Text style={styles.answeredDate}>
                {i18n.t("prayers.answeredOn")}{" "}
                {new Date(req.fulfilled_at!).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  title: { 
      fontFamily: 'Brand_Heading', 
      fontSize: 32, 
      color: Colors.text, 
      textAlign: 'center' 
  },
  formContainer: { paddingHorizontal: 20, marginBottom: 20 },
  input: {
    fontFamily: "Outfit_400Regular",
    backgroundColor: "rgba(0,0,0,0.2)",
    color: Colors.text,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  submitButton: { 
      backgroundColor: Colors.accent, // Abidjan Clay
      borderRadius: 25, 
      paddingVertical: 15, 
      alignItems: 'center', 
      marginTop: 15 
  },
  submitButtonText: { fontFamily: 'Brand_Body_Bold', color: Colors.text, fontSize: 16 },
  listContainer: { paddingHorizontal: 20, marginBottom: 30 },
  listTitle: { 
      fontFamily: 'Brand_Heading', 
      color: Colors.highlight, // Signal Green for section headers
      fontSize: 22, 
      marginBottom: 15, 
      borderBottomWidth: 1, 
      borderBottomColor: 'rgba(255,255,255,0.1)', 
      paddingBottom: 5 
  },
  requestItem: { 
      backgroundColor: 'rgba(0,0,0,0.2)', 
      borderRadius: 12, 
      padding: 20, 
      marginBottom: 15,
      borderLeftWidth: 3,
      borderLeftColor: Colors.accent // Clay accent line
  },
  requestText: { fontFamily: 'Brand_Body', color: Colors.text, fontSize: 16, lineHeight: 24, marginBottom: 15 },
  // The "Mark Answered" Button
  markAnsweredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(204, 243, 129, 0.15)', // Low opacity Signal Green
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(204, 243, 129, 0.3)',
  },
  markAnsweredButtonText: {
    fontFamily: 'Brand_Body_Bold',
    color: Colors.highlight, // Signal Green Text
    fontSize: 14,
    marginLeft: 8,
  },
  answeredButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  answeredButtonText: { color: Colors.text, fontWeight: "600" },
  answeredItem: { 
      backgroundColor: 'rgba(20, 50, 40, 0.6)', 
      borderLeftColor: Colors.highlight // Green accent line
  },
  answeredText: { color: 'rgba(244, 241, 234, 0.5)', textDecorationLine: 'none' }, // Don't strike through, just dim
  answeredDate: { fontFamily: 'Brand_Italic', color: Colors.highlight, textAlign: 'right', marginTop: 5 },
  emptyText: {
    fontFamily: "Outfit_400Regular",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginTop: 10,
  },
});
