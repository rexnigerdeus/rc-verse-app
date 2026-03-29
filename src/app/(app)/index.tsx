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
  LayoutAnimation,
  Alert,
  KeyboardAvoidingView,
  Dimensions
} from "react-native";
import BrandLogo from "../../components/BrandLogo";
import { Colors } from "../../constants/colors";
import i18n from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";
import { Database } from "../../types/database.types";
import { ScreenWrapper } from "../../components/ScreenWrapper"; // Assuming you have this wrapper from previous steps

// Update Type
type Verse = Database["public"]["Tables"]["verses"]["Row"] & {
  explanation?: string;
  prayer_guide?: string;
};

const STORAGE_KEY_VERSE = 'revival_daily_verse_data_v3';
const STORAGE_KEY_DATE = 'revival_daily_verse_date_v3';
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();
  const [verse, setVerse] = useState<Verse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for AI Expansion
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const router = useRouter();

  const getTodayDateString = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // --- 1. LOAD DAILY VERSE ---
  useEffect(() => {
    if (!user) return;

    const loadDailyVerse = async () => {
      setIsLoading(true);
      setError(null);
      const today = getTodayDateString();

      try {
        // A. Check Local Cache
        const storedDate = await AsyncStorage.getItem(STORAGE_KEY_DATE);
        const storedVerseString = await AsyncStorage.getItem(STORAGE_KEY_VERSE);

        if (storedDate === today && storedVerseString) {
          setVerse(JSON.parse(storedVerseString));
          setIsLoading(false);
          return; 
        }

        // B. Check History (DB)
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

        // C. Get Random Verse
        const { data: randomVerse, error: rpcError } = await supabase.rpc("get_random_verse");

        if (rpcError || !randomVerse || randomVerse.length === 0) {
          throw new Error(i18n.t("errors.findVerse"));
        }

        const newVerse = randomVerse[0];

        // D. Save History
        await supabase.from("verse_history").insert({
          user_id: user.id,
          verse_id: newVerse.id,
          viewed_on: today,
        });

        await saveToCache(today, newVerse);

      } catch (err: any) {
        console.error("Error loading verse:", err);
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

  // --- 2. HANDLE AI EXPANSION ---
  const toggleExpanded = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    // CASE A: Closing
    if (isExpanded) {
        setIsExpanded(false);
        return;
    }

    // CASE B: Opening...
    // 1. If content ALREADY exists, just open
    if (verse?.explanation && verse?.prayer_guide) {
        setIsExpanded(true);
        return;
    }

    // 2. If content MISSING, call AI
    setIsExpanded(true); 
    setIsGeneratingAI(true);

    try {
        const { data, error } = await supabase.functions.invoke('generate-verse-content', {
            body: { 
                verseText: verse?.text,
                verseReference: `${verse?.book} ${verse?.chapter}:${verse?.verse_number}`,
                verseId: verse?.id
            }
        });

        if (error) throw error;

        // Save result locally so UI updates instantly
        if (data && verse) {
            const updatedVerse = { 
                ...verse, 
                explanation: data.explanation, 
                prayer_guide: data.prayer 
            };
            setVerse(updatedVerse);
            await saveToCache(getTodayDateString(), updatedVerse);
        }

    } catch (err) {
        console.error("AI Generation Error:", err);
        Alert.alert("Erreur", "Le service est momentanément indisponible.");
        setIsExpanded(false); 
    } finally {
        setIsGeneratingAI(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color={Colors.accent} style={{marginTop: 50}} />;
    }
    if (error) {
      return (
        <View style={styles.errorContainer}>
            <Feather name="alert-circle" size={24} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }
    if (verse) {
      return (
        <>
          {/* --- HERO CARD (Daily Atom Style) --- */}
          <MotiView
            style={styles.card}
            from={{ opacity: 0, scale: 0.95, translateY: 10 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 600 }}
          >
            {/* Decoration */}
            <View style={styles.cardDecoration} />

            <View style={styles.cardHeaderRow}>
                <View style={styles.tagContainer}>
                    <Ionicons name="sparkles-sharp" size={12} color={Colors.primary} />
                    <Text style={styles.tagText}>Verset du Jour</Text>
                </View>
                <Pressable
                    onPress={handleShare}
                    style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.7 }]}
                >
                    <Feather name="share-2" size={18} color={Colors.textSecondary} />
                </Pressable>
            </View>

            <Text style={styles.verseText}>"{verse.text}"</Text>
            
            <Text style={styles.referenceText}>
                {verse.book} {verse.chapter}:{verse.verse_number}
            </Text>

            {/* Separator */}
            <View style={styles.separator} />

            {/* --- DEEP CONTENT TOGGLE --- */}
            <View>
                {!isExpanded && (
                    <Pressable onPress={toggleExpanded} style={styles.expandButton}>
                        <Text style={styles.expandButtonText}>Approfondir & Prier</Text>
                        <View style={styles.expandIconContainer}>
                            <Feather name="chevron-down" size={16} color={Colors.primary} />
                        </View>
                    </Pressable>
                )}

                {isExpanded && (
                    <View style={styles.deepContent}>
                        {isGeneratingAI ? (
                             <View style={styles.loadingContainer}>
                                <ActivityIndicator color={Colors.accent} />
                                <Text style={styles.loadingText}>Réflexion en cours...</Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.deepSection}>
                                    <View style={styles.deepHeader}>
                                        <Feather name="book-open" size={16} color={Colors.accent} />
                                        <Text style={styles.deepTitle}>Comprendre</Text>
                                    </View>
                                    <Text style={styles.deepText}>{verse.explanation}</Text>
                                </View>

                                <View style={styles.deepSection}>
                                    <View style={styles.deepHeader}>
                                        <Feather name="heart" size={16} color={Colors.accent} />
                                        <Text style={styles.deepTitle}>Prier</Text>
                                    </View>
                                    <Text style={styles.deepTextItalic}>{verse.prayer_guide}</Text>
                                </View>

                                <Pressable onPress={toggleExpanded} style={styles.collapseButton}>
                                   <Text style={styles.collapseText}>Fermer</Text>
                                   <Feather name="chevron-up" size={16} color={Colors.textSecondary} />
                                </Pressable>
                            </>
                        )}
                    </View>
                )}
            </View>
          </MotiView>

          {/* --- MEDITATION ACTION (Habit Row Style) --- */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 600, delay: 200 }}
            style={{ width: '100%' }}
          >
              <Link 
                href={{
                    pathname: "/meditate",
                    params: { verse: JSON.stringify(verse) }
                }} 
                asChild
            >
                <Pressable style={styles.meditateRow}>
                    <View style={styles.meditateIconPlaceholder}>
                        <Feather name="headphones" size={24} color={Colors.text} />
                    </View>
                    <View style={styles.meditateContent}>
                        <Text style={styles.meditateTitle}>Méditer ce verset</Text>
                        <Text style={styles.meditateSubtitle}>Guidé • 5 min • Calme</Text>
                    </View>
                    <View style={styles.playIconCircle}>
                         <Ionicons name="play" size={18} color={Colors.primary} style={{marginLeft: 2}}/>
                    </View>
                </Pressable>
            </Link>
          </MotiView>
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 600, delay: 300 }}
            style={{ width: '100%' }}
            >
            <Link href="/visitations" asChild>
                <Pressable style={styles.visitationRow}>
                    <View style={styles.meditateIconPlaceholder}>
                        <Feather name="sun" size={24} color={Colors.text} />
                    </View>
                    <View style={styles.meditateContent}>
                        <Text style={styles.meditateTitle}>Visitations</Text>
                        <Text style={styles.meditateSubtitle}>Planifiez vos moments de prière</Text>
                    </View>
                    <View style={styles.playIconCircle}>
                          <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
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
    <ScreenWrapper>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }} // Plus besoin de remettre la couleur de fond ou les insets ici !
      >
      <View style={styles.container}>
          <ScrollView 
              contentContainerStyle={styles.contentWrapper}
              showsVerticalScrollIndicator={false}
          >
            
            <View style={styles.header}>
              <View>
                  <Text style={styles.greetingText}>{i18n.t("home.greeting")}</Text>
                  <Text style={styles.dateText}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
              </View>
              
                            <View style={styles.headerRight}>
              
                              {/* History Icon */}
              
                              <Link href="/history" asChild>
              
                                  <Pressable style={styles.iconButton}>
              
                                      <Feather name="clock" size={20} color={Colors.textSecondary} />
              
                                  </Pressable>
              
                              </Link>
              
                              
              
                              {/* Profile Icon */}
              
                              <Pressable style={styles.iconButton} onPress={() => router.push('/profile')}>
              
                                  <Feather name="user" size={20} color={Colors.textSecondary} />
              
                              </Pressable>
              
                            </View>
              
                          </View>
              
              
              
                          {renderContent()}
              
              
              
                        </ScrollView>
              
                    </View>
              
                    </KeyboardAvoidingView>
              
                  </ScreenWrapper>
              
                );
              
              }
              
              
              
              const styles = StyleSheet.create({
              
                container: { 
              
                    flex: 1, 
              
                    backgroundColor: Colors.primary 
              
                },
              
                contentWrapper: { 
              
                    flexGrow: 1, 
              
                    paddingHorizontal: 24, 
              
                    paddingTop: 20, 
              
                    paddingBottom: 40 
              
                },
              
                
              
                // HEADER
              
                header: {
              
                  width: '100%',
              
                  flexDirection: 'row',
              
                  justifyContent: 'space-between', 
              
                  alignItems: 'center',
              
                  marginBottom: 30,
              
                  marginTop: 10,
              
                },
              
                headerRight: {
              
                    flexDirection: 'row',
              
                    gap: 8, 
              
                },
              
                greetingText: {
              
                  fontFamily: 'Brand_Heading', 
              
                  fontSize: 28,
              
                  color: Colors.text, 
              
                },
              
                dateText: {
              
                    fontFamily: 'Brand_Body',
              
                    fontSize: 14,
              
                    color: Colors.textSecondary,
              
                    textTransform: 'capitalize',
              
                    marginTop: 2,
              
                },
              
                iconButton: {
              
                  width: 44,
              
                  height: 44,
              
                  borderRadius: 22, // Circle
              
                  backgroundColor: Colors.surface,
              
                  justifyContent: 'center',
              
                  alignItems: 'center',
              
                  borderWidth: 1,
              
                  borderColor: Colors.border,
              
                },
              
              
              
                // HERO CARD (Atoms Style)
              
                card: {
              
                  width: '100%',
              
                  backgroundColor: Colors.surface, // Deep slate
              
                  borderRadius: 32, // Large Squircle
              
                  padding: 24,
              
                  marginBottom: 20,
              
                  position: 'relative',
              
                  overflow: 'hidden',
              
                  borderWidth: 1,
              
                  borderColor: Colors.border,
              
                },
              
                cardDecoration: {
              
                    position: 'absolute',
              
                    top: -50,
              
                    right: -50,
              
                    width: 150,
              
                    height: 150,
              
                    borderRadius: 75,
              
                    backgroundColor: Colors.surfaceHighlight, // Subtle glow
              
                    opacity: 0.5,
              
                },
              
                cardHeaderRow: {
              
                    flexDirection: 'row',
              
                    justifyContent: 'space-between',
              
                    alignItems: 'center',
              
                    marginBottom: 20,
              
                },
              
                tagContainer: {
              
                  backgroundColor: Colors.accent, // Sage Green
              
                  paddingHorizontal: 12,
              
                  paddingVertical: 6,
              
                  borderRadius: 20,
              
                  flexDirection: 'row',
              
                  alignItems: 'center',
              
                  gap: 6,
              
                },
              
                tagText: {
              
                  fontFamily: 'Brand_Body_Bold',
              
                  fontSize: 12,
              
                  color: Colors.primary, 
              
                  textTransform: 'uppercase',
              
                },
              
                shareButton: { 
              
                  padding: 8,
              
                  backgroundColor: Colors.surfaceHighlight,
              
                  borderRadius: 20,
              
                },
              
              
              
                verseText: {
              
                  fontFamily: 'Brand_Heading', 
              
                  fontSize: 26,
              
                  color: Colors.text,
              
                  textAlign: 'left',
              
                  marginBottom: 12,
              
                  lineHeight: 36,
              
                },
              
                referenceText: {
              
                  fontFamily: 'Brand_Body',
              
                  fontSize: 15,
              
                  color: Colors.textSecondary,
              
                  marginBottom: 20,
              
                },
              
                
              
                separator: {
              
                  height: 1,
              
                  backgroundColor: Colors.border,
              
                  marginBottom: 20,
              
                  width: '100%',
              
                },
              
              
              
                // ACTION BUTTONS (Pill Style)
              
                expandButton: {
              
                  flexDirection: 'row',
              
                  justifyContent: 'space-between',
              
                  alignItems: 'center',
              
                  backgroundColor: Colors.surfaceHighlight,
              
                  paddingVertical: 14,
              
                  paddingHorizontal: 20,
              
                  borderRadius: 24, // Pill
              
                },
              
                expandButtonText: {
              
                  fontFamily: 'Brand_Body_Bold',
              
                  color: Colors.text,
              
                  fontSize: 15,
              
                },
              
                expandIconContainer: {
              
                    width: 24,
              
                    height: 24,
              
                    borderRadius: 12,
              
                    backgroundColor: Colors.accent,
              
                    justifyContent: 'center',
              
                    alignItems: 'center',
              
                },
              
              
              
                // EXPANDED CONTENT
              
                deepContent: {
              
                  marginTop: 5,
              
                },
              
                loadingContainer: {
              
                    padding: 20, 
              
                    alignItems: 'center',
              
                    gap: 10,
              
                },
              
                loadingText: {
              
                    color: Colors.textTertiary, 
              
                    fontSize: 13, 
              
                    fontFamily: 'Brand_Body'
              
                },
              
                deepSection: {
              
                  marginBottom: 24,
              
                  backgroundColor: 'rgba(0,0,0,0.2)', // Slightly darker for text blocks
              
                  padding: 16,
              
                  borderRadius: 20,
              
                },
              
                deepHeader: {
              
                  flexDirection: 'row',
              
                  alignItems: 'center',
              
                  marginBottom: 10,
              
                  gap: 8,
              
                },
              
                deepTitle: {
              
                  fontFamily: 'Brand_Body_Bold',
              
                  color: Colors.accent,
              
                  fontSize: 14,
              
                  textTransform: 'uppercase',
              
                  letterSpacing: 0.5,
              
                },
              
                deepText: {
              
                  fontFamily: 'Brand_Body',
              
                  color: Colors.text,
              
                  fontSize: 16,
              
                  lineHeight: 26,
              
                  textAlign: 'left',
              
                },
              
                deepTextItalic: {
              
                  fontFamily: 'Brand_Body',
              
                  fontStyle: 'italic',
              
                  color: 'rgba(255,255,255,0.85)',
              
                  fontSize: 16,
              
                  lineHeight: 26,
              
                  textAlign: 'left',
              
                },
              
                collapseButton: {
              
                  flexDirection: 'row',
              
                  justifyContent: 'center',
              
                  alignItems: 'center',
              
                  paddingVertical: 10,
              
                  gap: 6,
              
                },
              
                collapseText: {
              
                    color: Colors.textSecondary,
              
                    fontFamily: 'Brand_Body',
              
                    fontSize: 14,
              
                },
              
              
              
                // MEDITATE ROW (Habit Style)
              
                meditateRow: {
              
                  flexDirection: 'row',
              
                  alignItems: 'center',
              
                  backgroundColor: Colors.surface,
              
                  padding: 16,
              
                  borderRadius: 28, // Matches card curvature
              
                  borderWidth: 1,
              
                  borderColor: Colors.border,
              
                },
              
                visitationRow: {
              
                  flexDirection: 'row',
              
                  alignItems: 'center',
              
                  backgroundColor: Colors.surface,
              
                  padding: 16,
              
                  borderRadius: 28,
              
                  borderWidth: 1,
              
                  borderColor: Colors.border,
              
                  marginTop: 20,
              
                },
              
                meditateIconPlaceholder: {
              
                  width: 50,
              
                  height: 50,
              
                  borderRadius: 18, // Squircle
              
                  backgroundColor: Colors.surfaceHighlight,
              
                  justifyContent: 'center',
              
                  alignItems: 'center',
              
                  marginRight: 16,
              
                },
              
                meditateContent: {
              
                  flex: 1,
              
                },
              
                meditateTitle: {
              
                  fontFamily: 'Brand_Heading',
              
                  fontSize: 18,
              
                  color: Colors.text,
              
                  marginBottom: 4,
              
                },
              
                meditateSubtitle: {
              
                  fontFamily: 'Brand_Body',
              
                  fontSize: 13,
              
                  color: Colors.textSecondary,
              
                },
              
                playIconCircle: {
              
                  width: 36,
              
                  height: 36,
              
                  borderRadius: 18,
              
                  backgroundColor: Colors.accent,
              
                  justifyContent: 'center',
              
                  alignItems: 'center',
              
                },
              
              
              
                // ERROR
              
                errorContainer: {
              
                    alignItems: 'center',
              
                    gap: 10,
              
                    marginTop: 50,
              
                },
              
                errorText: { 
              
                    color: Colors.error, 
              
                    fontSize: 16, 
              
                    textAlign: 'center',
              
                    fontFamily: 'Brand_Body'
              
                },
              
              });
              
              