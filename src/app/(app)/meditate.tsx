import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
// CORRECTION ICI : Ajout de withSequence et withDelay
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence, withDelay } from 'react-native-reanimated';

import { useTheme } from '../../providers/ThemeProvider';
import i18n from '../../lib/i18n';
import { trackEvent } from '../../lib/analytics';

const STORAGE_KEY_VERSE = 'revival_daily_verse_data_v3';
const GLOBAL_AUTHOR = "Spirit One - Mystic Session";

const TRACKS = [
    { id: '1', title: 'For the King', file: require('../../assets/audio/for-the-king.mp3') },
    { id: '2', title: 'Dans son intimité', file: require('../../assets/audio/dans-son-intimite.mp3') },
    { id: '3', title: 'Dans ses parvis', file: require('../../assets/audio/dans-ses-parvis.mp3') },
];

const Particle = ({ angle, radius, delay, size, color }: any) => {
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    const scale = useSharedValue(0.3);
    const opacity = useSharedValue(0.0);

    useEffect(() => {
        setTimeout(() => {
            opacity.value = withRepeat(
                withSequence(
                    withTiming(0.8, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.1, { duration: 4000, easing: Easing.inOut(Easing.ease) })
                ),
                -1, false 
            );

            scale.value = withRepeat(
                withSequence(
                    withDelay(2000, withTiming(1.8, { duration: 12000, easing: Easing.inOut(Easing.ease) })),
                    withTiming(0.3, { duration: 10000, easing: Easing.inOut(Easing.ease) })
                ),
                -1, false
            );
        }, delay);
    }, [delay]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: x }, { translateY: y }, { scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View 
            style={[
                { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, 
                animatedStyle
            ]} 
        />
    );
}

const RelaxingDots = ({ colors }: { colors: any }) => {
    const particles = Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        angle: (i * Math.PI * 2) / 30 + (Math.random() * 0.5),
        radius: 40 + Math.random() * 110, 
        delay: Math.random() * 8000,      
        size: 3 + Math.random() * 6,      
    }));

    return (
        <View style={styles.constellationContainer}>
            <View style={[styles.centerAnchor, { backgroundColor: colors.accent }]} />
            {particles.map(p => (
                <Particle key={p.id} {...p} color={colors.textSecondary} />
            ))}
        </View>
    );
};

