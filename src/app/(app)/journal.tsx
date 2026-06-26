import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';

import { useTheme } from '../../providers/ThemeProvider';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { OfflineBanner } from '../../components/OfflineBanner';
import { SyncIndicator } from '../../components/SyncIndicator';
import { useSyncQueue } from '../../hooks/useSyncQueue';
import {
  getJournal,
  replaceJournal,
  createJournalEntry,
  LocalJournalEntry,
} from '../../lib/offlineDb';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const TAGS = [
  { id: 'note', label: 'Note', emoji: '📝' },
  { id: 'prayer', label: 'Prière', emoji: '🙏' },
  { id: 'word', label: 'Parole', emoji: '💬' },
  { id: 'vision', label: 'Vision', emoji: '👁️' },
  { id: 'idea', label: 'Idée', emoji: '💡' },
];

type JournalEntry = {
  id: number;
  content: string;
  tag: string;
  created_at: string;
};

export default function JournalScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const { isConnected } = useNetworkStatus();

  const [entries, setEntries] = useState<LocalJournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState('');
  const [selectedTag, setSelectedTag] = useState(TAGS[0].id);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const sync = useSyncQueue({ userId: user?.id });

  /**
   * Charge les entrées : 1) cache local instantané, 2) sync serveur en tâche de fond.
   * C'est le pattern offline-first : l'utilisateur voit toujours quelque chose.
   */
  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1) Lecture locale instantanée
      const local = await getJournal(user.id);
      setEntries(local);
      setIsLoading(false);

      // 2) Sync depuis serveur (seulement si online)
      if (isConnected) {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          await replaceJournal(
            user.id,
            data.map((d) => ({
              server_id: d.id,
              user_id: d.user_id,
              content: d.content,
              tag: d.tag,
              created_at: d.created_at,
            }))
          );
          // Recharge depuis le local maintenant à jour
          const refreshed = await getJournal(user.id);
          setEntries(refreshed);
        }
      }
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  }, [user, isConnected]);

  useFocusEffect(
    useCallback(() => {
      fetchEntries();
    }, [fetchEntries])
  );

  const handleSave = async () => {
    if (!newEntry.trim() || !user) return;
    setIsSaving(true);

    try {
      // 1) Toujours écrire en local d'abord (UX instantanée, marche offline)
      await createJournalEntry(user.id, newEntry.trim(), selectedTag);
      setNewEntry('');
      // Refresh local immédiat
      const local = await getJournal(user.id);
      setEntries(local);

      // 2) Si online, déclencher la sync
      if (isConnected) {
        sync.flush();
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde", error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderEntry = ({ item, index }: { item: LocalJournalEntry, index: number }) => {
    const tagInfo = TAGS.find(t => t.id === item.tag) || TAGS[0];
    const date = new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const isPending = item._sync_status === 'pending_create';

    return (
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: index * 100, type: 'timing', duration: 400 }}
        style={styles.entryCard}
      >
        <View style={styles.entryHeader}>
          <View style={styles.entryTagBadge}>
            <Text style={styles.entryTagEmoji}>{tagInfo.emoji}</Text>
            <Text style={styles.entryTagLabel}>{tagInfo.label}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isPending && (
              <Feather name="cloud-off" size={11} color={colors.textTertiary} />
            )}
            <Text style={styles.entryDate}>{date} à {time}</Text>
          </View>
        </View>
        <Text style={styles.entryContent}>"{item.content}"</Text>
      </MotiView>
    );
  };

  return (
    <ScreenWrapper style={{ backgroundColor: colors.primary }}>
      <OfflineBanner />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.container}>

          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={styles.title}>Carnet Intime</Text>
              <SyncIndicator userId={user?.id} />
            </View>
            <Text style={styles.subtitle}>Votre espace de réflexion spirituelle</Text>
          </View>

          <FlatList
            data={entries}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.emptyContainer}>
                  <Feather name="edit-3" size={40} color={colors.textTertiary} style={{marginBottom: 16}} />
                  <Text style={styles.emptyText}>Votre carnet est vide.</Text>
                  <Text style={styles.emptySubtext}>Écrivez votre première note aujourd'hui.</Text>
                </View>
              ) : <ActivityIndicator color={colors.accent} style={{marginTop: 50}} />
            }
            renderItem={renderEntry}
            // L'éditeur (input) est placé au-dessus de la liste via ListHeaderComponent
            ListHeaderComponent={
              <View style={styles.composerContainer}>
                {/* Sélecteur de Tags */}
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={TAGS}
                  keyExtractor={(item) => item.id}
                  style={styles.tagsRow}
                  contentContainerStyle={{ paddingRight: 20 }}
                  renderItem={({ item }) => {
                    const isSelected = selectedTag === item.id;
                    return (
                      <Pressable 
                        style={[styles.tagButton, isSelected && styles.tagButtonActive]}
                        onPress={() => setSelectedTag(item.id)}
                      >
                        <Text style={styles.tagEmoji}>{item.emoji}</Text>
                        <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>{item.label}</Text>
                      </Pressable>
                    );
                  }}
                />

                {/* Zone de texte */}
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Qu'avez-vous sur le cœur ?"
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    value={newEntry}
                    onChangeText={setNewEntry}
                  />
                  
                  {/* Bouton de sauvegarde */}
                  <AnimatePresence>
                    {newEntry.trim().length > 0 && (
                      <MotiView
                        from={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        style={styles.saveActionContainer}
                      >
                        <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
                          {isSaving ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                          ) : (
                            <Feather name="check" size={20} color={colors.primary} />
                          )}
                        </Pressable>
                      </MotiView>
                    )}
                  </AnimatePresence>
                </View>
              </View>
            }
          />

        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  
  header: { paddingTop: 20, paddingHorizontal: 24, marginBottom: 20 },
  title: { fontFamily: 'Brand_Heading', fontSize: 28, color: colors.text, marginBottom: 4 },
  subtitle: { fontFamily: 'Brand_Body', fontSize: 14, color: colors.textSecondary },

  listContent: { paddingHorizontal: 24, paddingBottom: 100 },
  
  // COMPOSER (Editeur)
  composerContainer: { marginBottom: 40 },
  tagsRow: { marginBottom: 16, overflow: 'visible' },
  tagButton: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, 
    paddingVertical: 8, paddingHorizontal: 14, 
    borderRadius: 20, marginRight: 10,
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface,
    borderWidth: 1, borderColor: colors.border
  },
  tagButtonActive: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.text,
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : colors.text,
  },
  tagEmoji: { fontSize: 14 },
  tagText: { fontFamily: 'Brand_Body', fontSize: 13, color: colors.textSecondary },
  tagTextActive: { fontFamily: 'Brand_Body_Bold', color: isDark ? colors.text : colors.primary },

  inputWrapper: { position: 'relative' },
  input: {
    fontFamily: 'Brand_Italic', // Rend la frappe très littéraire et personnelle
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.surfaceBase,
    borderRadius: 24,
    padding: 24,
    paddingBottom: 60, // Laisse de la place pour le bouton
    minHeight: 150,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
    lineHeight: 28,
  },
  saveActionContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  saveButton: {
    backgroundColor: colors.text, // Bouton très contrasté
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // ENTRIES (Historique)
  entryCard: {
    backgroundColor: colors.surfaceBase,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  entryTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  entryTagEmoji: { fontSize: 12 },
  entryTagLabel: { fontFamily: 'Brand_Body_Bold', fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase' },
  entryDate: { fontFamily: 'Brand_Body', fontSize: 12, color: colors.textTertiary },
  
  entryContent: {
    fontFamily: 'Brand_Italic',
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
  },

  // EMPTY STATE
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyText: { fontFamily: 'Brand_Body_Bold', fontSize: 16, color: colors.textSecondary, marginBottom: 4 },
  emptySubtext: { fontFamily: 'Brand_Body', fontSize: 14, color: colors.textTertiary },
});