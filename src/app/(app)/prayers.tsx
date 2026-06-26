import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform } from "react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";
import { trackEvent } from '../../lib/analytics';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useTheme } from '../../providers/ThemeProvider';
import { OfflineBanner } from '../../components/OfflineBanner';
import { SyncIndicator } from '../../components/SyncIndicator';
import { useSyncQueue } from '../../hooks/useSyncQueue';
import {
  getPrayers,
  replacePrayers,
  createPrayerRequest,
  markPrayerFulfilled,
  LocalPrayerRequest,
} from '../../lib/offlineDb';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export default function PrayersScreen() {
  const { user } = useAuth();
  const [newRequest, setNewRequest] = useState("");
  const [loading, setLoading] = useState(true);

  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const { isConnected } = useNetworkStatus();
  const sync = useSyncQueue({ userId: user?.id });

  const [activeRequests, setActiveRequests] = useState<LocalPrayerRequest[]>([]);
  const [answeredRequests, setAnsweredRequests] = useState<LocalPrayerRequest[]>([]);

  /**
   * Charge les prières : 1) cache local instantané, 2) sync serveur en tâche de fond.
   */
  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1) Lecture locale instantanée
      const local = await getPrayers(user.id);
      const active = local.filter((p) => !p.is_fulfilled);
      const answered = local.filter((p) => p.is_fulfilled);
      setActiveRequests(active);
      setAnsweredRequests(answered);
      setLoading(false);

      // 2) Sync depuis serveur (si online)
      if (isConnected) {
        const { data: activeData, error: activeError } = await supabase
          .from("prayer_requests")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (!activeError && activeData) {
          await replacePrayers(
            user.id,
            activeData.map((d) => ({
              server_id: d.id,
              user_id: d.user_id,
              request_text: d.request_text ?? d.content ?? '',
              is_fulfilled: d.is_fulfilled ? 1 : 0,
              fulfilled_at: d.fulfilled_at,
              created_at: d.created_at,
            }))
          );
          const refreshed = await getPrayers(user.id);
          setActiveRequests(refreshed.filter((p) => !p.is_fulfilled));
          setAnsweredRequests(refreshed.filter((p) => p.is_fulfilled));
        }
      }
    } catch (e) {
      console.warn('[prayers] fetch error', e);
      setLoading(false);
    }
  }, [user, isConnected]);

  useFocusEffect(useCallback(() => { fetchRequests(); }, [fetchRequests]));

  const handleSubmit = async () => {
    if (!user || newRequest.trim() === "") return;

    // 1) Toujours écrire en local d'abord
    await createPrayerRequest(user.id, newRequest.trim());
    setNewRequest("");
    trackEvent('prayer_sent');

    // 2) Refresh UI immédiat
    const local = await getPrayers(user.id);
    setActiveRequests(local.filter((p) => !p.is_fulfilled));
    setAnsweredRequests(local.filter((p) => p.is_fulfilled));

    // 3) Sync vers serveur si online
    if (isConnected) sync.flush();
  };

  const handleMarkAsAnswered = async (localId: number) => {
    // 1) Local d'abord
    await markPrayerFulfilled(localId);
    const local = await getPrayers(user!.id);
    setActiveRequests(local.filter((p) => !p.is_fulfilled));
    setAnsweredRequests(local.filter((p) => p.is_fulfilled));

    // 2) Sync si online
    if (isConnected) sync.flush();
  };

  return (
    <ScreenWrapper style={{ backgroundColor: colors.primary }}>
      <OfflineBanner />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={styles.title}>Mes Sujets de Prière</Text>
              <SyncIndicator userId={user?.id} />
            </View>
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
              activeRequests.map((req) => {
                const isPending = req._sync_status === 'pending_create' || req._sync_status === 'pending_update';
                return (
                  <View key={req.id} style={styles.requestItem}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <Text style={[styles.requestText, { flex: 1 }]}>{req.request_text}</Text>
                      {isPending && <Feather name="cloud-off" size={12} color={colors.textTertiary} />}
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.markAnsweredButton, pressed && { opacity: 0.7 }]}
                      onPress={() => handleMarkAsAnswered(req.id)}
                    >
                      <Feather name="check-circle" size={16} color={colors.textSecondary} />
                      <Text style={styles.markAnsweredButtonText}>Exaucée</Text>
                    </Pressable>
                  </View>
                );
              })
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
                  {req.fulfilled_at && (
                    <Text style={styles.answeredDate}>
                      Le {new Date(req.fulfilled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  )}
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