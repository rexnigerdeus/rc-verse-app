import React, { useState, useEffect, useRef, Suspense } from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Canvas } from '@react-three/fiber';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

import { Colors } from '../../constants/colors';
import i18n from '../../lib/i18n';
import MeditationScene from '../../components/MeditationScene'; 

const STORAGE_KEY_VERSE = 'revival_daily_verse_data_v2';

// --- BREATHING CIRCLE (Centerpiece) ---
const BreathingCircle = () => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        scale.value = withRepeat(
            withTiming(1.5, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
            -1, true
        );
        opacity.value = withRepeat(
            withTiming(0.6, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
            -1, true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.breathingCircle, animatedStyle]}>
            <View style={styles.breathingCore} />
        </Animated.View>
    );
};

export default function MeditateScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const navigation = useNavigation();
    
    // --- STATE ---
    const [verse, setVerse] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [sound, setSound] = useState<Audio.Sound | null>(null);

    const timerRef = useRef<any>(null);

    // 1. Load Data
    useEffect(() => {
        const loadContent = async () => {
            setLoading(true);
            try {
                if (params.verse) {
                    setVerse(JSON.parse(params.verse as string));
                } else {
                    const storedVerse = await AsyncStorage.getItem(STORAGE_KEY_VERSE);
                    if (storedVerse) {
                        setVerse(JSON.parse(storedVerse));
                    }
                }
            } catch (e) {
                console.error("Failed to load verse", e);
            } finally {
                setLoading(false);
            }
        };
        loadContent();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (sound) sound.unloadAsync();
        };
    }, []);

    // 2. NAV BAR FIX: Clean toggle
    React.useLayoutEffect(() => {
        // 1. Get the Tab Navigator (It might be 1 or 2 levels up depending on nesting)
        // We try to find the navigator that has a "tabBarStyle" option.
        const parent = navigation.getParent();

        if (parent) {
            parent.setOptions({
                tabBarStyle: {
                    // completely remove it from layout when active
                    display: isActive ? 'none' : undefined,
                    // If your global theme uses a specific color, 'undefined' usually restores it.
                    // If it turns white/broken, you can force your color back like:
                    // backgroundColor: isActive ? '#000' : Colors.primary 
                }
            });
        }

        return () => {
            // Safety: Always restore visibility when leaving
            if (parent) {
                parent.setOptions({ tabBarStyle: undefined });
            }
        };
    }, [isActive, navigation]);

    // 3. Timer Logic
    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            handleStop();
            Alert.alert(i18n.t('common.done') || "Terminé", "Votre session est terminée.");
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, timeLeft]);

    // 4. Audio Logic (Local)
    const playSound = async () => {
        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
            });

            const { sound: newSound } = await Audio.Sound.createAsync(
                require('../../assets/audio/meditation-sound.mp3'), 
                { shouldPlay: true, isLooping: true, volume: 0.5 }
            );
            setSound(newSound);
        } catch (error) {
            console.log("Audio Error (Check file exists):", error);
        }
    };

    // 5. Handlers
    const handleStart = (selectedMinutes: number) => {
        setTimeLeft(selectedMinutes * 60);
        setIsActive(true);
        playSound();
    };

    const handleStop = async () => {
        setIsActive(false);
        if (timerRef.current) clearInterval(timerRef.current);
        if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
            setSound(null);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (loading) {
        return <View style={styles.container}><ActivityIndicator color={Colors.accent} /></View>;
    }

    return (
        <View style={styles.container}>
            {/* --- BACKGROUND LAYER --- */}
            {/* 1. Immersive 3D Stars (Only when Active) */}
            {isActive && (
                <MotiView 
                    from={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    transition={{ type: 'timing', duration: 2000 }}
                    style={styles.immersiveBackground}
                >
                    <Suspense fallback={null}>
                        <Canvas camera={{ position: [0, 0, 1.5] }}>
                            <MeditationScene />
                        </Canvas>
                    </Suspense>
                </MotiView>
            )}

            {/* 2. Standard Noise Texture (Only when NOT Active) */}
            {!isActive && (
                <ImageBackground 
                    source={require('../../assets/images/noise.png')} 
                    style={styles.absoluteFill} 
                    imageStyle={{ opacity: 0.1 }}
                />
            )}

            {/* --- CONTENT LAYER --- */}
            <View style={styles.contentContainer}>
                
                {/* --- STATE A: PREPARATION (Original Layout) --- */}
                {!isActive && (
                    <MotiView 
                        from={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        style={{ flex: 1, width: '100%', alignItems: 'center' }}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>{i18n.t('tabs.meditate') || "Méditation"}</Text>
                            <Pressable onPress={() => router.back()} style={styles.closeButton}>
                                <Feather name="x" size={24} color={Colors.text} />
                            </Pressable>
                        </View>

                        {/* Verse Display */}
                        {verse && (
                            <View style={styles.verseContainer}>
                                <Text style={styles.verseText}>"{verse.text}"</Text>
                                <Text style={styles.verseRef}>{verse.book} {verse.chapter}:{verse.verse_number}</Text>
                            </View>
                        )}

                        {/* Selection Menu */}
                        <MotiView 
                            from={{ opacity: 0, translateY: 20 }} 
                            animate={{ opacity: 1, translateY: 0 }}
                            style={styles.selectionContainer}
                        >
                            <Text style={styles.instructionText}>Choisissez une durée :</Text>
                            <View style={styles.buttonsContainer}>
                                {[15, 30, 60].map((min) => (
                                    <Pressable key={min} style={styles.timeButton} onPress={() => handleStart(min)}>
                                        <Text style={styles.timeButtonText}>{min} min</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </MotiView>
                    </MotiView>
                )}

                {/* --- STATE B: IMMERSION (New Clean Layout) --- */}
                {isActive && (
                    <MotiView 
                        from={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 1500 }}
                        style={styles.activeContainer}
                    >
                        {/* 1. Center: Breathing Light */}
                        <View style={styles.centerFocus}>
                            <BreathingCircle />
                            {/* <Text style={styles.breatheText}>Inspirez...</Text> */}
                        </View>

                        {/* 2. Bottom: Subtle Controls */}
                        <View style={styles.bottomControls}>
                            <Text style={styles.timerSmall}>{formatTime(timeLeft)}</Text>
                            
                            <Pressable style={styles.subtleStopButton} onPress={handleStop}>
                                <Text style={styles.subtleStopText}>Fin</Text>
                            </Pressable>
                        </View>
                    </MotiView>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.primary },
    absoluteFill: { ...StyleSheet.absoluteFillObject },
    
    contentContainer: {
        flex: 1,
        padding: 20,
        zIndex: 1,
    },

    // --- IMMERSIVE BACKGROUND ---
    immersiveBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000000',
        zIndex: 0, 
    },

    // --- ORIGINAL LAYOUT STYLES (Restored) ---
    header: { 
        marginTop: 40, 
        marginBottom: 30, 
        width: '100%', 
        alignItems: 'center', 
        justifyContent: 'center', 
        position: 'relative' 
    },
    title: { fontFamily: 'Brand_Heading', fontSize: 28, color: Colors.text, letterSpacing: 1 },
    closeButton: { position: 'absolute', right: 0, padding: 10 },
    
    verseContainer: { marginBottom: 50, alignItems: 'center' },
    verseText: { 
        fontFamily: 'Brand_Heading', 
        fontSize: 22, 
        color: Colors.text, 
        textAlign: 'center', 
        marginBottom: 15, 
        lineHeight: 32 
    },
    verseRef: { 
        fontFamily: 'Brand_Body_Bold', 
        fontSize: 14, 
        color: Colors.accent, 
        textTransform: 'uppercase', 
        letterSpacing: 1 
    },

    selectionContainer: { width: '100%', alignItems: 'center' },
    instructionText: { fontFamily: 'Brand_Body', color: 'rgba(244, 241, 234, 0.7)', marginBottom: 20 },
    buttonsContainer: { width: '100%', gap: 15 },
    timeButton: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingVertical: 20,
        width: '100%',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: Colors.accent,
        alignItems: 'center',
    },
    timeButtonText: { fontFamily: 'Brand_Body_Bold', fontSize: 18, color: Colors.text },

    // --- NEW IMMERSIVE UI STYLES ---
    activeContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'space-between', 
        paddingBottom: 40,
    },
    centerFocus: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    breathingCircle: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    breathingCore: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: "#fff",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    breatheText: {
        position: 'absolute',
        fontFamily: 'Brand_Body',
        color: 'rgba(255,255,255,0.3)',
        fontSize: 14,
        letterSpacing: 3,
        bottom: -40,
    },
    bottomControls: {
        alignItems: 'center',
        gap: 20,
    },
    timerSmall: {
        fontFamily: 'Brand_Body',
        fontSize: 24,
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
    },
    subtleStopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    subtleStopText: {
        fontFamily: 'Brand_Body',
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
    },
});