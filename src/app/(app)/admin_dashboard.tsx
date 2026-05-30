import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Linking, ActivityIndicator, ScrollView, Platform, RefreshControl, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../providers/ThemeProvider';
import { ScreenWrapper } from "../../components/ScreenWrapper";

// Typage strict pour éviter les crashs
type AdminStats = {
  total_users: number;
  active_today: number;
  total_prayers: number;
  total_meditations: number;
  users: {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string;
    display_name: string; 
  }[];
};

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'requests'>('overview');
  
  // Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [requests, setRequests] = useState<any[]>([]); 
  const [requestFilter, setRequestFilter] = useState<'suggestions' | 'prayers'>('suggestions');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Récupération des couleurs dynamiques
  const { colors } = useTheme();
  // 2. Génération des styles
  const styles = createStyles(colors);

  // --- FETCH DATA ---
  const fetchAllData = async () => {
    try {
      const { data: statsData, error: statsError } = await supabase.rpc('get_admin_stats');
      if (statsError) throw statsError;
      setStats(statsData as AdminStats);

      const tableName = requestFilter === 'suggestions' ? 'suggestions' : 'prayer_requests';
      const { data: reqData, error: reqError } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!reqError) setRequests(reqData || []);

    } catch (error) {
      console.error("Erreur Dashboard Admin:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAllData();
  }, [requestFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  // --- RENDERERS ---
  const renderOverview = () => {
    if (!stats) return null;
    
    const engagementRate = stats.total_users > 0 
        ? Math.round((stats.active_today / stats.total_users) * 100) 
        : 0;

    return (
        <ScrollView 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.gridContainer}>
                <View style={styles.statCard}>
                    <Feather name="users" size={24} color={colors.accent} />
                    <Text style={styles.statNumber}>{stats.total_users}</Text>
                    <Text style={styles.statLabel}>Inscrits</Text>
                </View>
                <View style={styles.statCard}>
                    <Feather name="activity" size={24} color={colors.accent} />
                    <Text style={styles.statNumber}>{stats.active_today}</Text>
                    <Text style={styles.statLabel}>Actifs (24h)</Text>
                </View>
                <View style={styles.statCard}>
                    <Feather name="heart" size={24} color={colors.accent} />
                    <Text style={styles.statNumber}>{stats.total_prayers}</Text>
                    <Text style={styles.statLabel}>Prières/Sugg.</Text>
                </View>
                <View style={styles.statCard}>
                    <Feather name="play-circle" size={24} color={colors.accent} />
                    <Text style={styles.statNumber}>{stats.total_meditations}</Text>
                    <Text style={styles.statLabel}>Méditations</Text>
                </View>
            </View>

            <View style={styles.insightSection}>
                <Text style={styles.sectionTitle}>Insights & Santé de l'app</Text>
                <View style={styles.insightRow}>
                    <Feather name="trending-up" size={20} color={colors.accent} style={{marginRight: 10}} />
                    <Text style={styles.insightText}>
                        <Text style={{fontFamily:'Brand_Body_Bold', color: colors.text}}>{engagementRate}% </Text> 
                        de vos utilisateurs se sont connectés aujourd'hui.
                        {engagementRate > 20 ? " C'est une excellente rétention !" : " Pensez à envoyer une notification push pour les réengager."}
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
  };

  const renderUsers = () => (
    <View style={{flex: 1}}>
        <View style={styles.listHeaderContainer}>
            <Text style={styles.listHeaderTitle}>Dernières connexions</Text>
        </View>

        <FlatList
            data={stats?.users || []}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent}/>}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 40}}
            renderItem={({ item }) => {
                const isOnline = new Date(item.last_sign_in_at) > new Date(Date.now() - 86400000); // Actif < 24h
                return (
                    <View style={styles.userRow}>
                        <View style={styles.userIcon}>
                            <Text style={{ fontFamily: 'Brand_Body_Bold', color: colors.primary }}>
                                {item.display_name?.charAt(0).toUpperCase() || "U"}
                            </Text>
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.userName}>{item.display_name}</Text>
                            <Text style={styles.userEmail}>{item.email}</Text>
                        </View>
                        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#A5D6A7' : 'rgba(255,255,255,0.1)' }]} />
                    </View>
                )
            }}
        />
    </View>
  );

  const renderRequests = () => (
    <View style={{flex: 1}}>
        <View style={styles.subTabs}>
            <Pressable onPress={() => setRequestFilter('suggestions')} style={[styles.subTab, requestFilter === 'suggestions' && styles.subTabActive]}>
                <Text style={[styles.subTabText, requestFilter === 'suggestions' && styles.subTabTextActive]}>Suggestions</Text>
            </Pressable>
            <Pressable onPress={() => setRequestFilter('prayers')} style={[styles.subTab, requestFilter === 'prayers' && styles.subTabActive]}>
                <Text style={[styles.subTabText, requestFilter === 'prayers' && styles.subTabTextActive]}>Prières</Text>
            </Pressable>
        </View>

        <FlatList
            data={requests}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{paddingBottom: 40}}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent}/>}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.emptyText}>La boîte de réception est vide.</Text>}
            renderItem={({ item }) => {
                const content = item.content || item.request_text || "Message vide";
                return (
                    <View style={styles.card}>
                            <View style={styles.cardHeader}>
                            <Text style={styles.cardEmail}>{item.email || "Utilisateur anonyme"}</Text>
                            {item.email && (
                                <Pressable onPress={() => Linking.openURL(`mailto:${item.email}`)}>
                                    <View style={styles.actionButton}>
                                        <Feather name="mail" size={14} color={colors.primary} />
                                        <Text style={styles.actionButtonText}>Répondre</Text>
                                    </View>
                                </Pressable>
                            )}
                        </View>
                        <Text style={styles.cardContent}>{content}</Text>
                        <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long'})}</Text>
                    </View>
                );
            }}
        />
    </View>
  );

  return (
    <ScreenWrapper>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={colors.text} />
                </Pressable>
                <Text style={styles.title}>RC Studio</Text>
                <View style={{width: 24}} /> 
            </View>

            <View style={styles.tabs}>
                <Pressable style={[styles.tab, activeTab === 'overview' && styles.activeTab]} onPress={() => setActiveTab('overview')}>
                    <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Stats</Text>
                </Pressable>
                <Pressable style={[styles.tab, activeTab === 'users' && styles.activeTab]} onPress={() => setActiveTab('users')}>
                    <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Audience</Text>
                </Pressable>
                <Pressable style={[styles.tab, activeTab === 'requests' && styles.activeTab]} onPress={() => setActiveTab('requests')}>
                    <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Inbox</Text>
                </Pressable>
            </View>

            <View style={styles.content}>
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color={colors.accent} style={{marginTop: 50}} />
                ) : (
                    <>
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'users' && renderUsers()}
                        {activeTab === 'requests' && renderRequests()}
                    </>
                )}
            </View>
            
        </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