export default function MeditateScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const navigation = useNavigation();
    
    const { colors, isDark } = useTheme();
    const dynamicStyles = createStyles(colors, isDark);
    
    const [verse, setVerse] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<'duration' | 'playlist' | 'active'>('duration');
    const [selectedDuration, setSelectedDuration] = useState(0);
    const [selectedTrack, setSelectedTrack] = useState<typeof TRACKS[0] | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [sound, setSound] = useState<Audio.Sound | null>(null);

    const soundRef = useRef<Audio.Sound | null>(null);
    const timerRef = useRef<any>(null);

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

    useFocusEffect(
        useCallback(() => {
            return () => {
                if (soundRef.current) {
                    soundRef.current.stopAsync();
                    soundRef.current.unloadAsync();
                    soundRef.current = null;
                    setSound(null);
                }
                if (timerRef.current) clearInterval(timerRef.current);
            };
        }, [])
    );

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

    useEffect(() => {
        if (step === 'active' && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && step === 'active') {
            handleStop();
            // NOUVELLE ALERTE REDIRIGEANT VERS LE CARNET
            Alert.alert(
                "Session terminée", 
                "Votre esprit est apaisé. Souhaitez-vous noter vos pensées ou révélations ?",
                [
                    { text: "Plus tard", style: "cancel" },
                    { text: "Ouvrir mon carnet", onPress: () => router.push('/journal') }
                ]
            );
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [step, timeLeft]);

    const playSound = async (trackFile: any) => {
        try {
            if (soundRef.current) await soundRef.current.unloadAsync();
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
            });

            const { sound: newSound } = await Audio.Sound.createAsync(
                trackFile, { shouldPlay: true, isLooping: true, volume: 0.5 }
            );
            
            soundRef.current = newSound; 
            setSound(newSound); 
        } catch (error) {
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
        if (timeLeft === 0) trackEvent('meditation_complete', { duration: selectedDuration });

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
        return <View style={dynamicStyles.container}><ActivityIndicator color={colors.accent} /></View>;
    }

    return (
        <View style={dynamicStyles.container}>
            
            {step !== 'active' && (
                <View style={dynamicStyles.header}>
                    <Text style={dynamicStyles.title}>{i18n.t('tabs.meditate') || "Méditation"}</Text>
                    <Pressable onPress={() => router.back()} style={dynamicStyles.closeButton}>
                        <Feather name="x" size={24} color={colors.text} />
                    </Pressable>
                </View>
            )}

            <AnimatePresence mode='wait'>
                {step === 'duration' && (
                    <MotiView 
                        key="step1"
                        from={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={dynamicStyles.stepContainer} 
                    >
                        {verse && (
                            <View style={dynamicStyles.verseContainer}>
                                <Text style={dynamicStyles.verseText}>"{verse.text}"</Text>
                                <Text style={dynamicStyles.verseRef}>{verse.book} {verse.chapter}:{verse.verse_number}</Text>
                            </View>
                        )}

                        <View style={dynamicStyles.selectionContainer}>
                            <Text style={dynamicStyles.instructionText}>Choisissez une durée :</Text>
                            <View style={dynamicStyles.buttonsContainer}>
                                {[15, 30, 60].map((min) => (
                                    <Pressable 
                                        key={min} 
                                        style={({pressed}) => [dynamicStyles.timeButton, pressed && {opacity: 0.8}]} 
                                        onPress={() => handleDurationSelect(min)}
                                    >
                                        <Text style={dynamicStyles.timeButtonText}>{min} min</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    </MotiView>
                )}

                {step === 'playlist' && (
                    <MotiView
                        key="step2"
                        from={{ opacity: 0, translateX: 30 }} 
                        animate={{ opacity: 1, translateX: 0 }} 
                        exit={{ opacity: 0, translateX: -30 }}
                        style={dynamicStyles.stepContainer}
                    >
                         <View style={dynamicStyles.playlistHeader}>
                            <Pressable onPress={() => setStep('duration')} style={{padding: 5}}>
                                <Feather name="arrow-left" size={20} color={colors.textSecondary} />
                            </Pressable>
                            <View>
                                <Text style={dynamicStyles.playlistTitle}>Bibliothèque du Ciel</Text>
                                <Text style={dynamicStyles.playlistSubtitle}>Choisissez votre atmosphère</Text>
                            </View>
                         </View>

                         <ScrollView contentContainerStyle={dynamicStyles.trackList} showsVerticalScrollIndicator={false}>
                            {TRACKS.map((track) => (
                                <Pressable 
                                    key={track.id} 
                                    style={({pressed}) => [dynamicStyles.trackItem, pressed && {opacity: 0.8}]} 
                                    onPress={() => handleTrackSelect(track)}
                                >
                                    <View style={dynamicStyles.trackIcon}>
                                        <Feather name="music" size={18} color={colors.primary} />
                                    </View>
                                    <View style={{flex: 1}}>
                                        <Text style={dynamicStyles.trackTitle}>{track.title}</Text>
                                        <Text style={dynamicStyles.trackAuthor}>{GLOBAL_AUTHOR}</Text>
                                    </View>
                                    <Feather name="play-circle" size={20} color={colors.textTertiary} />
                                </Pressable>
                            ))}
                         </ScrollView>
                    </MotiView>
                )}

                {step === 'active' && (
                    <MotiView 
                        key="step3"
                        from={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 1500 }}
                        style={dynamicStyles.activeContainer}
                    >
                        <View style={dynamicStyles.activeTrackInfo}>
                            <Text style={dynamicStyles.activeTrackTitle}>{selectedTrack?.title}</Text>
                            <Text style={dynamicStyles.activeTrackAuthor}>{GLOBAL_AUTHOR}</Text>
                        </View>

                        <View style={dynamicStyles.centerFocus}>
                            <RelaxingDots colors={colors} />
                        </View>

                        <View style={dynamicStyles.bottomControls}>
                            <Text style={dynamicStyles.timerText}>{formatTime(timeLeft)}</Text>
                            
                            <Pressable style={dynamicStyles.quitButton} onPress={handleStop}>
                                <Feather name="x" size={16} color={colors.text} />
                                <Text style={dynamicStyles.quitButtonText}>Quitter</Text>
                            </Pressable>
                        </View>
                    </MotiView>
                )}
            </AnimatePresence>
        </View>
    );
}

const styles = StyleSheet.create({
    constellationContainer: {
        width: 300, 
        height: 300, 
        justifyContent: 'center', 
        alignItems: 'center'
    },
    centerAnchor: {
        width: 8, 
        height: 8, 
        borderRadius: 4, 
        opacity: 0.3 
    }
});

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: colors.primary,
    },
    
    header: { 
        marginTop: 60, 
        marginBottom: 10,
        width: '100%', 
        alignItems: 'center', 
        justifyContent: 'center', 
        position: 'relative',
        minHeight: 40
    },
    title: { 
        fontFamily: 'Brand_Heading', 
        fontSize: 20, 
        color: colors.text, 
    },
    closeButton: { 
        position: 'absolute', 
        right: 20, 
        padding: 10 
    },
    
    stepContainer: {
        flex: 1,
        width: '100%',
        paddingHorizontal: 24,
    },

    verseContainer: { 
        marginTop: 20,
        marginBottom: 40, 
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    verseText: { 
        fontFamily: 'Brand_Heading', 
        fontSize: 22, 
        color: colors.text, 
        textAlign: 'center', 
        marginBottom: 16, 
        lineHeight: 32 
    },
    verseRef: { 
        fontFamily: 'Brand_Body_Bold', 
        fontSize: 13, 
        color: colors.accent, 
        textTransform: 'uppercase', 
        letterSpacing: 1.5 
    },

    selectionContainer: { width: '100%', alignItems: 'center' },
    instructionText: { 
        fontFamily: 'Brand_Body', 
        color: colors.textSecondary, 
        marginBottom: 20,
        fontSize: 14
    },
    buttonsContainer: { width: '100%', gap: 12 },
    timeButton: {
        backgroundColor: colors.surfaceBase,
        paddingVertical: 18,
        width: '100%',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    timeButtonText: { fontFamily: 'Brand_Body_Bold', fontSize: 16, color: colors.text },

    playlistHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        gap: 12,
        marginTop: 20 
    },
    playlistTitle: { fontFamily: 'Brand_Heading', fontSize: 20, color: colors.text },
    playlistSubtitle: { fontFamily: 'Brand_Body', fontSize: 13, color: colors.textSecondary },
    
    trackList: { gap: 12, paddingBottom: 50 },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceBase,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 16,
    },
    trackIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trackTitle: { fontFamily: 'Brand_Body_Bold', fontSize: 15, color: colors.text, marginBottom: 2 },
    trackAuthor: { fontFamily: 'Brand_Body', fontSize: 13, color: colors.textSecondary },

    activeContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.primary, 
        justifyContent: 'space-between', 
        paddingBottom: 60,
        paddingTop: 80, 
        paddingHorizontal: 24,
    },
    activeTrackInfo: {
        alignItems: 'center',
    },
    activeTrackTitle: {
        fontFamily: 'Brand_Heading',
        fontSize: 20,
        color: colors.text,
        marginBottom: 6,
    },
    activeTrackAuthor: {
        fontFamily: 'Brand_Body',
        fontSize: 13,
        color: colors.textSecondary,
    },
    centerFocus: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomControls: {
        alignItems: 'center',
        gap: 24,
    },
    timerText: {
        fontFamily: 'Brand_Body',
        fontSize: 28,
        color: colors.text,
        letterSpacing: 2,
    },
    quitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: colors.surfaceBase,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    quitButtonText: {
        fontFamily: 'Brand_Body_Bold',
        color: colors.text,
        fontSize: 14,
    },
});