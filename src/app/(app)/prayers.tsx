import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform } from "react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";
import { Database } from "../../types/database.types";
import { trackEvent } from '../../lib/analytics';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useTheme } from '../../providers/ThemeProvider';

type PrayerRequest = Database["public"]["Tables"]["prayer_requests"]["Row"];

export default function PrayersScreen() {
  const { user } = useAuth();
  const [newRequest, setNewRequest] = useState("");
  const [activeRequests, setActiveRequests] = useState<PrayerRequest[]>([]);
  const [answeredRequests, setAnsweredRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  const fetchRequests = async () => {
    if (!user) return;
    try {
      const { data: activeData, error: activeError } = await supabase
        .from("prayer_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_fulfilled", false)
        .order("created_at", { ascending: false });
      if (activeError) throw activeError;
      setActiveRequests(activeData);

      const { data: answeredData, error: answeredError } = await supabase
        .from("prayer_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_fulfilled", true)
        .order("fulfilled_at", { ascending: false });
      if (answeredError) throw answeredError;
      setAnsweredRequests(answeredData);
    } catch (error: any) {
      Alert.alert("Erreur", "Impossible de récupérer vos requêtes.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchRequests(); }, [user]));

  const handleSubmit = async () => {
    if (!user || newRequest.trim() === "") return;
    setLoading(true);

    const { error } = await supabase
      .from("prayer_requests")
      .insert({ user_id: user.id, request_text: newRequest.trim(), email: user.email });

    if (error) Alert.alert("Erreur", "Impossible d'enregistrer votre sujet.");
    else { setNewRequest(""); trackEvent('prayer_sent'); }
    await fetchRequests(); 
  };

  const handleMarkAsAnswered = async (id: number) => {
    setLoading(true);
    const { error } = await supabase
      .from("prayer_requests")
      .update({ is_fulfilled: true, fulfilled_at: new Date().toISOString() })
      .eq("id", id);
    if (error) Alert.alert("Erreur", "Impossible de mettre à jour votre sujet.");
    await fetchRequests();
  };

  return (
    <ScreenWrapper style={{ backgroundColor: colors.primary }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Mes Sujets de Prière</Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Écrivez votre sujet de prière ici..."
              placeholderTextColor={colors.textTertiary}
              value={newRequest}
              onChangeText={setNewRequest}
              multiline
            />
            <Pressable style={({ pressed }) => [styles.submitButton, pressed && { opacity: 0.8 }]} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Soumettre</Text>
            </Pressable>
          </View>

          {loading && <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} />}

          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>En attente</Text>
            {activeRequests.length === 0 && !loading ? (
              <Text style={styles.emptyText}>Aucune requête active.</Text>
            ) : (
              activeRequests.map((req) => (
                <View key={req.id} style={styles.requestItem}>
                  <Text style={styles.requestText}>{req.request_text}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.markAnsweredButton, pressed && { opacity: 0.7 }]}
                    onPress={() => handleMarkAsAnswered(req.id)}
                  >
                    <Feather name="check-circle" size={16} color={colors.textSecondary} />
                    <Text style={styles.markAnsweredButtonText}>Exaucée</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>

          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>Exaucées</Text>
            {answeredRequests.length === 0 && !loading ? (
              <Text style={styles.emptyText}>Aucune prière signalée comme exaucée pour le moment.</Text>
            ) : (
              answeredRequests.map((req) => (
                <View key={req.id} style={styles.answeredItem}>
                  <Text style={styles.answeredText}>{req.request_text}</Text>
                  <Text style={styles.answeredDate}>
                    Le {new Date(req.fulfilled_at!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              ))
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { paddingBottom: 50 },
  header: { paddingTop: 20, paddingBottom: 20, paddingHorizontal: 24 },
  title: { fontFamily: 'Brand_Heading', fontSize: 28, color: colors.text, textAlign: 'left' },
  
  formContainer: { paddingHorizontal: 24, marginBottom: 30 },
  input: {
    fontFamily: "Brand_Italic",
    backgroundColor: colors.surfaceBase, 
    color: colors.text,
    borderRadius: 20,
    padding: 24,
    fontSize: 16,
    minHeight: 140,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitButton: { 
    backgroundColor: colors.text, 
    borderRadius: 24, 
    paddingVertical: 16, 
    alignItems: 'center', 
    marginTop: 16,
  },
  submitButtonText: { fontFamily: 'Brand_Body_Bold', color: colors.primary, fontSize: 15 },
  
  listContainer: { paddingHorizontal: 24, marginBottom: 30 },
  listTitle: { fontFamily: 'Brand_Heading', color: colors.textSecondary, fontSize: 20, marginBottom: 16 },
  
  requestItem: { 
    backgroundColor: colors.surfaceBase, 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  requestText: { fontFamily: 'Brand_Body', color: colors.text, fontSize: 16, lineHeight: 24, marginBottom: 20 },
  markAnsweredButton: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border
  },
  markAnsweredButtonText: { fontFamily: 'Brand_Body_Bold', color: colors.textSecondary, fontSize: 13, marginLeft: 8 },
  
  answeredItem: { 
    backgroundColor: isDark ? 'rgba(232, 168, 24, 0.05)' : 'rgba(240, 176, 48, 0.1)', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  answeredText: { fontFamily: 'Brand_Body', color: colors.text, fontSize: 16, lineHeight: 26 }, 
  answeredDate: { fontFamily: 'Brand_Italic', color: colors.accentWarm, textAlign: 'right', marginTop: 16, fontSize: 13 },
  emptyText: { fontFamily: "Brand_Body", color: colors.textTertiary, fontSize: 15 },
});