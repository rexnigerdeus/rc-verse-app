import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Alert, FlatList, Platform, Modal } from 'react-native';
import { Colors } from '../../constants/colors';
import i18n from '../../lib/i18n';
import { FontAwesome5, Feather } from '@expo/vector-icons';

const DONATION_NUMBER = "+225 07 78 55 44 83"; // Replace with real number

// 1. Social Media Only
const contactItems = [
    { key: 'whatsapp', icon: 'whatsapp', url: 'https://wa.me/2250778554483' },
    { key: 'facebook', icon: 'facebook', url: 'https://facebook.com/revivalcultureabidjan' },
    { key: 'tiktok', icon: 'tiktok', url: 'https://www.tiktok.com/@revivalcultureabidjan' },
    { key: 'email', icon: 'envelope', url: 'mailto:contact@revivalculture.ci' },
    { key: 'website', icon: 'globe', url: 'https://www.revivalculture.ci' },
    { key: "location", icon: "map-marker-alt", url: "https://maps.app.goo.gl/somewhere" }, // Ensure valid URL
];

const InfoBox = ({ item }: { item: typeof contactItems[0] }) => {
  const handlePress = async () => {
    try {
        const supported = await Linking.canOpenURL(item.url);
        if (supported) await Linking.openURL(item.url);
        else Alert.alert(`Erreur`, `Lien invalide: ${item.url}`);
    } catch (error) {
        Alert.alert('Erreur', 'Impossible d\'ouvrir le lien');
    }
  };

  return (
    <Pressable style={({pressed}) => [styles.boxContainer, pressed && {opacity: 0.7}]} onPress={handlePress}>
      <View style={styles.iconOutline}>
        {/* @ts-ignore */}
        <FontAwesome5 name={item.icon} size={24} color={Colors.accent} />
      </View>
      <Text style={styles.boxLabel}>{i18n.t(`contact.${item.key}`) || item.key}</Text>
    </Pressable>
  );
};

export default function ContactScreen() {
    const [modalVisible, setModalVisible] = useState(false);

    // Call Handler for Modal
    const handleCall = () => {
        let phoneUrl = '';
        if (Platform.OS === 'android') {
            phoneUrl = `tel:${DONATION_NUMBER.replace(/\s/g, '')}`;
        } else {
            phoneUrl = `telprompt:${DONATION_NUMBER.replace(/\s/g, '')}`;
        }
        Linking.openURL(phoneUrl);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{i18n.t('contact.title') || "Contact"}</Text>
                <Text style={styles.introText}>{i18n.t('contact.intro') || "Nous sommes à votre écoute"}</Text>
            </View>

            <View style={styles.content}>
                
                {/* 2. BIG DONATION CARD (Opens Modal now) */}
                <Pressable 
                    style={({pressed}) => [styles.donationCard, pressed && {opacity: 0.9}]}
                    onPress={() => setModalVisible(true)}
                >
                    <View style={styles.donationIconCircle}>
                        <FontAwesome5 name="hand-holding-heart" size={32} color={Colors.primary} />
                    </View>
                    <View style={styles.donationTextContainer}>
                        <Text style={styles.donationTitle}>Faire un don</Text>
                        <Text style={styles.donationSubtitle}>Soutenir la mission</Text>
                    </View>
                    <Feather name="chevron-right" size={24} color={Colors.primary} />
                </Pressable>

                {/* 3. Social Grid */}
                <Text style={styles.sectionTitle}>Nos Réseaux</Text>
                <FlatList
                    data={contactItems}
                    renderItem={({ item }) => <InfoBox item={item} />}
                    keyExtractor={(item) => item.key}
                    numColumns={3}
                    contentContainerStyle={styles.grid}
                />
            </View>

            {/* --- DONATION MODAL --- */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Title */}
                        <Text style={styles.modalTitle}>Soutenir le Projet</Text>

                        {/* Number Button (Clickable) */}
                        <Pressable style={styles.numberBox} onPress={handleCall}>
                            <View>
                                <Text style={styles.numberLabel}>Numéro Wave</Text>
                                <Text style={styles.numberText}>{DONATION_NUMBER}</Text>
                            </View>
                            <View style={styles.callIcon}>
                                <Feather name="phone-call" size={20} color={Colors.primary} />
                            </View>
                        </Pressable>
                        
                        {/* The Message */}
                        <Text style={styles.modalMessage}>
                            Merci de vos dons qui permettent à ce projet d'exister et de constamment s'améliorer. 
                            {"\n\n"}
                            Le numéro ci-dessus est disponible pour tous transferts Wave.
                        </Text>

                        {/* Close Button */}
                        <Pressable 
                            style={styles.closeButton} 
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Fermer</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.primary },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 25,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(244, 241, 234, 0.05)',
    },
    title: { fontFamily: 'Brand_Heading', fontSize: 32, color: Colors.text, textAlign: 'center', marginBottom: 5 },
    introText: { fontFamily: 'Brand_Body', fontSize: 15, color: 'rgba(244, 241, 234, 0.7)', textAlign: 'center', lineHeight: 22 },
    content: { flex: 1, paddingHorizontal: 15, paddingTop: 20 },
    
    // Donation Card Styles
    donationCard: {
        backgroundColor: Colors.accent, 
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        elevation: 5, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    donationIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    donationTextContainer: { flex: 1 },
    donationTitle: { fontFamily: 'Brand_Heading', fontSize: 22, color: Colors.primary },
    donationSubtitle: { fontFamily: 'Brand_Body_Bold', fontSize: 14, color: 'rgba(26, 60, 52, 0.7)' }, 

    // Grid Styles
    sectionTitle: { fontFamily: 'Brand_Heading', fontSize: 18, color: Colors.text, marginBottom: 15, marginLeft: 5, opacity: 0.8 },
    grid: { paddingBottom: 20 },
    boxContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        margin: 5,
        backgroundColor: 'rgba(26, 60, 52, 0.5)',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(244, 241, 234, 0.05)',
    },
    iconOutline: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(192, 86, 56, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    boxLabel: {
        fontFamily: 'Brand_Body_Bold',
        color: Colors.text,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: 'center',
    },

    // --- MODAL STYLES ---
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)', // Darker background for focus
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#1E1E1E', // Dark grey card
        borderRadius: 24,
        padding: 25,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.accent,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    modalTitle: {
        fontFamily: 'Brand_Heading',
        fontSize: 22,
        color: Colors.accent,
        marginBottom: 20,
        textAlign: 'center',
    },
    numberBox: {
        flexDirection: 'row',
        backgroundColor: Colors.accent,
        width: '100%',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    numberLabel: {
        fontFamily: 'Brand_Body',
        fontSize: 12,
        color: 'rgba(26, 60, 52, 0.6)',
        marginBottom: 2,
    },
    numberText: {
        fontFamily: 'Brand_Heading',
        fontSize: 20,
        color: Colors.primary,
    },
    callIcon: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 10,
        borderRadius: 20,
    },
    modalMessage: {
        fontFamily: 'Brand_Body',
        fontSize: 15,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 25,
    },
    closeButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    closeButtonText: {
        fontFamily: 'Brand_Body_Bold',
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});