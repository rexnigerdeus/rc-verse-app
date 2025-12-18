import { Feather } from "@expo/vector-icons";
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
  Alert
} from "react-native";
import BrandLogo from "../../components/BrandLogo";
import { Colors } from "../../constants/colors";
import i18n from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";
import { Database } from "../../types/database.types";

// Update Type
type Verse = Database["public"]["Tables"]["verses"]["Row"] & {
  explanation?: string;
  prayer_guide?: string;
};

const STORAGE_KEY_VERSE = 'revival_daily_verse_data_v3';
const STORAGE_KEY_DATE = 'revival_daily_verse_date_v3';

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
    setIsExpanded(true); // Open drawer
    setIsGeneratingAI(true); // Show spinner

    try {
        console.log("Invoking Edge Function for Verse ID:", verse?.id);
        
        const { data, error } = await supabase.functions.invoke('generate-verse-content', {
            body: { 
                verseText: verse?.text,
                verseReference: `${verse?.book} ${verse?.chapter}:${verse?.verse_number}`,
                verseId: verse?.id
            }
        });

        if (error) {
            console.error("Supabase Function Error Details:", error);
            throw error;
        }

        console.log("AI Data Received:", data);

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
        console.error("Full AI Generation Error:", err);
        Alert.alert("Erreur", "Le service d'intelligence artificielle est momentanément indisponible.");
        setIsExpanded(false); // Close if failed
    } finally {
        setIsGeneratingAI(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color={Colors.text} style={{marginTop: 50}} />;
    }
    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }
    if (verse) {
      return (
        <>
          {/* --- VERSE CARD --- */}
          <MotiView
            style={styles.card}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 800 }}
          >
            <Text style={styles.verseText}>"{verse.text}"</Text>
            
            <View style={styles.referenceContainer}>
              <Pressable
                onPress={handleShare}
                style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.7 }]}
              >
                <Feather name="share-2" size={20} color={Colors.accent} />
              </Pressable>
              <Text style={styles.referenceText}>
                {verse.book} {verse.chapter}:{verse.verse_number}
              </Text>
            </View>

            {/* Separator */}
            <View style={styles.separator} />

            {/* --- DEEP CONTENT BUTTON --- */}
            <View>
                {!isExpanded && (
                    <Pressable onPress={toggleExpanded} style={styles.expandButton}>
                        <Text style={styles.expandButtonText}>Comprendre & Prier</Text>
                        <Feather name="chevron-down" size={20} color={Colors.text} />
                    </Pressable>
                )}

                {isExpanded && (
                    <View style={styles.deepContent}>
                        {isGeneratingAI ? (
                             <View style={{padding: 20, alignItems: 'center'}}>
                                <ActivityIndicator color={Colors.accent} />
                                <Text style={{color: 'rgba(255,255,255,0.5)', marginTop: 10, fontSize: 12}}>
                                    Rédaction en cours...
                                </Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.deepSection}>
                                    <View style={styles.deepHeader}>
                                        <Feather name="book-open" size={16} color={Colors.accent} />
                                        <Text style={styles.deepTitle}>Explication</Text>
                                    </View>
                                    <Text style={styles.deepText}>{verse.explanation}</Text>
                                </View>

                                <View style={styles.deepSection}>
                                    <View style={styles.deepHeader}>
                                        <Feather name="heart" size={16} color={Colors.accent} />
                                        <Text style={styles.deepTitle}>Prière</Text>
                                    </View>
                                    <Text style={styles.deepTextItalic}>{verse.prayer_guide}</Text>
                                </View>

                                <Pressable onPress={toggleExpanded} style={styles.collapseButton}>
                                   <Feather name="chevron-up" size={24} color={Colors.accent} />
                                </Pressable>
                            </>
                        )}
                    </View>
                )}
            </View>
          </MotiView>

          {/* --- NEW MEDITATION CARD (Redesigned) --- */}
          <MotiView
            style={styles.meditateCardWrapper}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 800, delay: 200 }}
          >
            <View style={styles.meditateCardContent}>
                <View style={styles.meditateTextContainer}>
                    <Text style={styles.meditateTitle}>Prêt à méditer ?</Text>
                    <Text style={styles.meditateSubtitle}>Prenez un temps de silence avec Dieu.</Text>
                </View>
                
                <Link 
                    href={{
                        pathname: "/meditate",
                        params: { verse: JSON.stringify(verse) }
                    }} 
                    asChild
                >
                    <Pressable style={({ pressed }) => [styles.playButton, pressed && { opacity: 0.9 }]}>
                         <Feather name="play" size={24} color={Colors.primary} style={{marginLeft: 4}} />
                    </Pressable>
                </Link>
            </View>
          </MotiView>

        </>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.contentWrapper}>
          
          <View style={styles.header}>
            <BrandLogo />
            <Pressable style={styles.profileButton} onPress={() => router.push('/(app)/profile')}>
              <Feather name="user" size={20} color={Colors.accent} />
            </Pressable>
          </View>

          <Text style={styles.greetingText}>{i18n.t("home.greeting")}</Text>
          <Text style={styles.verseBio}>{i18n.t("home.verseBio")}</Text>

          {/* RESTORED HISTORY LINK */}
          <Link href="/history" asChild>
             <Pressable style={styles.historyLinkButton}>
                <Feather name="archive" size={14} color={Colors.accent} />
                <Text style={styles.historyLinkText}>Voir l'historique</Text>
             </Pressable>
          </Link>

          {renderContent()}
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  contentWrapper: { flexGrow: 1, padding: 20, alignItems: 'center' },
  
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  profileButton: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  greetingText: {
    fontFamily: 'Brand_Heading', 
    fontSize: 28,
    color: Colors.accent, 
    textAlign: 'center',
    marginBottom: 5,
  },
  verseBio: {
    fontFamily: 'Brand_Body',
    fontSize: 16,
    color: 'rgba(244, 241, 234, 0.6)',
    textAlign: "center",
    marginBottom: 10,
  },

  // HISTORY LINK
  historyLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    paddingHorizontal: 15,
  },
  historyLinkText: {
    fontFamily: 'Brand_Body',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginLeft: 8,
  },

  // CARD
  card: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)', 
    borderWidth: 1,
    borderColor: 'rgba(244, 241, 234, 0.1)', 
    borderRadius: 20,
    padding: 24,
    marginBottom: 25,
    overflow: 'hidden', 
  },
  verseText: {
    fontFamily: 'Brand_Heading', 
    fontSize: 22,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  referenceContainer: {
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
    width: '100%',
  },
  referenceText: {
    fontFamily: 'Brand_Body_Bold',
    fontSize: 14,
    color: Colors.accent, 
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  shareButton: { 
    position: 'absolute',
    right: 0,
    padding: 10, 
  },
  
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 15,
    width: '100%',
  },

  // EXPANDER
  expandButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  expandButtonText: {
    fontFamily: 'Brand_Body_Bold',
    color: Colors.text,
    fontSize: 14,
  },
  deepContent: {
    marginTop: 10,
  },
  deepSection: {
    marginBottom: 20,
  },
  deepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  deepTitle: {
    fontFamily: 'Brand_Body_Bold',
    color: Colors.accent,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  deepText: {
    fontFamily: 'Brand_Body',
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
  deepTextItalic: {
    fontFamily: 'Brand_Body',
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
  collapseButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },

  // MEDITATION CARD (REDESIGNED)
  meditateCardWrapper: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#1E1E1E', // Darker contrast
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 5, // Padding for inner border effect
  },
  meditateCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  meditateTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  meditateTitle: {
    fontFamily: 'Brand_Heading',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 4,
  },
  meditateSubtitle: {
    fontFamily: 'Brand_Body',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.accent, // Clay color
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  errorText: { color: Colors.accent, fontSize: 16, textAlign: 'center' },
});