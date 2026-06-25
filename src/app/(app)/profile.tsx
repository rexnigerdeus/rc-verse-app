import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useTheme } from '../../providers/ThemeProvider';
import { useStreak } from '../../hooks/useStreak';
import { FlameIcon } from '../../components/FlameIcon';
import { StreakModal } from '../../components/StreakModal';
import { BadgeIcon } from '../../components/BadgeIcon';
import { getMilestoneStatus, getDaysToNextMilestone, getCurrentMilestone, getNextMilestone } from '../../types/badges';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();

  const { colors, isDark, setTheme } = useTheme();
  const styles = createStyles(colors, isDark);
  const streak = useStreak();
  const [streakVisible, setStreakVisible] = useState(false);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [sending, setSending] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  
  const [quizStats, setQuizStats] = useState({ totalPlayed: 0, averageScore: 0 });

  const metadata = session?.user?.user_metadata;
  const rawName = metadata?.first_name || metadata?.name || session?.user?.email?.split('@')[0] || "Utilisateur";
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const userEmail = session?.user?.email;

  // --- HELPER D'ALERTE MULTIPLATEFORME ---
  const showAlert = (title: string, message: string) => {
      if (Platform.OS === 'web') {
          window.alert(`${title} : ${message}`);
      } else {
          Alert.alert(title, message);
      }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user?.id) return;
      
      const { data: adminData } = await supabase.from('app_admins').select('user_id').eq('user_id', session.user.id).single();
      if (adminData) setIsAdmin(true); 

      const { data: quizData } = await supabase.from('quiz_history').select('score').eq('user_id', session.user.id);
      if (quizData && quizData.length > 0) {
        const total = quizData.length;
        const sum = quizData.reduce((acc, curr) => acc + curr.score, 0);
        setQuizStats({ totalPlayed: total, averageScore: Math.round((sum / total) * 10) / 10 });
      }
    };
    fetchUserData();
  }, [session]);

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const handleSendSuggestion = async () => {
    if (!suggestion.trim()) {
        showAlert("Erreur", "Veuillez écrire une suggestion avant d'envoyer.");
        return;
    }
    setSending(true);
    const { error } = await supabase.from('suggestions').insert({ user_id: session?.user.id, content: suggestion, email: userEmail });
    setSending(false);
    if (!error) {
      setSuggestion('');
      showAlert("Merci !", "Votre suggestion a été bien reçue. Nous la lirons avec attention.");
    } else {
      showAlert("Erreur", "Impossible d'envoyer votre suggestion.");
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
        showAlert("Erreur", "Le mot de passe doit contenir au moins 6 caractères.");
        return;
    }
    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setUpdatingPassword(false);
    
    if (error) {
        showAlert("Erreur", error.message);
    } else {
        setNewPassword(''); // On vide le champ
        showAlert("Succès", "Votre mot de passe a été mis à jour avec succès !");
    }
  };

  const confirmDeletion = () => {
      if (Platform.OS === 'web') {
          const confirmed = window.confirm("Supprimer le compte : Êtes-vous absolument sûr ? Cette action est irréversible.");
          if (confirmed) executeDeletion();
      } else {
          Alert.alert("Supprimer le compte", "Êtes-vous absolument sûr ? Cette action est irréversible.", [
              { text: "Annuler", style: "cancel" },
              { text: "Supprimer", style: 'destructive', onPress: executeDeletion }
          ]);
      }
  };

  const executeDeletion = async () => {
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      await signOut();
      router.replace('/(auth)/login'); 
    } catch (error: any) {
      showAlert("Erreur", "Impossible de supprimer le compte.");
    }
  };

  return (
    <ScreenWrapper style={{ backgroundColor: colors.primary }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Mon Profil</Text>
            {isAdmin ? (
              <Pressable onPress={() => router.push('/(app)/admin_dashboard')} style={styles.adminButton}>
                  <Feather name="shield" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : <View style={{width: 40}} />}
          </View>

          <View style={styles.userInfo}>
            <View style={styles.avatarLarge}>
              <Feather name="user" size={28} color={colors.text} />
            </View>
            <Text style={styles.nameText}>{displayName}</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{quizStats.totalPlayed}</Text>
              <Text style={styles.statLabel}>Défis relevés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{quizStats.averageScore}/3</Text>
              <Text style={styles.statLabel}>Score moyen</Text>
            </View>
          </View>

          {/* --- CARTE FLAMME / STREAK --- */}
          <Pressable
            onPress={() => setStreakVisible(true)}
            style={[
              styles.streakCard,
              {
                backgroundColor: streak.isAliveToday
                  ? isDark
                    ? 'rgba(240, 176, 48, 0.10)'
                    : 'rgba(240, 168, 104, 0.12)'
                  : colors.surfaceBase,
                borderColor: streak.isAliveToday
                  ? isDark
                    ? 'rgba(240, 176, 48, 0.35)'
                    : 'rgba(240, 168, 104, 0.4)'
                  : colors.border,
              },
            ]}
          >
            <FlameIcon
              size={48}
              active={streak.isAliveToday}
              intensity={streak.count >= 14 ? 'high' : streak.count >= 3 ? 'mid' : 'low'}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.streakCount}>
                {streak.count} {streak.count > 1 ? 'jours' : 'jour'}
              </Text>
              <Text style={styles.streakSubtitle}>
                {streak.isAliveToday
                  ? 'Ta flamme brûle aujourd\'hui 🔥'
                  : streak.count === 0
                  ? 'Allume ta première flamme'
                  : 'Rallume ta flamme aujourd\'hui'}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textTertiary} />
          </Pressable>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mes paliers 🔥</Text>
            <Text style={styles.badgesHint}>
              {(() => {
                const next = getNextMilestone(streak.count);
                if (!next) return 'Tu as débloqué tous les paliers. Tu es une légende 🌈';
                const remaining = getDaysToNextMilestone(streak.count);
                return `Plus que ${remaining} jour${remaining > 1 ? 's' : ''} avant le prochain palier (${next.symbol} ${next.days}j)`;
              })()}
            </Text>
            <View style={styles.badgesGrid}>
              {getMilestoneStatus(streak.count).map((m) => (
                <View key={m.id} style={styles.badgeCell}>
                  <BadgeIcon milestone={m} size={56} reached={m.reached} pulse={m.reached && m.id === getCurrentMilestone(streak.count)?.id} />
                  <Text style={[styles.badgeDays, { color: m.reached ? colors.text : colors.textTertiary }]}>
                    {m.days}j
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Apparence</Text>
            <View style={styles.themeToggleRow}>
              <View style={styles.themeToggleLabel}>
                <Feather name={isDark ? "moon" : "sun"} size={18} color={colors.text} />
                <Text style={styles.themeText}>Mode Sombre</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(val) => setTheme(val ? 'dark' : 'light')}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.primary}
                ios_backgroundColor={colors.border}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sécurité</Text>
            
            <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Nouveau mot de passe"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Feather name={showPassword ? "eye-off" : "eye"} size={20} color={colors.textSecondary} />
                </Pressable>
            </View>

            <Pressable style={[styles.sendButton, updatingPassword && styles.buttonDisabled]} onPress={handleUpdatePassword} disabled={updatingPassword}>
              {updatingPassword ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.sendButtonText}>Changer mon mot de passe</Text>}
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Une idée pour l'application ?</Text>
            <TextInput
              style={styles.inputArea}
              placeholder="Écrivez votre suggestion ici..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              value={suggestion}
              onChangeText={setSuggestion}
            />
            <Pressable style={[styles.sendButton, sending && styles.buttonDisabled]} onPress={handleSendSuggestion} disabled={sending}>
              {sending ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.sendButtonText}>Envoyer ma suggestion</Text>}
            </Pressable>
          </View>

          <View style={styles.actionsContainer}>
              <Pressable style={styles.actionButton} onPress={() => router.push('/contact')}>
                  <Feather name="mail" size={16} color={colors.text} />
                  <Text style={styles.actionText}>Nous contacter</Text>
              </Pressable>

              <Pressable style={styles.actionButton} onPress={handleLogout}>
                  <Feather name="log-out" size={16} color={colors.text} style={{transform: [{rotate: '180deg'}]}} />
                  <Text style={styles.actionText}>Se déconnecter</Text>
              </Pressable>

              <Pressable style={styles.actionButton} onPress={confirmDeletion}>
                  <Feather name="trash-2" size={16} color={colors.error} />
                  <Text style={[styles.actionText, {color: colors.error}]}>Supprimer le compte</Text>
              </Pressable>
          </View>

        </ScrollView>
        <StreakModal visible={streakVisible} onClose={() => setStreakVisible(false)} />
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  scrollContent: { padding: 24, paddingBottom: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 30 },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontFamily: 'Brand_Heading', fontSize: 20, color: colors.text },
  adminButton: { padding: 8, backgroundColor: colors.surfaceBase, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  
  userInfo: { alignItems: 'center', marginBottom: 32 },
  avatarLarge: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: colors.surfaceBase, 
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, borderWidth: 1, borderColor: colors.border
  },
  nameText: { fontFamily: 'Brand_Heading', fontSize: 24, color: colors.text },

  statsContainer: { flexDirection: 'row', backgroundColor: colors.surfaceBase, borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: 16 },
  statValue: { fontFamily: 'Brand_Heading', fontSize: 28, color: colors.accentWarm, marginBottom: 4 },
  statLabel: { fontFamily: 'Brand_Body_Bold', fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },

  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
  },
  streakCount: {
    fontFamily: 'Brand_Heading',
    fontSize: 18,
    color: colors.text,
    letterSpacing: -0.3,
  },
  streakSubtitle: {
    fontFamily: 'Brand_Body',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  badgesHint: {
    fontFamily: 'Brand_Body',
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  badgeCell: {
    alignItems: 'center',
    width: '22%',
  },
  badgeDays: {
    fontFamily: 'Brand_Body_Bold',
    fontSize: 11,
    marginTop: 6,
    letterSpacing: 0.3,
  },

  section: { backgroundColor: colors.surfaceBase, padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontFamily: 'Brand_Body_Bold', fontSize: 16, color: colors.text, marginBottom: 16 },
  
  themeToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  themeToggleLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  themeText: { fontFamily: 'Brand_Body', fontSize: 15, color: colors.text },

  passwordContainer: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.primary, 
      borderRadius: 12, borderWidth: 1, borderColor: colors.border,
      marginBottom: 16,
  },
  passwordInput: { flex: 1, padding: 14, color: colors.text, fontFamily: 'Brand_Body' },
  eyeIcon: { padding: 15 },

  inputArea: {
    backgroundColor: colors.primary, borderRadius: 12, padding: 14,
    color: colors.text, fontFamily: 'Brand_Body',
    minHeight: 100, textAlignVertical: 'top', marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  
  sendButton: { backgroundColor: colors.text, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  sendButtonText: { fontFamily: 'Brand_Body_Bold', color: colors.primary, fontSize: 14 },

  actionsContainer: { marginTop: 16, gap: 12 },
  actionButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    padding: 16, backgroundColor: colors.surfaceBase, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  actionText: { fontFamily: 'Brand_Body_Bold', color: colors.text, fontSize: 14 },
});