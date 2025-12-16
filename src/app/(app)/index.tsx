// src/app/(app)/index.tsx

import { Feather } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import Storage
import { Link, useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  Platform
} from "react-native";
import BrandLogo from "../../components/BrandLogo";
import { Colors } from "../../constants/colors";
import i18n from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";
import { Database } from "../../types/database.types";

type Verse = Database["public"]["Tables"]["verses"]["Row"];

const STORAGE_KEY_VERSE = 'revival_daily_verse_data_v2';
const STORAGE_KEY_DATE = 'revival_daily_verse_date_v2';

export default function HomeScreen() {
  const { user } = useAuth();
  const [verse, setVerse] = useState<Verse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to get today's date string (YYYY-MM-DD)
  const getTodayDateString = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!user) return;

    const loadDailyVerse = async () => {
      setIsLoading(true);
      setError(null);
      const today = getTodayDateString();

      try {
        // 1. FIRST: Check Local Storage (The Cache)
        const storedDate = await AsyncStorage.getItem(STORAGE_KEY_DATE);
        const storedVerseString = await AsyncStorage.getItem(STORAGE_KEY_VERSE);

        if (storedDate === today && storedVerseString) {
          // Found valid cache for today! Use it.
          console.log("Using cached verse for today");
          setVerse(JSON.parse(storedVerseString));
          setIsLoading(false);
          return; 
        }

        // 2. SECOND: If cache empty/old, fetch from Supabase
        console.log("Fetching new verse from Supabase...");
        
        // A. Try fetching from Verse History first (Server-side persistence)
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

        // B. If no history, get a Random Verse
        const { data: randomVerse, error: rpcError } = await supabase.rpc("get_random_verse");

        if (rpcError || !randomVerse || randomVerse.length === 0) {
          throw new Error(i18n.t("errors.findVerse"));
        }

        const newVerse = randomVerse[0];

        // C. Save to History (DB) so it syncs across devices
        await supabase.from("verse_history").insert({
          user_id: user.id,
          verse_id: newVerse.id,
          viewed_on: today,
        });

        // D. Save to Cache (Local) for PWA stability
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
      const message = `"${verse.text}"\n- ${verse.book} ${verse.chapter}:${verse.verse_number}\n\n${i18n.t("share.message")}`;
      if (Platform.OS === 'web' && navigator.share) {
         await navigator.share({ title: 'Revival Culture', text: message });
      } else {
         await Share.share({ message: message });
      }
    } catch (error: any) {
       // Ignore abort errors
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
                style={({ pressed }) => [
                  styles.shareButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Feather name="share-2" size={20} color={Colors.accent} />
              </Pressable>
              <Text style={styles.referenceText}>
                {verse.book} {verse.chapter}:{verse.verse_number}
              </Text>
            </View>
          </MotiView>

          {/* --- MEDITATION CARD --- */}
          <MotiView
            style={styles.card}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 800, delay: 200 }}
          >
            <Link 
                href={{
                    pathname: "/meditate",
                    params: { verse: JSON.stringify(verse) }
                }} 
                asChild
            >
              <Pressable
                style={({ pressed }) => [
                  styles.meditateButton,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Feather
                  name="play-circle"
                  size={24}
                  color={Colors.text}
                  style={{ marginRight: 10}}
                />
                <Text style={styles.meditateButtonText}>
                  {i18n.t("home.startMeditation")}
                </Text>
              </Pressable>
            </Link>
          </MotiView>
        </>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Background Image is commented out for cleaner Dark Mode look, un-comment if needed */}
      {/* <ImageBackground source={require("../../assets/images/noise.png")} ... > */}
      
        <ScrollView contentContainerStyle={styles.contentWrapper}>
          <View style={styles.header}>
            <BrandLogo />
            {/* Header Controls (Logout, etc) can go here */}
          </View>

          <Text style={styles.greetingText}>{i18n.t("home.greeting")}</Text>

          <Text style={styles.verseBio}>{i18n.t("home.verseBio")}</Text>

          <Link href="/history" asChild>
             <Pressable style={styles.historyLinkButton}>
                <Feather name="archive" size={16} color={Colors.text} />
                <Text style={styles.historyLinkText}>{i18n.t('tabs.history')}</Text>
             </Pressable>
          </Link>

          {renderContent()}
        </ScrollView>
      {/* </ImageBackground> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  contentWrapper: { flexGrow: 1, padding: 20, alignItems: 'center' },
  header: {
    width: '100%',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  greetingText: {
    fontFamily: 'Brand_Heading', 
    fontSize: 28,
    color: Colors.accent, 
    textAlign: 'center',
    marginBottom: 10,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)', 
    borderWidth: 1,
    borderColor: 'rgba(244, 241, 234, 0.1)', 
    borderRadius: 15,
    padding: 30,
    marginBottom: 30,
  },
  verseText: {
    fontFamily: 'Brand_Heading', 
    fontSize: 24,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 36,
  },
  verseBio: {
    fontFamily: 'Brand_Body',
    fontSize: 16,
    color: 'rgba(244, 241, 234, 0.6)',
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  referenceText: {
    fontFamily: 'Brand_Body_Bold',
    fontSize: 14,
    color: Colors.accent, 
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  referenceContainer: {
    flexDirection: 'row',
    justifyContent: 'center', // Centered reference
    alignItems: 'center',
    marginTop: 10,
    position: 'relative',
    width: '100%',
  },
  shareButton: { 
    position: 'absolute',
    right: 0,
    padding: 10, 
  },
  meditateButton: {
    backgroundColor: Colors.accent, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 30,
    width: '100%',
  },
  meditateButtonText: {
    fontFamily: 'Brand_Body_Bold',
    color: Colors.text, 
    fontSize: 16,
    letterSpacing: 0.5,
  },
  errorText: { color: Colors.accent, fontSize: 16, textAlign: 'center' },
  historyLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 20,
    opacity: 0.7
  },
  historyLinkText: {
    fontFamily: 'Brand_Body',
    color: Colors.text,
    fontSize: 14,
    marginLeft: 8,
    textDecorationLine: 'underline'
  },
});