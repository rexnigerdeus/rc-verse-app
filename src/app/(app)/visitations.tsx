import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import i18n from '../../lib/i18n';
import { Feather } from '@expo/vector-icons'; 
import { ScreenWrapper } from '../../components/ScreenWrapper';

type Visitation = {
  key: 'transition' | 'sunrise' | 'fullDay' | 'sunset';
  time: string;
  emoji: string;
  details: {
    description: string;
    instruction: string;
    verse: string;
  };
};

const visitationTimes: Visitation[] = [
  { 
    key: 'transition', 
    time: '00:00 - 00:30', 
    emoji: '🌙',
    details: {
      description: "C'est l'heure du passage d'un jour à un autre.\nSpirituellement, c'est un moment de bascule où Dieu ouvre les portes du lendemain. Les puissances de ténèbres s'activent aussi à cette heure, mais c'est l'opportunité pour l'enfant de Dieu de proclamer la victoire et de programmer son jour dans la prière.",
      instruction: "Déclarer, prophétiser et annuler les œuvres du diable avant qu'elles ne s'installent.",
      verse: "Job 38:12 « As-tu commandé au matin ses ordres ? »"
    } 
  },
  { 
    key: 'sunrise', 
    time: '05:30 - 06:20', 
    emoji: '🌄',
    details: {
      description: "C'est l'heure de la résurrection quotidienne.\nLe lever du soleil symbolise la lumière de Dieu qui chasse les ténèbres de la nuit. C'est le moment où la grâce se renouvelle et où l'on reçoit la force pour la journée.",
      instruction: "Consacrer la journée, demander la faveur divine et prier pour que la lumière de Christ éclaire toutes les décisions.",
      verse: "Lamentations 3:23 « Ses bontés se renouvellent chaque matin »."
    }
  },
  { 
    key: 'fullDay', 
    time: '11:30 - 12:15', 
    emoji: '☀️',
    details: {
      description: "Le Midi est l'heure de la pleine manifestation de la lumière. Rien n'est caché, tout est exposé.\nSpirituellement, c'est le moment où Dieu révèle ce qui était voilé et où la justice triomphe.",
      instruction: "Chercher une visitation de révélation, de clarté, de discernement et de puissance.",
      verse: "Psaume 37:6 « Il fera paraître ta justice comme la lumière, et ton droit comme le soleil à son midi. »"
    }
  },
  { 
    key: 'sunset', 
    time: '18:00 - 18:30', 
    emoji: '🌅',
    details: {
      description: "Le soir marque la fin d'un cycle et la préparation d'un autre.\nC'est l'heure des bilans spirituels : rendre grâce pour la journée, fermer les portes à l'ennemi et entrer dans le repos de Dieu.",
      instruction: "Offrir un sacrifice de louange, remettre ses combats et son âme entre les mains du Seigneur pour la nuit.",
      verse: "Psaume 113:3 « Du lever du soleil jusqu'à son couchant, que le nom de l'Éternel soit célébré ! »"
    }
  },
];

export default function VisitationsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVisitation, setSelectedVisitation] = useState<Visitation | null>(null);
  const router = useRouter();

  const openModal = (visitation: Visitation) => {
    setSelectedVisitation(visitation);
    setModalVisible(true);
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color={Colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Visitations</Text>
            <View style={{width: 24}} />
          </View>
          <Text style={styles.introText}>{i18n.t('visitations.intro')}</Text>
          <ScrollView contentContainerStyle={styles.list}>
            {visitationTimes.map((item) => (
              <Pressable 
                key={item.key} 
                style={({pressed}) => [styles.itemContainer, pressed && {backgroundColor: 'rgba(255,255,255,0.05)'}]} 
                onPress={() => openModal(item)}
              >
                <View style={styles.textContainer}>
                  <Text style={styles.itemTitle}>{`${item.emoji}  ${i18n.t(`visitations.${item.key}`)}`}</Text>
                  <Text style={styles.itemTime}>{item.time}</Text>
                </View>
                <View style={styles.iconContainer}>
                    <Feather name="chevron-right" size={20} color={Colors.accent} />
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {/* MODAL */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <ScrollView style={styles.modalContent} contentContainerStyle={{paddingBottom: 20}}>
                <Text style={styles.modalTitle}>{`${selectedVisitation?.emoji}  ${i18n.t(`visitations.${selectedVisitation?.key}`)}`}</Text>
                
                <Text style={styles.modalDescription}>{selectedVisitation?.details.description}</Text>
                
                <View style={styles.instructionContainer}>
                  <Text style={styles.modalInstruction}>
                    <Text style={{fontFamily: 'Brand_Body_Bold', color: Colors.highlight}}>Instruction : </Text>
                    {selectedVisitation?.details.instruction}
                  </Text>
                </View>

                <Text style={styles.modalVerse}>{selectedVisitation?.details.verse}</Text>

                <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Fermer</Text>
                </Pressable>
              </ScrollView>
            </View>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary, paddingTop: 20, },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: { padding: 8 },
  headerTitle: { fontFamily: 'Brand_Heading', fontSize: 20, color: Colors.text },
  introText: { 
      fontFamily: 'Brand_Body', 
      fontSize: 15, 
      color: 'rgba(244, 241, 234, 0.7)', 
      textAlign: 'center', 
      lineHeight: 24,
      paddingHorizontal: 20,
      marginBottom: 20,
  },
  list: { paddingHorizontal: 15, paddingTop: 20 },
  
  // List Item Styles
  itemContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)', // Darker card background
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 241, 234, 0.05)',
  },
  textContainer: { flex: 1 },
  itemTitle: { 
      fontFamily: 'Brand_Heading', 
      color: Colors.text, 
      fontSize: 20, 
      marginBottom: 5 
  },
  itemTime: { 
      fontFamily: 'Brand_Body_Bold', 
      color: Colors.accent, // Abidjan Clay for time
      fontSize: 14, 
      letterSpacing: 0.5 
  },
  iconContainer: {
      paddingLeft: 15,
  },
  
  // Modal Styles
  modalContainer: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: 'rgba(10, 25, 20, 0.9)' // Very deep forest overlay
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1E453C', // Slightly lighter forest for the card
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(244, 241, 234, 0.1)',
  },
  modalTitle: { 
      fontFamily: 'Brand_Heading', 
      fontSize: 26, 
      color: Colors.text, 
      marginBottom: 20, 
      textAlign: 'center' 
  },
  modalDescription: { 
      fontFamily: 'Brand_Body', 
      fontSize: 16, 
      color: 'rgba(244, 241, 234, 0.9)', 
      lineHeight: 26, 
      marginBottom: 25 
  },
  instructionContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: 20,
    marginBottom: 25,
    borderLeftWidth: 3,
    borderLeftColor: Colors.highlight, // Signal Green accent
  },
  modalInstruction: { 
      fontFamily: 'Brand_Italic', 
      fontSize: 16, 
      color: Colors.text, 
      lineHeight: 24 
  },
  modalVerse: { 
      fontFamily: 'Brand_Heading', 
      fontSize: 16, 
      color: 'rgba(244, 241, 234, 0.6)', 
      textAlign: 'center', 
      marginBottom: 30,
      fontStyle: 'italic',
  },
  closeButton: { 
      backgroundColor: Colors.accent, // Abidjan Clay
      paddingVertical: 15, 
      paddingHorizontal: 40, 
      borderRadius: 30, 
      alignSelf: 'center' 
  },
  closeButtonText: { 
      fontFamily: 'Brand_Body_Bold', 
      color: Colors.text, 
      fontSize: 16 
  },
});