// Fonction pour injecter les couleurs dans les styles
const createStyles = (colors: any) => StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 20, marginBottom: 20 },
  backButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },
  title: { fontFamily: 'Brand_Heading', fontSize: 20, color: colors.text },
  
  tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  tab: { marginRight: 24, paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { fontFamily: 'Brand_Body', color: 'rgba(255,255,255,0.4)', fontSize: 15 },
  activeTabText: { color: colors.text, fontFamily: 'Brand_Body_Bold' },

  content: { flex: 1, paddingHorizontal: 20 },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  statCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 4, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statNumber: { fontFamily: 'Brand_Heading', fontSize: 32, color: colors.text, marginVertical: 8 },
  statLabel: { fontFamily: 'Brand_Body', fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  
  insightSection: { marginTop: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  sectionTitle: { fontFamily: 'Brand_Body_Bold', color: colors.accent, marginBottom: 12, textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start' },
  insightText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 22, flex: 1, fontFamily: 'Brand_Body' },

  listHeaderContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, paddingHorizontal: 4 },
  listHeaderTitle: { fontFamily: 'Brand_Body_Bold', color: colors.text, fontSize: 16 },
  
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
  userIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  userName: { color: colors.text, fontFamily: 'Brand_Body_Bold', fontSize: 16, marginBottom: 2 },
  userEmail: { color: 'rgba(255,255,255,0.4)', fontFamily: 'Brand_Body', fontSize: 13 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 10 },

  subTabs: { flexDirection: 'row', marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 4 },
  subTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  subTabActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  subTabText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Brand_Body' },
  subTabTextActive: { color: colors.text, fontFamily: 'Brand_Body_Bold' },

  card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardEmail: { color: colors.text, fontFamily: 'Brand_Body_Bold', fontSize: 15 },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
  actionButtonText: { color: colors.primary, fontFamily: 'Brand_Body_Bold', fontSize: 12 },
  cardContent: { color: 'rgba(255,255,255,0.7)', marginBottom: 16, lineHeight: 22, fontFamily: 'Brand_Body', fontSize: 15 },
  cardDate: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'Brand_Body' },
  emptyText: { textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 40, fontFamily: 'Brand_Body' },
});