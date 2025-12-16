// src/app/(app)/contact.tsx

import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors } from "../../constants/colors";
import i18n from "../../lib/i18n";
// IMPORTANT: We are switching to FontAwesome5 for better brand icons
import { FontAwesome5 } from "@expo/vector-icons";

// Data for our contact grid. This makes it easy to add or remove items.
const contactItems = [
  { key: 'donation', icon: 'hand-holding-heart', url: 'tel:+2250778554483', labelOverride: "Faire un don" },
  {
    key: "whatsapp",
    icon: "whatsapp",
    url: "https://wa.me/2250778554483", // Correct wa.me link
  },
  {
    key: "facebook",
    icon: "facebook",
    url: "https://www.facebook.com/share/17EHA3sP66/?mibextid=wwXIfr",
  },
  {
    key: "tiktok",
    icon: "tiktok",
    url: "https://www.tiktok.com/@revculture.ci?_t=ZM-90L2KlB20x1&_r=1",
  },
  {
    key: "email",
    icon: "envelope",
    url: "mailto:info@revculture.ci",
  },
  {
    key: "website",
    icon: "globe",
    url: "https://www.revculture.ci",
  },
  {
    key: "location",
    icon: "map-marker-alt",
    url: "https://maps.app.goo.gl/57LFXsU8g5Hcjsf2A",
  },
];

// This is the new component for each box in the grid
const InfoBox = ({ item }: { item: (typeof contactItems)[0] }) => {
  const handlePress = async () => {
    // Special handler for Donation
    if (item.key === 'donation') {
        Alert.alert(
            "Soutenir l'œuvre",
            "Vous pouvez faire un don via Mobile Money au numéro suivant :\n\n+225 07 78 55 44 83\n\nMerci de bénir ce projet !",
            [
                { text: "Copier le numéro", onPress: () => {
                    // If you have Clipboard installed, use it. 
                    // Otherwise, just open dialer
                    Linking.openURL('tel:+2250778554483');
                }},
                { text: "Fermer", style: "cancel" }
            ]
        );
        return;
    }

    // Standard handler for others
    try {
      const supported = await Linking.canOpenURL(item.url);
      if (supported) {
        await Linking.openURL(item.url);
      } else {
        Alert.alert(`Impossible d'ouvrir: ${item.url}`);
      }
    } catch (error) {
      Alert.alert("Erreur");
    }
  };

  // Special style for donation box
  const isDonation = item.key === 'donation';

  return (
    <Pressable style={({pressed}) => [
            styles.boxContainer, 
            pressed && {opacity: 0.7},
            isDonation && styles.donationBox // Apply special style
        ]} onPress={handlePress}>
      <View style={[styles.iconOutline, isDonation && styles.donationIcon]}>
        <FontAwesome5 name={item.icon} size={28} color={isDonation ? Colors.primary : Colors.accent} />
      </View>
      <Text style={[styles.boxLabel, isDonation && styles.donationText]}>
          {item.labelOverride || i18n.t(`contact.${item.key}`)}
      </Text>
    </Pressable>
  );
};

export default function ContactScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{i18n.t("contact.title")}</Text>
        <Text style={styles.introText}>{i18n.t("contact.intro")}</Text>
      </View>
      <FlatList
        data={contactItems}
        renderItem={({ item }) => <InfoBox item={item} />}
        keyExtractor={(item) => item.key}
        numColumns={3} // This creates the 3-column grid
        contentContainerStyle={styles.grid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
      flex: 1,
      backgroundColor: Colors.primary, // Deep Forest
  },
  header: {
    paddingTop: 60,
    paddingBottom: 25,
    paddingHorizontal: 25,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 241, 234, 0.05)', // Very subtle divider
  },
  title: {
    fontFamily: 'Brand_Heading', // Serif
    fontSize: 32,
    color: Colors.text, // Cream
    textAlign: 'center',
    marginBottom: 10,
  },
  introText: {
    fontFamily: 'Brand_Body', // Sans-serif
    fontSize: 15,
    color: 'rgba(244, 241, 234, 0.7)', // Cream with opacity
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 24,
  },
  grid: {
    paddingHorizontal: 10,
    paddingTop: 20,
  },
  boxContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 5,
    marginBottom: 15,
    marginHorizontal: 5,
    backgroundColor: 'rgba(26, 60, 52, 0.5)', // Slightly lighter forest
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(244, 241, 234, 0.05)',
  },
  iconOutline: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(192, 86, 56, 0.1)', // Very faint clay background
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  boxLabel: {
    fontFamily: 'Brand_Body_Bold',
    color: Colors.text,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  donationBox: {
        backgroundColor: Colors.accent, // Abidjan Clay background
        borderColor: Colors.accent,
    },
    donationIcon: {
        backgroundColor: 'rgba(255,255,255,0.2)', // Light background for icon
    },
    donationText: {
        color: Colors.primary, // Dark text on the clay button
        fontWeight: 'bold',
    }
});
