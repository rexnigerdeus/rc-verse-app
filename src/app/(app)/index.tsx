import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { Link, useRouter } from "expo-router";
import { MotiView } from "moti"; 
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Modal,
  SafeAreaView
} from "react-native";
import { useTheme } from '../../providers/ThemeProvider';
import i18n from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";
import { Database } from "../../types/database.types";
import { ScreenWrapper } from "../../components/ScreenWrapper"; 
import { DailyQuizModal } from "../../components/DailyQuizModal";
import { FlameBadge } from "../../components/FlameBadge";
import { StreakModal } from "../../components/StreakModal";

type Verse = Database["public"]["Tables"]["verses"]["Row"] & {
  explanation?: string;
  prayer_guide?: string;
  reflection?: string;
  meditation_question?: string;
};

// v4 : introduction des champs reflection et meditation_question (format YouVersion-like).
// On bumpe la clé pour invalider tous les caches des versions précédentes.
// L'app rechargera depuis Supabase et régénérera via Gemini si nécessaire.
const STORAGE_KEY_VERSE = 'revival_daily_verse_data_v4';
const STORAGE_KEY_DATE = 'revival_daily_verse_date_v4';

// Toutes les clés historiques à nettoyer au démarrage
const LEGACY_KEYS = [
  'revival_daily_verse_data_v1',
  'revival_daily_verse_date_v1',
  'revival_daily_verse_data_v2',
  'revival_daily_verse_date_v2',
  'revival_daily_verse_data_v3',
  'revival_daily_verse_date_v3',
];

/**
 * Nettoie les caches des versions précédentes.
 * Appelé au montage de la Home pour garantir que tout utilisateur
 * (mobile ou web) repart sur le nouveau format de cache.
 */
