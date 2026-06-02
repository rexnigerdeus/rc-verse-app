import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Linking } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../providers/ThemeProvider';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

// Numéro de l'administration pour le reset du mot de passe
const ADMIN_WHATSAPP = "+2250778554483";

export default function LoginScreen() {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);

    // Helper d'Alerte compatible multiplateforme
    const showInteractiveAlert = (title: string, message: string, onConfirm?: () => void) => {
        if (Platform.OS === 'web') {
            const userAgreed = window.confirm(`${title}\n\n${message}`);
            if (userAgreed && onConfirm) onConfirm();
        } else {
            if (onConfirm) {
                Alert.alert(title, message, [
                    { text: "Annuler", style: "cancel" },
                    { text: "Contacter l'Admin", onPress: onConfirm }
                ]);
            } else {
                Alert.alert(title, message);
            }
        }
    };

    const handleSignIn = async () => {
        if (!phone || !password) {
            showInteractiveAlert('Erreur', 'Veuillez entrer votre numéro et mot de passe.');
            return;
        }

        const cleanPhone = phone.replace(/\s/g, '').replace(/-/g, '');
        const pseudoEmail = `${cleanPhone}@revival.culture`;

        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: pseudoEmail,
                password: password,
            });

            if (error) {
                showInteractiveAlert('Erreur de connexion', 'Numéro ou mot de passe incorrect.');
            }
        } catch (err: any) {
            showInteractiveAlert('Erreur', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = () => {
        if (!phone || phone.trim() === '') {
            showInteractiveAlert(
                "Action requise", 
                "Veuillez d'abord saisir votre numéro de téléphone dans le champ prévu à cet effet avant de demander une réinitialisation."
            );
            return;
        }

        showInteractiveAlert(
            "Mot de passe oublié",
            `Voulez-vous contacter l'administration via WhatsApp pour réinitialiser le compte lié au ${phone} ?`,
            () => {
                const messageText = encodeURIComponent(`Bonjour l'équipe Revival Culture,\nJe souhaite réinitialiser le mot de passe de mon compte lié au numéro : ${phone}.`);
                const url = `https://wa.me/${ADMIN_WHATSAPP.replace(/\+| /g, '')}?text=${messageText}`;
                
                Linking.canOpenURL(url).then(supported => {
                    if (supported) {
                        Linking.openURL(url);
                    } else {
                        showInteractiveAlert("Erreur", "L'application WhatsApp n'est pas installée sur cet appareil.");
                    }
                });
            }
        );
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
                        <Text style={styles.header}>Connexion</Text>
                        
                        <Text style={styles.label}>Numéro de téléphone</Text>
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

                        <Pressable onPress={handleForgotPassword} style={styles.forgotPassword}>
                            <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
                        </Pressable>

                        <Pressable 
                            onPress={handleSignIn} 
                            style={({pressed}) => [styles.button, pressed && {opacity: 0.8}]}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={isDark ? colors.primary : '#FFFFFF'} />
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
        padding: 32, 
        borderRadius: 24, 
        borderWidth: 1, 
        borderColor: colors.border,
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
        marginBottom: 12, // Espace avant le texte "mot de passe oublié"
    },
    passwordInput: { flex: 1, paddingHorizontal: 20, paddingVertical: 18, color: colors.text, fontFamily: 'Brand_Body' },
    eyeIcon: { padding: 15 },
    forgotPassword: { alignSelf: 'flex-end', marginBottom: 24, paddingVertical: 5 },
    forgotPasswordText: { color: colors.accent, fontFamily: 'Brand_Body_Bold', fontSize: 13 },
    button: { backgroundColor: colors.accent, paddingVertical: 18, borderRadius: 24, alignItems: 'center' },
    buttonText: { fontFamily: 'Brand_Body_Bold', color: isDark ? colors.primary : '#FFFFFF', fontSize: 15 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
    footerText: { color: colors.textSecondary, fontFamily: 'Brand_Body', fontSize: 14 },
    linkText: { color: colors.text, fontFamily: 'Brand_Body_Bold', fontSize: 14 },
});