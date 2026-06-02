import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert, Image } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../providers/ThemeProvider';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function SignUpScreen() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}: ${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleSignUp = async () => {
        if (!name || !phone || !password) {
            showAlert('Erreur', 'Veuillez remplir tous les champs.');
            return;
        }

        const cleanPhone = phone.replace(/\s/g, '').replace(/-/g, '');
        const pseudoEmail = `${cleanPhone}@revival.culture`;

        setLoading(true);
        
        try {
            const { data, error } = await supabase.auth.signUp({
                email: pseudoEmail,
                password: password,
                options: {
                    data: {
                        first_name: name,
                        phone_number: cleanPhone,
                    },
                },
            });

            if (error) {
                showAlert('Erreur', error.message);
            } else {
                showAlert('Succès', 'Compte créé avec succès !');
            }
        } catch (err: any) {
            showAlert('Erreur', err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1508614999368-9260051292e5?q=80&w=1000&auto=format&fit=crop' }} 
                style={styles.backgroundImage}
                resizeMode="cover"
            />
            <View style={styles.backgroundOverlay} />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    <View style={styles.logoContainer}>
                        <Text style={styles.brandTitle}>REVIVAL CULTURE</Text>
                        <Text style={styles.brandSubtitle}>ABIDJAN</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <Text style={styles.header}>Créer un compte</Text>
                        
                        <Text style={styles.label}>Nom complet</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Jean Kouassi" 
                            placeholderTextColor={colors.textTertiary}
                            value={name}
                            onChangeText={setName}
                        />

                        <Text style={styles.label}>Numéro de téléphone (WhatsApp)</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="07 07 07 07 07" 
                            placeholderTextColor={colors.textTertiary}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.label}>Mot de passe</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput 
                                style={styles.passwordInput} 
                                placeholder="••••••" 
                                placeholderTextColor={colors.textTertiary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                <Feather name={showPassword ? "eye-off" : "eye"} size={20} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <Pressable 
                            onPress={handleSignUp} 
                            style={({pressed}) => [styles.button, pressed && {opacity: 0.8}]}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={isDark ? colors.primary : '#FFFFFF'} />
                            ) : (
                                <Text style={styles.buttonText}>S'inscrire</Text>
                            )}
                        </Pressable>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Déjà un compte ? </Text>
                            <Pressable onPress={() => router.replace('/login')}>
                                <Text style={styles.linkText}>Se connecter</Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.primary },
    backgroundImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: isDark ? 0.3 : 0.25 },
    backgroundOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.primary, opacity: 0.45 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
    logoContainer: { alignItems: 'center', marginBottom: 40 },
    brandTitle: { fontFamily: 'Brand_Heading', fontSize: 28, color: colors.text, letterSpacing: 2 },
    brandSubtitle: { fontFamily: 'Brand_Body_Bold', fontSize: 12, color: colors.accent, letterSpacing: 4, marginTop: 6 },
    formContainer: { 
        backgroundColor: colors.surfaceBase, 
        padding: 32, borderRadius: 24, 
        borderWidth: 1, borderColor: colors.border,
        shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5
    },
    header: { fontFamily: 'Brand_Heading', fontSize: 22, color: colors.text, textAlign: 'center', marginBottom: 30 },
    label: { fontFamily: 'Brand_Body_Bold', color: colors.textSecondary, marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : colors.primary, 
        borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, 
        color: colors.text, fontFamily: 'Brand_Body', marginBottom: 24, 
        borderWidth: 1, borderColor: colors.border 
    },
    passwordContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : colors.primary, 
        borderRadius: 16, borderWidth: 1, borderColor: colors.border,
        marginBottom: 24,
    },
    passwordInput: { flex: 1, paddingHorizontal: 20, paddingVertical: 18, color: colors.text, fontFamily: 'Brand_Body' },
    eyeIcon: { padding: 15 },
    button: { backgroundColor: colors.accent, paddingVertical: 18, borderRadius: 24, alignItems: 'center', marginTop: 10 },
    buttonText: { fontFamily: 'Brand_Body_Bold', color: isDark ? colors.primary : '#FFFFFF', fontSize: 15 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
    footerText: { color: colors.textSecondary, fontFamily: 'Brand_Body', fontSize: 14 },
    linkText: { color: colors.text, fontFamily: 'Brand_Body_Bold', fontSize: 14 },
});