async function purgeLegacyCaches(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(LEGACY_KEYS);
  } catch {
    /* silencieux */
  }
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [verse, setVerse] = useState<Verse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [quizVisible, setQuizVisible] = useState(false);
  const [streakVisible, setStreakVisible] = useState(false);

  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const router = useRouter();

  const getTodayDateString = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!user) return;

    // 0. Purge des caches des versions précédentes pour forcer la régénération
    //    dans le nouveau format (context / reflection / meditation_question / prayer)
    purgeLegacyCaches();

    const loadDailyVerse = async () => {
      setIsLoading(true);
      setError(null);
      const today = getTodayDateString();

      try {
        const storedDate = await AsyncStorage.getItem(STORAGE_KEY_DATE);
        const storedVerseString = await AsyncStorage.getItem(STORAGE_KEY_VERSE);

        if (storedDate === today && storedVerseString) {
          const cached = JSON.parse(storedVerseString) as Verse;

          // Cache complet ? On l'utilise directement.
          // Sinon on régénère via Gemini pour récupérer les champs manquants.
          const isComplete =
            cached.explanation &&
            cached.reflection &&
            cached.meditation_question &&
            cached.prayer_guide;

          if (isComplete) {
            setVerse(cached);
            setIsLoading(false);
            return;
          }
          // Cache partiel → on l'affiche tout de suite (UI réactive),
          // puis on régénère le contenu dévotionnel en tâche de fond.
          setVerse(cached);
          setIsLoading(false);
          regenerateDevotional(cached);
          return;
        }

        const { data: historyData } = await supabase
          .from("verse_history")
          .select("*, verses(*)")
          .eq("user_id", user.id)
          .eq("viewed_on", today)
          .single();

        if (historyData && historyData.verses) {
           const verseFromHistory = historyData.verses as Verse;
           await saveToCache(today, verseFromHistory);
           return;
        }

        const { data: randomVerse, error: rpcError } = await supabase.rpc("get_random_verse");

        if (rpcError || !randomVerse || randomVerse.length === 0) {
          throw new Error(i18n.t("errors.findVerse"));
        }

        const newVerse = randomVerse[0];

        await supabase.from("verse_history").insert({
          user_id: user.id,
          verse_id: newVerse.id,
          viewed_on: today,
        });

        await saveToCache(today, newVerse);

      } catch (err: any) {
        setError(i18n.t("errors.fetchVerse"));
      } finally {
        setIsLoading(false);
      }
    };

    loadDailyVerse();
  }, [user]);

  const saveToCache = async (date: string, verseToSave: Verse) => {
    setVerse(verseToSave);
    await AsyncStorage.setItem(STORAGE_KEY_DATE, date);
    await AsyncStorage.setItem(STORAGE_KEY_VERSE, JSON.stringify(verseToSave));
  };

  /**
   * Régénère le contenu dévotionnel d'un verset (context / reflection /
   * meditation_question / prayer) via Gemini. Utilisé :
   *  - Quand le cache est partiel (ancien format sans les nouveaux champs)
   *  - Quand l'utilisateur rouvre "Approfondir" sur un verset jamais enrichi
   *
   * N'écrase le cache qu'une fois la régénération terminée.
   */
  const regenerateDevotional = async (currentVerse: Verse) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-verse-content', {
        body: {
          verseText: currentVerse.text,
          verseReference: `${currentVerse.book} ${currentVerse.chapter}:${currentVerse.verse_number}`,
          verseId: currentVerse.id,
        },
      });
      if (error) throw error;
      if (!data) return;

      const updated: Verse = {
        ...currentVerse,
        explanation: data.explanation ?? data.context ?? currentVerse.explanation ?? '',
        prayer_guide: data.prayer_guide ?? data.prayer ?? currentVerse.prayer_guide ?? '',
        meditation_question: data.meditation_question ?? currentVerse.meditation_question ?? '',
        reflection: data.reflection ?? currentVerse.reflection ?? '',
      };

      // N'écrase le cache que si on a effectivement récupéré du nouveau contenu
      const hasNewContent =
        (data.reflection && !currentVerse.reflection) ||
        (data.meditation_question && !currentVerse.meditation_question);

      if (hasNewContent) {
        await saveToCache(getTodayDateString(), updated);
      }
    } catch (e) {
      // silencieux : si la régénération échoue, on garde le cache existant
      console.warn('[verse] devotional regeneration failed', e);
    }
  };

  const handleShare = async () => {
    if (!verse) return;
    try {
      const message = `"${verse.text}"\n- ${verse.book} ${verse.chapter}:${verse.verse_number}\n\nAppli Revival Culture`;
      if (Platform.OS === 'web' && navigator.share) {
         await navigator.share({ title: 'Revival Culture', text: message });
      } else {
         await Share.share({ message: message });
      }
    } catch (error: any) { }
  };

  const openDeepenModal = async () => {
    setModalVisible(true);
    // On régénère si un seul des 4 champs dévotionnels manque.
    const isComplete =
      verse?.explanation &&
      verse?.reflection &&
      verse?.meditation_question &&
      verse?.prayer_guide;
    if (isComplete) return;

    setIsGeneratingAI(true);
    if (verse) await regenerateDevotional(verse);
    setIsGeneratingAI(false);
  };

  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color={colors.accent} style={{marginTop: 50}} />;
    }
    if (error) {
      return (
        <View style={styles.errorContainer}>
            <Feather name="alert-circle" size={24} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }
    if (verse) {
      return (
        <>
          <MotiView
            style={styles.card}
            from={{ opacity: 0, scale: 0.98, translateY: 10 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 600 }}
          >
            <View style={styles.tagContainer}>
                <Text style={styles.tagText}>Verset du Jour</Text>
            </View>

            <Text style={styles.verseText}>"{verse.text}"</Text>
            
            <Text style={styles.referenceText}>
                {verse.book} {verse.chapter}:{verse.verse_number}
            </Text>

            <Pressable onPress={openDeepenModal} style={styles.expandButton}>
                <Text style={styles.expandButtonText}>Approfondir & Prier</Text>
                <View style={styles.expandIconContainer}>
                    <Feather name="chevron-down" size={14} color={colors.ctaText} />
                </View>
            </Pressable>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 600, delay: 100 }}
            style={{ width: '100%' }}
          >
              <Link href={{ pathname: "/meditate", params: { verse: JSON.stringify(verse) } }} asChild>
                <Pressable style={styles.actionRow}>
                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>Méditer ce verset</Text>
                        <Text style={styles.actionSubtitle}>Guidé • 5 min • Calme</Text>
                    </View>
                    <View style={styles.playIconCircle}>
                         <Feather name="play" size={14} color={colors.ctaText} style={{marginLeft: 2}}/>
                    </View>
                </Pressable>
            </Link>
          </MotiView>

          {/* --- QUIZ ACTION --- */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 600, delay: 250 }}
            style={{ width: '100%' }}
          >
            <Pressable style={styles.actionRow} onPress={() => setQuizVisible(true)}>
                <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Défi Quotidien</Text>
                    <Text style={styles.actionSubtitle}>Testez vos connaissances d'hier</Text>
                </View>
                <View style={[styles.arrowIconCircle, { backgroundColor: colors.accent }]}>
                      <Feather name="target" size={16} color={colors.primary} />
                </View>
            </Pressable>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 600, delay: 200 }}
            style={{ width: '100%' }}
            >
            <Link href="/visitations" asChild>
                <Pressable style={styles.actionRow}>
                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>Visitations</Text>
                        <Text style={styles.actionSubtitle}>Planifiez vos moments</Text>
                    </View>
                    <View style={styles.arrowIconCircle}>
                          <Feather name="arrow-right" size={14} color={colors.ctaText} />
                    </View>
                </Pressable>
            </Link>
          </MotiView>

          {/* --- CARNET ACTION --- */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 600, delay: 400 }}
            style={{ width: '100%' }}
          >
            <Link href="/journal" asChild>
                <Pressable style={styles.actionRow}>
                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>Carnet Intime</Text>
                        <Text style={styles.actionSubtitle}>Écrivez ce que vous avez sur le cœur</Text>
                    </View>
                    <View style={styles.arrowIconCircle}>
                          <Feather name="feather" size={14} color={colors.ctaText} />
                    </View>
                </Pressable>
            </Link>
          </MotiView>
        </>
      );
    }
    return null;
  };

  return (
    <ScreenWrapper style={{ backgroundColor: colors.primary }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.contentWrapper} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <View style={styles.headerLeft}>
                <Text style={styles.greetingText} numberOfLines={1}>{i18n.t("home.greeting")}</Text>
                <Text style={styles.dateText}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
            </View>
            
            <View style={styles.headerRight}>
              <FlameBadge onPress={() => setStreakVisible(true)} />
              <Link href="/history" asChild>
                  <Pressable style={styles.iconButton}>
                      <Feather name="clock" size={18} color={colors.textSecondary} />
                  </Pressable>
              </Link>
              <Pressable style={styles.iconButton} onPress={() => router.push('/profile')}>
                  <Feather name="user" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {renderContent()}

        </ScrollView>

        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <SafeAreaView style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <View style={styles.modalHeaderLeft}>
                            <View style={styles.modalIconBox}>
                                <Feather name="sun" size={14} color={colors.text} />
                            </View>
                            <Text style={styles.modalSmallTitle}>Leçon Quotidienne</Text>
                        </View>
                        <Pressable onPress={() => setModalVisible(false)} style={styles.closeModalButton}>
                            <Feather name="x" size={20} color={colors.text} />
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalMainTitle}>Comprendre et méditer {verse?.book} {verse?.chapter}</Text>
                        <Text style={styles.modalMetaInfo}>Revival Culture • 4 minutes de lecture</Text>

                        <View style={styles.modalSeparator} />

                        {isGeneratingAI ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color={colors.accent} size="large" />
                                <Text style={styles.loadingText}>Connexion au sanctuaire...</Text>
                            </View>
                        ) : (
                            <View>
                                {/* Contexte */}
                                {verse?.explanation ? (
                                    <View style={styles.devotionalSection}>
                                        <View style={styles.devotionalHeader}>
                                            <View style={[styles.devotionalIcon, { backgroundColor: 'rgba(240, 168, 104, 0.15)' }]}>
                                                <Feather name="book-open" size={14} color={colors.accentWarm} />
                                            </View>
                                            <Text style={styles.devotionalLabel}>Contexte</Text>
                                        </View>
                                        <Text style={styles.modalText}>{verse.explanation}</Text>
                                    </View>
                                ) : null}

                                {/* Réflexion */}
                                {verse?.reflection ? (
                                    <View style={styles.devotionalSection}>
                                        <View style={styles.devotionalHeader}>
                                            <View style={[styles.devotionalIcon, { backgroundColor: 'rgba(155, 126, 189, 0.15)' }]}>
                                                <Feather name="feather" size={14} color={colors.accentSecondary} />
                                            </View>
                                            <Text style={styles.devotionalLabel}>Réflexion</Text>
                                        </View>
                                        <Text style={styles.modalText}>{verse.reflection}</Text>
                                    </View>
                                ) : null}

                                {/* Question méditative */}
                                {verse?.meditation_question ? (
                                    <View style={[styles.devotionalSection, styles.meditationBox]}>
                                        <View style={styles.devotionalHeader}>
                                            <View style={[styles.devotionalIcon, { backgroundColor: 'rgba(240, 176, 48, 0.15)' }]}>
                                                <Feather name="help-circle" size={14} color={colors.accent} />
                                            </View>
                                            <Text style={styles.devotionalLabel}>À méditer</Text>
                                        </View>
                                        <Text style={styles.meditationQuestion}>{verse.meditation_question}</Text>
                                    </View>
                                ) : null}

                                {/* Prière */}
                                {verse?.prayer_guide ? (
                                    <View style={[styles.devotionalSection, styles.prayerBox]}>
                                        <View style={styles.devotionalHeader}>
                                            <View style={[styles.devotionalIcon, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(26, 23, 20, 0.06)' }]}>
                                                <Feather name="cloud-lightning" size={14} color={colors.text} />
                                            </View>
                                            <Text style={styles.devotionalLabel}>Prière</Text>
                                        </View>
                                        <Text style={[styles.modalText, styles.prayerText]}>{verse.prayer_guide}</Text>
                                    </View>
                                ) : null}
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.modalBottomActions}>
                        <Pressable onPress={handleShare} style={styles.modalShareButton}>
                            <Text style={styles.modalShareText}>Partager</Text>
                            <Feather name="share" size={16} color={colors.ctaText} />
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>

        <DailyQuizModal visible={quizVisible} onClose={() => setQuizVisible(false)} />
        <StreakModal visible={streakVisible} onClose={() => setStreakVisible(false)} />

      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  contentWrapper: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  
  header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 10 },
  headerLeft: { flex: 1, paddingRight: 16 }, // Empêche le texte de pousser les icônes
  headerRight: { flexDirection: 'row', gap: 8 },
  greetingText: { fontFamily: 'Brand_Heading', fontSize: 24, color: colors.text }, // Réduit de 32 à 24
  dateText: { fontFamily: 'Brand_Body', fontSize: 13, color: colors.textSecondary, textTransform: 'capitalize', marginTop: 4 },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceBase, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border }, // Réduit de 44 à 40

  // Utilisation de surfaceBase au lieu de pure white (surface)
  card: { width: '100%', backgroundColor: colors.surfaceBase, borderRadius: 24, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tagContainer: { backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
  tagText: { fontFamily: 'Brand_Body_Bold', fontSize: 10, color: colors.ctaText, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  verseText: { fontFamily: 'Brand_Heading', fontSize: 22, color: colors.text, textAlign: 'center', marginBottom: 12, lineHeight: 32 }, // Réduit de 28 à 22
  referenceText: { fontFamily: 'Brand_Body', fontSize: 14, color: colors.textSecondary, marginBottom: 24 },
  
  expandButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, gap: 10, borderWidth: 1, borderColor: colors.border },
  expandButtonText: { fontFamily: 'Brand_Body_Bold', color: colors.text, fontSize: 14 },
  expandIconContainer: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },

  // Utilisation de surfaceBase au lieu de pure white
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceBase, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginTop: 10 },
  actionContent: { flex: 1 },
  actionTitle: { fontFamily: 'Brand_Heading', fontSize: 18, color: colors.text, marginBottom: 4 }, // Réduit de 20 à 18
  actionSubtitle: { fontFamily: 'Brand_Body', fontSize: 13, color: colors.textSecondary },
  playIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentWarm, justifyContent: 'center', alignItems: 'center' },
  arrowIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentWarm, justifyContent: 'center', alignItems: 'center' },

  errorContainer: { alignItems: 'center', gap: 10, marginTop: 50 },
  errorText: { color: colors.error, fontSize: 15, textAlign: 'center', fontFamily: 'Brand_Body' },

  modalOverlay: { flex: 1, backgroundColor: colors.backdrop, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.primary, borderTopLeftRadius: 28, borderTopRightRadius: 28, height: '85%', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalIconBox: { backgroundColor: colors.surfaceBase, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  modalSmallTitle: { fontFamily: 'Brand_Body_Bold', color: colors.text, fontSize: 14 },
  closeModalButton: { backgroundColor: colors.surfaceBase, borderRadius: 20, padding: 6 },
  
  modalScrollContent: { paddingBottom: 40, paddingTop: 10 },
  modalMainTitle: { fontFamily: 'Brand_Heading', fontSize: 26, color: colors.text, lineHeight: 36, marginBottom: 12 }, // Réduit de 32 à 26
  modalMetaInfo: { fontFamily: 'Brand_Body', color: colors.textSecondary, fontSize: 13, marginBottom: 24 },
  modalSeparator: { height: 1, backgroundColor: colors.border, width: '100%', marginBottom: 24 },
  
  loadingContainer: { alignItems: 'center', marginTop: 40, gap: 16 },
  loadingText: { fontFamily: 'Brand_Body', color: colors.textTertiary, fontSize: 14 },
  
  modalText: { fontFamily: 'Brand_Body', fontSize: 16, color: colors.text, lineHeight: 28 }, // Réduit de 18 à 16

  // Sections dévotionnelles (style YouVersion)
  devotionalSection: { marginBottom: 22 },
  devotionalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  devotionalIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  devotionalLabel: { fontFamily: 'Brand_Body_Bold', fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.2 },
  meditationBox: {
    backgroundColor: isDark ? 'rgba(240, 176, 48, 0.08)' : 'rgba(240, 168, 104, 0.10)',
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  meditationQuestion: { fontFamily: 'Brand_Italic', fontSize: 17, color: colors.text, lineHeight: 26 },
  prayerBox: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(26, 23, 20, 0.03)',
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 3,
    borderLeftColor: colors.textSecondary,
  },
  prayerText: { fontFamily: 'Brand_Italic', fontSize: 15, color: colors.text, lineHeight: 26 },
  
  modalBottomActions: { paddingTop: 20, alignItems: 'center' },
  modalShareButton: { flexDirection: 'row', backgroundColor: colors.ctaFill, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 24, alignItems: 'center', gap: 10 },
  modalShareText: { fontFamily: 'Brand_Body_Bold', color: colors.ctaText, fontSize: 15 },
});