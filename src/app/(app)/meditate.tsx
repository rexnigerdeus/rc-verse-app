import React, { useState, useEffect, useRef, Suspense, useLayoutEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { Canvas } from '@react-three/fiber';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

import { Colors } from '../../constants/colors';
import i18n from '../../lib/i18n';
import MeditationScene from '../../components/MeditationScene'; 
import { trackEvent } from '../../lib/analytics';

const STORAGE_KEY_VERSE = 'revival_daily_verse_data_v3';
const GLOBAL_AUTHOR = "Spirit One - Mystic Session";

const TRACKS = [
    { id: '1', title: 'For the King', file: require('../../assets/audio/for-the-king.mp3') },
    { id: '2', title: 'Dans son intimité', file: require('../../assets/audio/dans-son-intimite.mp3') },
    { id: '3', title: 'Dans ses parvis', file: require('../../assets/audio/dans-ses-parvis.mp3') },
];

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
    
    const [step, setStep] = useState<'duration' | 'playlist' | 'active'>('duration');
    const [selectedDuration, setSelectedDuration] = useState(0);
    const [selectedTrack, setSelectedTrack] = useState<typeof TRACKS[0] | null>(null);
    
    const [timeLeft, setTimeLeft] = useState(0);
    const [sound, setSound] = useState<Audio.Sound | null>(null);

    // We use a ref to track sound for cleanup because closures in useEffect can be stale
    const soundRef = useRef<Audio.Sound | null>(null);
    const timerRef = useRef<any>(null);

    // 1. Load Verse Data
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
    }, []);

    // 2. AUDIO CLEANUP FIX (Stop music when leaving screen)
    useFocusEffect(
        useCallback(() => {
            return () => {
                // This runs when the screen loses focus (user leaves)
                if (soundRef.current) {
                    console.log("Leaving screen: Stopping audio");
                    soundRef.current.stopAsync();
                    soundRef.current.unloadAsync();
                    soundRef.current = null;
                    setSound(null);
                }
                if (timerRef.current) clearInterval(timerRef.current);
            };
        }, [])
    );

    // 3. NAV BAR FIX
    useLayoutEffect(() => {
        const parent = navigation.getParent();
        if (parent) {
            parent.setOptions({
                tabBarStyle: { 
                    display: step === 'active' ? 'none' : undefined,
                    borderTopWidth: step === 'active' ? 0 : undefined,
                }
            });
        }
        return () => {
            if (parent) parent.setOptions({ tabBarStyle: undefined, borderTopWidth: undefined });
        };
    }, [step, navigation]);

    // 4. Timer Logic
    useEffect(() => {
        if (step === 'active' && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && step === 'active') {
            handleStop();
            Alert.alert(i18n.t('common.done') || "Terminé", "Votre session est terminée.");
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [step, timeLeft]);

    // 5. Audio Logic
    const playSound = async (trackFile: any) => {
        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
            }

            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
            });

            const { sound: newSound } = await Audio.Sound.createAsync(
                trackFile, 
                { shouldPlay: true, isLooping: true, volume: 0.5 }
            );
            
            soundRef.current = newSound; // Update Ref
            setSound(newSound); // Update State (for UI if needed)
        } catch (error) {
            console.log("Audio Error:", error);
            Alert.alert("Erreur Audio", "Impossible de jouer le son.");
        }
    };

    const handleDurationSelect = (minutes: number) => {
        setSelectedDuration(minutes);
        setTimeLeft(minutes * 60);
        setStep('playlist'); 
    };

    const handleTrackSelect = (track: typeof TRACKS[0]) => {
        setSelectedTrack(track);
        setStep('active'); 
        playSound(track.file);

        trackEvent('meditation_start', { track: track.title, duration: selectedDuration });
    };

    const handleStop = async () => {
        // Check if they actually finished (timeLeft is 0) or just stopped early
        if (timeLeft === 0) {
            trackEvent('meditation_complete', { duration: selectedDuration });
        }

        setStep('duration'); 
        setSelectedTrack(null);
        if (timerRef.current) clearInterval(timerRef.current);
        
        if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
            soundRef.current = null;
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
            {/* --- IMMERSIVE LAYER --- */}
            {step === 'active' && (
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

            {/* --- UI LAYER --- */}
            <ImageBackground 
                source={step !== 'active' ? require('../../assets/images/noise.png') : undefined} 
                style={styles.uiContainer} 
                imageStyle={{ opacity: 0.1 }}
            >
                
                {/* Header (Hidden in Immersion) */}
                {step !== 'active' && (
                    <View style={styles.header}>
                        <Text style={styles.title}>{i18n.t('tabs.meditate') || "Méditation"}</Text>
                        <Pressable onPress={() => router.back()} style={styles.closeButton}>
                            <Feather name="x" size={24} color={Colors.text} />
                        </Pressable>
                    </View>
                )}

                <AnimatePresence mode='wait'>
                    {/* --- STEP 1: DURATION (Fixed Spacing) --- */}
                    {step === 'duration' && (
                        <MotiView 
                            key="step1"
                            from={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={styles.centeredStepContainer} 
                        >
                            {verse && (
                                <View style={styles.verseContainer}>
                                    <Text style={styles.verseText}>"{verse.text}"</Text>
                                    <Text style={styles.verseRef}>{verse.book} {verse.chapter}:{verse.verse_number}</Text>
                                </View>
                            )}

                            <View style={styles.selectionContainer}>
                                <Text style={styles.instructionText}>Choisissez une durée :</Text>
                                <View style={styles.buttonsContainer}>
                                    {[15, 30, 60].map((min) => (
                                        <Pressable key={min} style={styles.timeButton} onPress={() => handleDurationSelect(min)}>
                                            <Text style={styles.timeButtonText}>{min} min</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        </MotiView>
                    )}

                    {/* --- STEP 2: PLAYLIST --- */}
                    {step === 'playlist' && (
                        <MotiView
                            key="step2"
                            from={{ opacity: 0, translateX: 50 }} 
                            animate={{ opacity: 1, translateX: 0 }} 
                            exit={{ opacity: 0, translateX: -50 }}
                            style={styles.fullScreenStepContainer}
                        >
                             <View style={styles.playlistHeader}>
                                <Pressable onPress={() => setStep('duration')} style={{padding: 5}}>
                                    <Feather name="arrow-left" size={24} color={Colors.accent} />
                                </Pressable>
                                <View>
                                    <Text style={styles.playlistTitle}>Bibliothèque du Ciel</Text>
                                    <Text style={styles.playlistSubtitle}>Choisissez votre atmosphère</Text>
                                </View>
                             </View>

                             <ScrollView contentContainerStyle={styles.trackList} showsVerticalScrollIndicator={false}>
                                {TRACKS.map((track) => (
                                    <Pressable 
                                        key={track.id} 
                                        style={styles.trackItem} 
                                        onPress={() => handleTrackSelect(track)}
                                    >
                                        <View style={styles.trackIcon}>
                                            <Feather name="music" size={20} color={Colors.primary} />
                                        </View>
                                        <View style={{flex: 1}}>
                                            <Text style={styles.trackTitle}>{track.title}</Text>
                                            <Text style={styles.trackAuthor}>{GLOBAL_AUTHOR}</Text>
                                        </View>
                                        <Feather name="play-circle" size={24} color={Colors.accent} />
                                    </Pressable>
                                ))}
                             </ScrollView>
                        </MotiView>
                    )}

                    {/* --- STEP 3: IMMERSION (Fixed Jump) --- */}
                    {step === 'active' && (
                        <MotiView 
                            key="step3"
                            from={{ opacity: 0 }} 
                            animate={{ opacity: 1 }}
                            transition={{ type: 'timing', duration: 1500 }}
                            // FIX: Absolute fill ensures it snaps to edges instantly
                            style={[StyleSheet.absoluteFillObject, styles.activeContainer]}
                        >
                            {/* TOP: Track Info */}
                            <View style={styles.activeTrackInfo}>
                                <Text style={styles.activeTrackTitle}>{selectedTrack?.title}</Text>
                                <Text style={styles.activeTrackAuthor}>{GLOBAL_AUTHOR}</Text>
                            </View>

                            {/* CENTER: Breathing */}
                            <View style={styles.centerFocus}>
                                <BreathingCircle />
                            </View>

                            {/* BOTTOM: Controls */}
                            <View style={styles.bottomControls}>
                                <Text style={styles.timerSmall}>{formatTime(timeLeft)}</Text>
                                
                                <Pressable style={styles.subtleStopButton} onPress={handleStop}>
                                    <Feather name="stop-circle" size={20} color="rgba(255,255,255,0.5)" />
                                    <Text style={styles.subtleStopText}>Fin</Text>
                                </Pressable>
                            </View>
                        </MotiView>
                    )}
                </AnimatePresence>

            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.primary },
    
    immersiveBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000000',
        zIndex: 0, 
    },
    uiContainer: {
        flex: 1,
        padding: 20,
        zIndex: 1, 
    },

    centeredStepContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        // justifyContent: 'center', <--- Removed to fix spacing gap
        paddingTop: 20, // Push content slightly up near title
    },
    fullScreenStepContainer: {
        flex: 1,
        width: '100%',
    },

    // Header (Fixed Spacing)
    header: { 
        marginTop: 40, 
        marginBottom: 5, // <--- Reduced from 10 or 30
        width: '100%', 
        alignItems: 'center', 
        justifyContent: 'center', 
        position: 'relative',
        minHeight: 40
    },
    title: { fontFamily: 'Brand_Heading', fontSize: 28, color: Colors.text, letterSpacing: 1 },
    closeButton: { position: 'absolute', right: 0, padding: 10 },
    
    // Verse (Fixed Spacing)
    verseContainer: { 
        marginTop: 10, // <--- Closer to title
        marginBottom: 30, 
        alignItems: 'center' 
    },
    verseText: { 
        fontFamily: 'Brand_Heading', 
        fontSize: 22, 
        color: Colors.text, 
        textAlign: 'center', 
        marginBottom: 10, 
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

    // PLAYLIST
    playlistHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        gap: 15,
        marginTop: 20 
    },
    playlistTitle: { fontFamily: 'Brand_Heading', fontSize: 24, color: Colors.text },
    playlistSubtitle: { fontFamily: 'Brand_Body', fontSize: 14, color: 'rgba(255,255,255,0.6)' },
    
    trackList: { gap: 15, paddingBottom: 50 },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 15,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        gap: 15,
        marginBottom: 12
    },
    trackIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trackTitle: { fontFamily: 'Brand_Body_Bold', fontSize: 16, color: Colors.text },
    trackAuthor: { fontFamily: 'Brand_Body', fontSize: 12, color: 'rgba(255,255,255,0.5)' },

    // ACTIVE STATE (Fixed Jump)
    activeContainer: {
        // Absolute position logic handles the layout now
        justifyContent: 'space-between', 
        paddingBottom: 40,
        paddingTop: 60, 
        paddingHorizontal: 20, // Add padding because it's absolute filled
    },
    activeTrackInfo: {
        alignItems: 'center',
        marginTop: 20,
    },
    activeTrackTitle: {
        fontFamily: 'Brand_Heading',
        fontSize: 20,
        color: Colors.text,
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowRadius: 10,
    },
    activeTrackAuthor: {
        fontFamily: 'Brand_Body',
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 1,
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