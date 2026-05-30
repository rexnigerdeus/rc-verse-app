import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Alert, KeyboardAvoidingView, Platform, Modal, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import i18n from '../../lib/i18n';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { useRouter } from 'expo-router';

const DONATION_NUMBER = "+225 07 78 55 44 83"; 

const contactItems = [
    { key: 'whatsapp', icon: 'whatsapp', url: 'https://wa.me/2250778554483' },
    { key: 'facebook', icon: 'facebook', url: 'https://www.facebook.com/DeeperGeneration' },
    { key: 'tiktok', icon: 'tiktok', url: 'http://tiktok.com/@revculture.ci' },
    { key: 'email', icon: 'envelope', url: 'mailto:contact@revculture.ci' },
    { key: 'website', icon: 'globe', url: 'https://www.revculture.ci' },
    { key: "location", icon: "map-marker-alt", url: "https://maps.app.goo.gl/o8JjWJ5FVci3X3Ms5" }, 
];

export default function ContactScreen() {
    const [modalVisible, setModalVisible] = useState(false);
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);

    const handleCall = () => {
        let phoneUrl = '';
        if (Platform.OS === 'android') {
            phoneUrl = `tel:${DONATION_NUMBER.replace(/\s/g, '')}`;
        } else {
            phoneUrl = `telprompt:${DONATION_NUMBER.replace(/\s/g, '')}`;
        }
        Linking.openURL(phoneUrl);
    };

    const handlePress = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) await Linking.openURL(url);
            else Alert.alert(`Erreur`, `Lien invalide: ${url}`);
        } catch (error) {
            Alert.alert('Erreur', 'Impossible d\'ouvrir le lien');
        }
    };

    return (
        <ScreenWrapper style={{ backgroundColor: colors.primary }}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                    
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={() => router.back()} style={styles.backButton}>
                            <Feather name="arrow-left" size={24} color={colors.text} />
                        </Pressable>
                        <Text style={styles.title}>{i18n.t('contact.title') || "Contact & Infos"}</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <Text style={styles.introText}>
                        {i18n.t('contact.intro') || "Nous sommes REVIVAL CULTURE ABIDJAN, nous continuons à travailler pour que les fils et filles du royaume vivent la vie du ciel sur la terre. Nous sommes toujours disponibles pour vous."}
                    </Text>

                    <View style={styles.content}>
                        
                        {/* DONATION CARD */}
                        <Pressable 
                            style={({pressed}) => [styles.donationCard, pressed && {opacity: 0.8}]}
                            onPress={() => setModalVisible(true)}
                        >
                            <View style={styles.donationIconCircle}>
                                <FontAwesome5 name="hand-holding-heart" size={24} color={colors.ctaText} />
                            </View>
                            <View style={styles.donationTextContainer}>
                                <Text style={styles.donationTitle}>Faire un don</Text>
                                <Text style={styles.donationSubtitle}>Soutenir la mission</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
                        </Pressable>

                        {/* SOCIAL GRID */}
                        <Text style={styles.sectionTitle}>Nos Réseaux</Text>
                        <View style={styles.grid}>
                            {contactItems.map((item) => (
                                <Pressable 
                                    key={item.key}
                                    style={({pressed}) => [styles.boxContainer, pressed && { opacity: 0.8 }]} 
                                    onPress={() => handlePress(item.url)}
                                >
                                    <View style={styles.iconOutline}>
                                        <FontAwesome5 name={item.icon as any} size={20} color={colors.text} />
                                    </View>
                                    <Text style={styles.boxLabel}>{i18n.t(`contact.${item.key}`) || item.key}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* --- DONATION MODAL (Updated UI) --- */}
                    <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                        <SafeAreaView style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                
                                <Text style={styles.modalTitle}>Soutenir le Projet</Text>

                                <Pressable style={styles.numberBox} onPress={handleCall}>
                                    <View>
                                        <Text style={styles.numberLabel}>Numéro Wave</Text>
                                        <Text style={styles.numberText}>{DONATION_NUMBER}</Text>
                                    </View>
                                    <View style={styles.callIcon}>
                                        <Feather name="phone-call" size={18} color={colors.text} />
                                    </View>
                                </Pressable>
                                
                                <Text style={styles.modalMessage}>
                                    Merci de vos dons qui permettent à ce projet d'exister et de constamment s'améliorer. 
                                    {"\n\n"}
                                    Le numéro ci-dessus est disponible pour tous transferts Wave.
                                </Text>

                                <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
                                    <Text style={styles.closeButtonText}>Fermer</Text>
                                </Pressable>
                            </View>
                        </SafeAreaView>
                    </Modal>

                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flexGrow: 1, paddingBottom: 40 },
    
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 24, paddingHorizontal: 24 },
    backButton: { padding: 8, marginLeft: -8 },
    title: { fontFamily: 'Brand_Heading', fontSize: 24, color: colors.text },
    
    introText: { fontFamily: 'Brand_Body', fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 26, paddingHorizontal: 30, marginBottom: 32 },
    content: { flex: 1, paddingHorizontal: 24 },
    
    donationCard: {
        backgroundColor: colors.surfaceBase, 
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
        borderWidth: 1,
        borderColor: colors.border,
    },
    donationIconCircle: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: colors.accentWarm,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 16,
    },
    donationTextContainer: { flex: 1 },
    donationTitle: { fontFamily: 'Brand_Heading', fontSize: 20, color: colors.text, marginBottom: 4 },
    donationSubtitle: { fontFamily: 'Brand_Body', fontSize: 14, color: colors.textSecondary }, 

    sectionTitle: { fontFamily: 'Brand_Heading', fontSize: 20, color: colors.text, marginBottom: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 20 },
    boxContainer: {
        width: '48%',
        alignItems: 'center',
        paddingVertical: 24,
        marginBottom: 16,
        backgroundColor: colors.surfaceBase,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    iconOutline: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.primary,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
    },
    boxLabel: {
        fontFamily: 'Brand_Body_Bold', color: colors.textSecondary, fontSize: 12,
        textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center',
    },

    modalOverlay: {
        flex: 1, backgroundColor: colors.backdrop,
        justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modalContent: {
        width: '100%', maxWidth: 360,
        backgroundColor: colors.primary,
        borderRadius: 32, padding: 32, alignItems: 'center',
        borderWidth: 1, borderColor: colors.border,
    },
    modalTitle: { fontFamily: 'Brand_Heading', fontSize: 24, color: colors.text, marginBottom: 24, textAlign: 'center' },
    numberBox: {
        flexDirection: 'row', backgroundColor: colors.surfaceBase, width: '100%',
        paddingVertical: 20, paddingHorizontal: 20, borderRadius: 20,
        alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
        borderWidth: 1, borderColor: colors.border,
    },
    numberLabel: { fontFamily: 'Brand_Body_Bold', fontSize: 12, color: colors.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    numberText: { fontFamily: 'Brand_Heading', fontSize: 22, color: colors.text },
    callIcon: { backgroundColor: colors.primary, padding: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    modalMessage: { fontFamily: 'Brand_Body', fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 26, marginBottom: 32 },
    closeButton: { backgroundColor: colors.surfaceBase, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 24, borderWidth: 1, borderColor: colors.border },
    closeButtonText: { fontFamily: 'Brand_Body_Bold', color: colors.text, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
});