// src/app/meditate.tsx
import { FontAwesome } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useKeepAwake } from "expo-keep-awake";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AnimatedRing from "../components/AnimatedRing"; // Import our new Ring component
import i18n from "../lib/i18n";

const DURATION_OPTIONS = [1, 5, 10];

export default function MeditateScreen() {
  useKeepAwake();

  const [isMeditating, setIsMeditating] = useState(false);
  const [duration, setDuration] = useState(DURATION_OPTIONS[1]);
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // --- Sound and Audio Configuration ---
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    const loadSound = async () => {
      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/meditation-sound.mp3"),
        { isLooping: true }
      );
      setSound(sound);
    };
    loadSound();
    return () => {
      sound?.unloadAsync();
    };
  }, []);

  // This hook ensures sound stops when the user navigates away
  useFocusEffect(
    useCallback(() => {
      return () => {
        sound?.stopAsync();
      };
    }, [sound])
  );

  // --- Timer Logic ---
  useEffect(() => {
    if (!isMeditating) return;
    if (timeLeft <= 0) {
      setIsMeditating(false);
      sound?.stopAsync();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isMeditating, timeLeft]);

  // --- Handlers ---
  const handleStart = async () => {
    setTimeLeft(duration * 60);
    setIsMeditating(true);
    await sound?.playAsync();
  };

  const handleExit = () => {
    router.back();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  // --- UI Rendering ---

  // Duration Selection UI
  if (!isMeditating) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{i18n.t("meditate.selectDuration")}</Text>
        <View style={styles.durationContainer}>
          {DURATION_OPTIONS.map((min) => (
            <Pressable
              key={min}
              style={[
                styles.durationButton,
                duration === min && styles.durationSelected,
              ]}
              onPress={() => setDuration(min)}
            >
              <Text style={styles.durationText}>{min} min</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.actionButton} onPress={handleStart}>
          <Text style={styles.actionButtonText}>
            {i18n.t("meditate.start")}
          </Text>
        </Pressable>
        <Pressable style={styles.exitButton} onPress={handleExit}>
          <FontAwesome name="close" size={24} color="#666" />
        </Pressable>
      </View>
    );
  }

  // Active Meditation UI
  return (
    <View style={styles.container}>
      <Text style={styles.soundName}>{i18n.t("meditate.soundName")}</Text>

      <View style={styles.animationContainer}>
        <AnimatedRing />
      </View>

      <Text style={styles.adviceText}>{i18n.t("meditate.advice")}</Text>

      <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>

      <Pressable style={styles.exitMeditationButton} onPress={handleExit}>
        //{" "}
        <Text style={styles.exitMeditationButtonText}>
          {i18n.t("meditate.exit")}
        </Text>
      </Pressable>
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  // Duration Selection Styles
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 24,
    color: "#eee",
    marginBottom: 40,
  },
  durationContainer: {
    flexDirection: "row",
    marginBottom: 60,
  },
  durationButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#555",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 15,
  },
  durationSelected: {
    borderColor: "#fff",
  },
  durationText: {
    fontFamily: 'Outfit_400Regular',
    color: "#eee",
    fontSize: 18,
  },
  actionButton: {
    backgroundColor: "#fff",
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 30,
  },
  actionButtonText: {
    fontFamily: 'Outfit_700Bold',
    color: "#111",
    fontSize: 18,
    fontWeight: "bold",
  },
  exitButton: {
    position: "absolute",
    top: 60,
    right: 30,
  },
  // Active Meditation Styles
  soundName: {
    fontFamily: 'Outfit_400Regular',
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    marginBottom: 20,
  },
  animationContainer: {
    width: "100%",
    height: 200,
  },
  adviceText: {
    fontFamily: 'Outfit_400Regular',
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 40,
    maxWidth: "80%",
  },
  timerText: {
    fontSize: 56, // smaller timer
    fontWeight: "200",
    color: "#eee",
    marginBottom: 50,
  },
  exitMeditationButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "#fff",
    borderWidth: 1,
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 30,
  },
  exitMeditationButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
