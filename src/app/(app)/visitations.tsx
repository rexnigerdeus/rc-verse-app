import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
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
    key: 'transition', time: '00:00 - 00:30', emoji: '🌙',
    details: {
      description: "C'est l'heure du passage d'un jour à un autre.\nSpirituellement, c'est un moment de bascule où Dieu ouvre les portes du lendemain. Les puissances de ténèbres s'activent aussi à cette heure, mais c'est l'opportunité pour l'enfant de Dieu de proclamer la victoire et de programmer son jour dans la prière.",
      instruction: "Déclarer, prophétiser et annuler les œuvres du diable avant qu'elles ne s'installent.",
      verse: "Job 38:12 « As-tu commandé au matin ses ordres ? »"
    } 
  },
  { 
    key: 'sunrise', time: '05:30 - 06:20', emoji: '🌅',
    details: {
      description: "C'est l'heure de la résurrection quotidienne.\nLe lever du soleil symbolise la lumière de Dieu qui chasse les ténèbres de la nuit. C'est le moment où la grâce se renouvelle et où l'on reçoit la force pour la journée.",
      instruction: "Consacrer la journée, demander la faveur divine et prier pour que la lumière de Christ éclaire toutes les décisions.",
      verse: "Lamentations 3:23 « Ses bontés se renouvellent chaque matin »."
    }
  },
  { 
    key: 'fullDay', time: '11:30 - 12:15', emoji: '☀️',
    details: {
      description: "Le Midi est l'heure de la pleine manifestation de la lumière. Rien n'est caché, tout est exposé.\nSpirituellement, c'est le moment où Dieu révèle ce qui était voilé et où la justice triomphe.",
      instruction: "Chercher une visitation de révélation, de clarté, de discernement et de puissance.",
      verse: "Psaume 37:6 « Il fera paraître ta justice comme la lumière, et ton droit comme le soleil à son midi. »"
    }
  },
  { 
    key: 'sunset', time: '18:00 - 18:30', emoji: '🌇',
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

  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  const openModal = (visitation: Visitation) => {
    setSelectedVisitation(visitation);
    setModalVisible(true);
  };

  return (
    <ScreenWrapper style={{ backgroundColor: colors.primary }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.container}>
          
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Visitations</Text>
            <View style={{width: 24}} />
          </View>

          <Text style={styles.introText}>
            Chaque moment de visite est une porte spirituelle où Dieu peut visiter et repositionner votre vie.
          </Text>

          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {visitationTimes.map((item) => (
              <Pressable 
                key={item.key} 
                style={({pressed}) => [styles.itemContainer, pressed && {opacity: 0.8}]} 
                onPress={() => openModal(item)}
              >
                <View style={styles.itemLeft}>
                  <Text style={styles.emoji}>{item.emoji}</Text>
                  <View>
                    <Text style={styles.itemTitle}>{i18n.t(`visitations.${item.key}`)}</Text>
                    <Text style={styles.itemTime}>{item.time}</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color={colors.textTertiary} />
              </Pressable>
            ))}
          </ScrollView>

          <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
            <SafeAreaView style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
                  
                  <Text style={styles.modalTitle}>{`${selectedVisitation?.emoji} ${i18n.t(`visitations.${selectedVisitation?.key}`)}`}</Text>
                  <Text style={styles.modalDescription}>{selectedVisitation?.details.description}</Text>
                  
                  <View style={styles.instructionContainer}>
                    <Text style={styles.modalInstruction}>
                      <Text style={{fontFamily: 'Brand_Body_Bold', color: colors.accentWarm}}>Instruction : </Text>
                      {selectedVisitation?.details.instruction}
                    </Text>
                  </View>

                  <Text style={styles.modalVerse}>{selectedVisitation?.details.verse}</Text>

                  <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeButtonText}>Fermer</Text>
                  </Pressable>

                </ScrollView>
              </View>
            </SafeAreaView>
          </Modal>

        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, paddingTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 24 },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontFamily: 'Brand_Heading', fontSize: 20, color: colors.text },
  introText: { fontFamily: 'Brand_Body', fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 30, marginBottom: 30 },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  
  itemContainer: {
    backgroundColor: colors.surfaceBase,
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  emoji: { fontSize: 22 },
  itemTitle: { fontFamily: 'Brand_Heading', color: colors.text, fontSize: 18, marginBottom: 4 },
  itemTime: { fontFamily: 'Brand_Body_Bold', color: colors.accent, fontSize: 13, letterSpacing: 1 },
  
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.backdrop, padding: 20 },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: isDark ? colors.surface : colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { fontFamily: 'Brand_Heading', fontSize: 26, color: colors.text, marginBottom: 20, textAlign: 'center' },
  modalDescription: { fontFamily: 'Brand_Body', fontSize: 15, color: isDark ? '#E3E3E3' : colors.text, lineHeight: 26, marginBottom: 20 },
  
  instructionContainer: {
    backgroundColor: isDark ? 'rgba(240, 176, 48, 0.08)' : 'rgba(240, 168, 104, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  modalInstruction: { fontFamily: 'Brand_Italic', fontSize: 15, color: colors.text, lineHeight: 24 },
  modalVerse: { fontFamily: 'Brand_Heading', fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 30, fontStyle: 'italic', lineHeight: 26 },
  
  closeButton: { backgroundColor: colors.ctaFill, paddingVertical: 14, borderRadius: 24, alignItems: 'center' },
  closeButtonText: { fontFamily: 'Brand_Body_Bold', color: colors.ctaText, fontSize: 15 },
});