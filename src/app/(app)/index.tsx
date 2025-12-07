// src/app/(app)/index.tsx

import { Feather } from "@expo/vector-icons";
import { Link } from "expo-router";
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
} from "react-native"; // NEW: Import Share and Alert
import BrandLogo from "../../components/BrandLogo";
import { Colors } from "../../constants/colors";
import i18n from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";
import { Database } from "../../types/database.types";

type Verse = Database["public"]["Tables"]["verses"]["Row"];

export default function HomeScreen() {
  const { user } = useAuth();
  const [verse, setVerse] = useState<Verse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // NEW: Function to handle sharing the verse
  const handleShare = async () => {
    if (!verse) return;

    try {
      const message = `"${verse.text}"\n- ${verse.book} ${verse.chapter}:${
        verse.verse_number
      }\n\n${i18n.t("share.message")}`;

      await Share.share({
        message: message,
      });
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // ... (useEffect and fetchDailyVerse logic remains the same)
  useEffect(() => {
    if (!user) return;

    const fetchDailyVerse = async () => {
      setIsLoading(true);
      setError(null);

      // --- NEW: Timezone-safe date creation ---
      // This creates a 'YYYY-MM-DD' string based on the user's local date, not UTC.
      const localDate = new Date();
      const today = `${localDate.getFullYear()}-${String(
        localDate.getMonth() + 1
      ).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;
      // --- END NEW ---

      const { data: historyData, error: historyError } = await supabase
        .from("verse_history")
        .select("*, verses(*)")
        .eq("user_id", user.id)
        .eq("viewed_on", today)
        .single();

      if (historyError && historyError.code !== "PGRST116") {
        console.error("Error fetching history:", historyError);
        setError(i18n.t("errors.fetchVerse"));
        setIsLoading(false);
        return;
      }

      if (historyData && historyData.verses) {
        setVerse(historyData.verses as Verse);
        setIsLoading(false);
        return;
      }

      const { data: randomVerse, error: rpcError } = await supabase.rpc(
        "get_random_verse"
      );

      if (rpcError || !randomVerse || randomVerse.length === 0) {
        console.error("Error fetching random verse:", rpcError);
        setError(i18n.t("errors.findVerse"));
        setIsLoading(false);
        return;
      }

      const newVerse = randomVerse[0];
      setVerse(newVerse);

      const { error: insertError } = await supabase
        .from("verse_history")
        .insert({
          user_id: user.id,
          verse_id: newVerse.id,
          viewed_on: today,
        });

      // --- NEW: Visible error handling for the save action ---
      if (insertError) {
        console.error("Error saving verse to history:", insertError);
        Alert.alert(
          "Erreur",
          "Impossible de sauvegarder le verset dans votre historique."
        );
      }
      // --- END NEW ---

      setIsLoading(false);
    };

    fetchDailyVerse();
  }, [user]);

  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color={Colors.text} />;
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
                <Feather name="share" size={20} color={Colors.text} />
              </Pressable>
              <Text style={styles.referenceText}>
                - {verse.book} {verse.chapter}:{verse.verse_number}
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
            <Link href="/meditate" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.meditateButton,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Feather
                  name="play-circle"
                  size={28}
                  color={Colors.text}
                  style={{ marginRight: 10, paddingBottom: 8}}
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
      <ImageBackground
        source={require("../../assets/images/noise.png")}
        resizeMode="cover"
        style={styles.noiseBackground}
        imageStyle={{ opacity: 0.1 }}
      >
        <ScrollView contentContainerStyle={styles.contentWrapper}>
          <View style={styles.header}>
            <BrandLogo />
            {/* LOG OUT BUTTON COMMENT */}
            {/* <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.logoutButtonText}>
                {i18n.t("home.signOut")}
              </Text>
            </Pressable> */}
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
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  noiseBackground: { flex: 1 },
  contentWrapper: { flexGrow: 1, padding: 20, alignItems: 'center' },
  header: {
    width: '100%',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  greetingText: {
    fontFamily: 'Brand_Heading', // Serif for greeting
    fontSize: 28,
    color: Colors.accent, // Abidjan Clay for warmth
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)', // Darker, cozy overlay
    borderWidth: 1,
    borderColor: 'rgba(244, 241, 234, 0.1)', // Subtle cream border
    borderRadius: 15,
    padding: 30,
    marginBottom: 20,
  },
  verseText: {
    fontFamily: 'Brand_Heading', // Serif for the Word
    fontSize: 24,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 36,
  },
  verseBio: {
    fontFamily: 'Brand_Body',
    fontSize: 17,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 15,
  },
  referenceText: {
    fontFamily: 'Brand_Body_Bold',
    fontSize: 14,
    color: Colors.accent, // Abidjan Clay for reference
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  referenceContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
  },
  shareButton: { padding: 5, marginRight: 10 },
  meditateButton: {
    backgroundColor: Colors.accent, // Abidjan Clay button
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 30,
    width: '100%',
  },
  meditateButtonText: {
    fontFamily: 'Brand_Body_Bold',
    color: Colors.text, // Cream text on Clay button
    fontSize: 16,
    letterSpacing: 0.5,
  },
  logoutButton: {
    backgroundColor: 'rgba(244, 241, 234, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    fontFamily: 'Brand_Body',
    color: Colors.text,
    fontSize: 12,
  },
  errorText: { color: Colors.accent, fontSize: 16, textAlign: 'center' },
  historyLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20, // Add space below
  },
  historyLinkText: {
    fontFamily: 'Brand_Body',
    color: Colors.text,
    fontSize: 14,
    marginLeft: 8,
  },
});