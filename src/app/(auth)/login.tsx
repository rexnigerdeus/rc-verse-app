import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import { useRouter, Link } from 'expo-router';

export default function LoginScreen() {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignIn = async () => {
        if (!phone || !password) {
            Alert.alert('Erreur', 'Veuillez entrer votre numéro et mot de passe.');
            return;
        }

        // Clean phone number exactly like in Sign Up
        const cleanPhone = phone.replace(/\s/g, '').replace(/-/g, '');
        
        // Reconstruct the pseudo email
        const pseudoEmail = `${cleanPhone}@revival.culture`;

        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: pseudoEmail,
                password: password,
            });

            if (error) {
                Alert.alert('Erreur de connexion', 'Numéro ou mot de passe incorrect.');
            } else {
                // AuthProvider handles redirect
            }
        } catch (err: any) {
            Alert.alert('Erreur', err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.logoContainer}>
                    <Text style={styles.brandTitle}>REVIVAL CULTURE</Text>
                    <Text style={styles.brandSubtitle}>ABIDJAN</Text>
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.header}>Connexion</Text>
                    
                    <Text style={styles.label}>Numéro de téléphone</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="07 07 07 07 07" 
                        placeholderTextColor="rgba(244, 241, 234, 0.5)"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />

                    <Text style={styles.label}>Mot de passe</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="••••••" 
                        placeholderTextColor="rgba(244, 241, 234, 0.5)"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <Pressable 
                        onPress={handleSignIn} 
                        style={({pressed}) => [styles.button, pressed && {opacity: 0.8}]}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.text} />
                        ) : (
                            <Text style={styles.buttonText}>Se connecter</Text>
                        )}
                    </Pressable>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Déjà un compte ? </Text>
                        <Pressable onPress={() => router.replace('/sign-up')}>
                            <Text style={styles.linkText}>S'inscrire</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.primary },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    logoContainer: { alignItems: 'center', marginBottom: 50 },
    brandTitle: { fontFamily: 'Brand_Heading', fontSize: 32, color: Colors.text, letterSpacing: 2 },
    brandSubtitle: { fontFamily: 'Brand_Body', fontSize: 14, color: Colors.accent, letterSpacing: 4, marginTop: 5 },
    formContainer: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(244, 241, 234, 0.1)' },
    header: { fontFamily: 'Brand_Heading', fontSize: 24, color: Colors.text, textAlign: 'center', marginBottom: 25 },
    label: { fontFamily: 'Brand_Body_Bold', color: Colors.accent, marginBottom: 8, fontSize: 14 },
    input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 15, color: Colors.text, fontFamily: 'Brand_Body', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(244, 241, 234, 0.1)' },
    button: { backgroundColor: Colors.accent, padding: 18, borderRadius: 30, alignItems: 'center', marginTop: 10 },
    buttonText: { fontFamily: 'Brand_Body_Bold', color: Colors.text, fontSize: 16 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    footerText: { color: 'rgba(244, 241, 234, 0.6)', fontFamily: 'Brand_Body' },
    linkText: { color: Colors.highlight, fontFamily: 'Brand_Body_Bold' },
});