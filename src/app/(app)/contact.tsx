import { View, Text, StyleSheet, Pressable, Linking, Alert, FlatList, Platform } from 'react-native';
import { Colors } from '../../constants/colors';
import i18n from '../../lib/i18n';
import { FontAwesome5, Feather } from '@expo/vector-icons';

// 1. Social Media Only (Removed Location, Removed Donation from this list)
const contactItems = [
    { key: 'whatsapp', icon: 'whatsapp', url: 'https://wa.me/2250778554483' },
    { key: 'facebook', icon: 'facebook', url: 'https://facebook.com/revivalcultureabidjan' },
    { key: 'tiktok', icon: 'tiktok', url: 'https://www.tiktok.com/@revivalcultureabidjan' },
    { key: 'email', icon: 'envelope', url: 'mailto:contact@revivalculture.ci' },
    { key: 'website', icon: 'globe', url: 'https://www.revivalculture.ci' },
    { key: "location", icon: "map-marker-alt", url: "https://maps.app.goo.gl/57LFXsU8g5Hcjsf2A" },
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
      <Text style={styles.boxLabel}>{i18n.t(`contact.${item.key}`)}</Text>
    </Pressable>
  );
};

export default function ContactScreen() {
    
    // Donation Handler
    const handleDonate = () => {
        const phoneNumber = "+22501010101"; // REPLACE with the real number
    
        Alert.alert(
             "Faire un Don",
            `Vous pouvez faire votre don via ce numéro :\n\n${phoneNumber}`,
            [
                {
                    text: "Annuler",
                    style: "cancel"
                },
                {
                    text: "Appeler",
                    onPress: () => {
                        let phoneUrl = '';
                        if (Platform.OS === 'android') {
                            phoneUrl = `tel:${phoneNumber}`;
                        } else {
                            phoneUrl = `telprompt:${phoneNumber}`;
                        }
                         Linking.openURL(phoneUrl);
                    }
                },
                {
                    text: "Copier",
                    onPress: () => {
                    // If you want to copy to clipboard (requires expo-clipboard)
                    // Clipboard.setStringAsync(phoneNumber); 
                    // For now, we'll just acknowledge
                    }
               }
           ]
        );
   };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{i18n.t('contact.title')}</Text>
                <Text style={styles.introText}>{i18n.t('contact.intro')}</Text>
            </View>

            <View style={styles.content}>
                
                {/* 2. BIG DONATION CARD */}
                <Pressable 
                    style={({pressed}) => [styles.donationCard, pressed && {opacity: 0.9}]}
                    onPress={handleDonate}
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
        backgroundColor: Colors.accent, // Abidjan Clay
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        elevation: 5, // Android Shadow
        shadowColor: '#000', // iOS Shadow
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
    donationSubtitle: { fontFamily: 'Brand_Body_Bold', fontSize: 14, color: 'rgba(26, 60, 52, 0.7)' }, // Dark green text

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
});