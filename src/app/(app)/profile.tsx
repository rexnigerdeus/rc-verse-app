import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { ScreenWrapper } from '../../components/ScreenWrapper';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  
  // State
  const [isAdmin, setIsAdmin] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [sending, setSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // New state for deletion loader

  // User Info Logic
  const metadata = session?.user?.user_metadata;
  const rawName = metadata?.first_name || metadata?.name || session?.user?.email?.split('@')[0] || "Utilisateur";
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const userEmail = session?.user?.email;

  // --- 1. ADMIN CHECK ---
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from('app_admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .single();

      if (data && !error) {
        setIsAdmin(true); 
      }
    };
    checkAdminStatus();
  }, [session]);

  // --- 2. ACTIONS ---
  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const handleSendSuggestion = async () => {
    if (!suggestion.trim()) {
      Alert.alert("Champ vide", "Veuillez écrire une suggestion avant d'envoyer.");
      return;
    }
    setSending(true);

    const { error } = await supabase.from('suggestions').insert({
      user_id: session?.user.id,
      content: suggestion,
      email: userEmail 
    });

    setSending(false);

    if (error) {
      Alert.alert("Erreur", "Impossible d'envoyer la suggestion. Veuillez réessayer.");
      console.error(error);
    } else {
      setSuggestion('');
      Alert.alert("Merci !", "Votre suggestion a été bien reçue.");
    }
  };

  // --- 3. DELETE ACCOUNT LOGIC ---
  const executeDeletion = async () => {
    setIsDeleting(true);
    try {
      // 1. Appel sécurisé à Supabase
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;

      // 2. Déconnexion locale
      await signOut();
      router.replace('/(auth)/login'); 
      
    } catch (error: any) {
      console.error("Erreur de suppression:", error);
      if (Platform.OS === 'web') {
          window.alert("Impossible de supprimer le compte. Réessayez plus tard.");
      } else {
          Alert.alert("Erreur", "Impossible de supprimer le compte. Assurez-vous d'être connecté à internet.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    const warningMessage = "Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Toutes vos données seront effacées. Cette action est irréversible.";

    // Sécurité pour tester sur ordinateur (Web)
    if (Platform.OS === 'web') {
        const confirmed = window.confirm(warningMessage);
        if (confirmed) {
            executeDeletion();
        }
        return;
    }

    // Alerte native pour iOS (App Store) et Android
    Alert.alert(
      "Supprimer le compte",
      warningMessage,
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Supprimer",
          style: "destructive", // Le texte sera rouge sur iOS
          onPress: executeDeletion
        }
      ]
    );
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }} // Plus besoin de remettre la couleur de fond ou les insets ici !
      >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={Colors.text} />
          </Pressable>
          
          <Text style={styles.headerTitle}>Mon Profil</Text>
          
          {isAdmin ? (
            <Pressable 
                onPress={() => router.push('/(app)/admin_dashboard')} 
                style={styles.adminButton}
            >
                <Feather name="shield" size={20} color={Colors.accent} />
            </Pressable>
          ) : (
            <View style={{width: 24}} /> 
          )}
        </View>

        {/* USER INFO */}
        <View style={styles.userInfo}>
          <View style={styles.avatarLarge}>
            <Feather name="user" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.nameText}>{displayName}</Text>
        </View>

        {/* SUGGESTION BOX */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Une idée pour l'application ?</Text>
          <Text style={styles.sectionSubtitle}>Vos retours nous aident à grandir.</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Écrivez votre suggestion ici..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
            numberOfLines={4}
            value={suggestion}
            onChangeText={setSuggestion}
          />
          
          <Pressable 
            style={[styles.sendButton, sending && styles.buttonDisabled]} 
            onPress={handleSendSuggestion}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Text style={styles.sendButtonText}>Envoyer ma suggestion</Text>
            )}
          </Pressable>
        </View>

        {/* ACCOUNT ACTIONS */}
        <View style={styles.actionsContainer}>
            {/* LOGOUT */}
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <Feather name="log-out" size={20} color={Colors.text} />
                <Text style={styles.logoutText}>Se déconnecter</Text>
            </Pressable>

            {/* DELETE ACCOUNT */}
            <Pressable 
                style={[styles.deleteButton, isDeleting && styles.buttonDisabled]} 
                onPress={handleDeleteAccount}
                disabled={isDeleting}
            >
                {isDeleting ? (
                     <ActivityIndicator color="#EF5350" />
                ) : (
                    <Text style={styles.deleteText}>Supprimer le compte</Text>
                )}
            </Pressable>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  scrollContent: { padding: 20, paddingBottom: 50 },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  backButton: { padding: 8 },
  headerTitle: { fontFamily: 'Brand_Heading', fontSize: 20, color: Colors.text },
  
  adminButton: { 
    padding: 8, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.accent
  },
  
  userInfo: { alignItems: 'center', marginBottom: 40 },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  nameText: { 
    fontFamily: 'Brand_Heading', 
    fontSize: 24, 
    color: Colors.text,
    letterSpacing: 0.5
  },

  section: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
  },
  sectionTitle: { fontFamily: 'Brand_Body_Bold', fontSize: 18, color: Colors.text, marginBottom: 8 },
  sectionSubtitle: { fontFamily: 'Brand_Body', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 16 },
  
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 15,
    color: Colors.text,
    fontFamily: 'Brand_Body',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  
  sendButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center'
  },
  buttonDisabled: { opacity: 0.7 },
  sendButtonText: { fontFamily: 'Brand_Body_Bold', color: Colors.primary, fontSize: 16 },

  actionsContainer: {
      gap: 16,
      marginTop: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  logoutText: { fontFamily: 'Brand_Body_Bold', color: Colors.text, fontSize: 16 },
  
  deleteButton: {
    paddingVertical: 10, // Keep some vertical space for tapping
    alignItems: 'center', // Center the text
  },
  deleteText: { 
    fontFamily: 'Brand_Body', 
    color: '#EF5350', 
    fontSize: 14 
  }, // Matching red text
});