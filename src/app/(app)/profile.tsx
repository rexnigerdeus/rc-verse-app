import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  
  // State
  const [isAdmin, setIsAdmin] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [sending, setSending] = useState(false);

  // User Info Logic
  const metadata = session?.user?.user_metadata;
  // Fallback: If no name in metadata, capitalize the part before '@' in email
  const rawName = metadata?.first_name || metadata?.name || session?.user?.email?.split('@')[0] || "Utilisateur";
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const userEmail = session?.user?.email;

  // --- 1. ADMIN CHECK ---
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!session?.user?.id) return;

      // Check if user ID exists in the 'app_admins' table
      const { data, error } = await supabase
        .from('app_admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .single();

      if (data && !error) {
        setIsAdmin(true); // Show the shield icon
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

    // Insert into 'suggestions' table
    const { error } = await supabase.from('suggestions').insert({
      user_id: session?.user.id,
      content: suggestion,
      email: userEmail // Useful for admin follow-up
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

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={Colors.text} />
          </Pressable>
          
          <Text style={styles.headerTitle}>Mon Profil</Text>
          
          {/* Admin Shield (Visible only if isAdmin is true) */}
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
          {/* Email is hidden visually but available in logic */}
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

        {/* LOGOUT */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#ff6b6b" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
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
  
  // Admin Button Style
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

  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107, 0.3)',
    borderRadius: 12,
  },
  logoutText: { fontFamily: 'Brand_Body_Bold', color: '#ff6b6b', fontSize: 16 },
});