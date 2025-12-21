import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Linking, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

// Types for our data
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
  }[];
};

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'requests'>('overview');
  
  // Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [requests, setRequests] = useState<any[]>([]); // For Prayers/Suggestions
  const [requestFilter, setRequestFilter] = useState<'suggestions' | 'prayers'>('suggestions');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- FETCH DATA ---
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats via our secure SQL function
      const { data: statsData, error: statsError } = await supabase.rpc('get_admin_stats');
      if (statsError) throw statsError;
      setStats(statsData as AdminStats);

      // 2. Fetch Requests (reusing previous logic)
      const tableName = requestFilter === 'suggestions' ? 'suggestions' : 'prayer_requests';
      const { data: reqData, error: reqError } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!reqError) setRequests(reqData || []);

    } catch (error) {
      console.error("Admin Load Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [requestFilter]); // Re-fetch when sub-filter changes

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  // --- RENDERERS ---

  const renderOverview = () => {
    if (!stats) return null;
    return (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            <View style={styles.gridContainer}>
                {/* Key Metrics Cards */}
                <View style={styles.statCard}>
                    <Feather name="users" size={24} color={Colors.accent} />
                    <Text style={styles.statNumber}>{stats.total_users}</Text>
                    <Text style={styles.statLabel}>Utilisateurs Total</Text>
                </View>
                <View style={styles.statCard}>
                    <Feather name="activity" size={24} color="#4cd964" />
                    <Text style={styles.statNumber}>{stats.active_today}</Text>
                    <Text style={styles.statLabel}>Actifs (24h)</Text>
                </View>
                <View style={styles.statCard}>
                    <Feather name="heart" size={24} color="#ff3b30" />
                    <Text style={styles.statNumber}>{stats.total_prayers}</Text>
                    <Text style={styles.statLabel}>Prières</Text>
                </View>
                <View style={styles.statCard}>
                    <Feather name="play-circle" size={24} color="#5ac8fa" />
                    <Text style={styles.statNumber}>{stats.total_meditations}</Text>
                    <Text style={styles.statLabel}>Méditations</Text>
                </View>
            </View>

            {/* Growth Insight Section */}
            <View style={styles.insightSection}>
                <Text style={styles.sectionTitle}>Insights</Text>
                <View style={styles.insightRow}>
                    <Text style={styles.insightText}>
                        Le taux d'engagement est de <Text style={{fontWeight:'bold', color: Colors.accent}}>
                        {Math.round((stats.active_today / (stats.total_users || 1)) * 100)}%
                        </Text> aujourd'hui.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
  };

  const renderUsers = () => {
    return (
        <View style={{flex: 1}}>
            {/* Total Count Header */}
            <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: 15,
                paddingHorizontal: 4 
            }}>
                <Text style={styles.listHeaderTitle}>Liste des Utilisateurs</Text>
                <View style={{ backgroundColor: Colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontFamily: 'Brand_Body_Bold', color: Colors.primary, fontSize: 12 }}>
                        Total: {stats?.total_users || 0}
                    </Text>
                </View>
            </View>

            <FlatList
                data={stats?.users || []}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{paddingBottom: 40}}
                renderItem={({ item }) => (
                    <View style={styles.userRow}>
                        <View style={styles.userIcon}>
                            <Text style={{ fontFamily: 'Brand_Body_Bold', color: Colors.primary }}>
                                {item.display_name?.charAt(0).toUpperCase() || "U"}
                            </Text>
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={{ color: Colors.text, fontFamily: 'Brand_Body_Bold', fontSize: 16 }}>
                                {item.display_name}
                            </Text>
                            <Text style={styles.userEmail}>{item.email}</Text>
                            <Text style={styles.userDate}>
                                Inscrit le {new Date(item.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                        {/* Active Indicator */}
                        <View style={[
                            styles.statusDot, 
                            { backgroundColor: new Date(item.last_sign_in_at) > new Date(Date.now() - 86400000) ? '#4cd964' : 'rgba(255,255,255,0.2)' }
                        ]} />
                    </View>
                )}
            />
        </View>
    );
  };

  const renderRequests = () => {
    return (
        <View style={{flex: 1}}>
            {/* Sub-Tabs for Requests */}
            <View style={styles.subTabs}>
                <Pressable 
                    onPress={() => setRequestFilter('suggestions')}
                    style={[styles.subTab, requestFilter === 'suggestions' && styles.subTabActive]}
                >
                    <Text style={[styles.subTabText, requestFilter === 'suggestions' && styles.subTabTextActive]}>Suggestions</Text>
                </Pressable>
                <Pressable 
                    onPress={() => setRequestFilter('prayers')}
                    style={[styles.subTab, requestFilter === 'prayers' && styles.subTabActive]}
                >
                    <Text style={[styles.subTabText, requestFilter === 'prayers' && styles.subTabTextActive]}>Prières</Text>
                </Pressable>
            </View>

            <FlatList
                data={requests}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{paddingBottom: 40}}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={<Text style={styles.emptyText}>Aucune donnée.</Text>}
                renderItem={({ item }) => {
                    const content = requestFilter === 'suggestions' ? item.content : item.request_text;
                    const isAnswered = requestFilter === 'prayers' && item.is_fulfilled;
                    return (
                        <View style={styles.card}>
                             <View style={styles.cardHeader}>
                                <Text style={styles.cardEmail}>{item.email || "Anonyme"}</Text>
                                {item.email && (
                                    <Pressable onPress={() => Linking.openURL(`mailto:${item.email}`)}>
                                        <Feather name="mail" size={16} color={Colors.accent} />
                                    </Pressable>
                                )}
                            </View>
                            <Text style={styles.cardContent}>{content}</Text>
                            <View style={styles.cardFooter}>
                                <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                                {isAnswered && <Text style={{color: '#4cd964', fontSize: 12}}>Exaucé</Text>}
                            </View>
                        </View>
                    );
                }}
            />
        </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>RC Administration</Text>
        <View style={{width: 24}} /> 
      </View>

      {/* MAIN TABS */}
      <View style={styles.tabs}>
        <Pressable style={[styles.tab, activeTab === 'overview' && styles.activeTab]} onPress={() => setActiveTab('overview')}>
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Vue d'ensemble</Text>
        </Pressable>
        <Pressable style={[styles.tab, activeTab === 'users' && styles.activeTab]} onPress={() => setActiveTab('users')}>
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Utilisateurs</Text>
        </Pressable>
        <Pressable style={[styles.tab, activeTab === 'requests' && styles.activeTab]} onPress={() => setActiveTab('requests')}>
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Requêtes</Text>
        </Pressable>
      </View>

      {/* CONTENT AREA */}
      <View style={styles.content}>
        {loading && !refreshing ? (
            <ActivityIndicator size="large" color={Colors.accent} style={{marginTop: 50}} />
        ) : (
            <>
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'users' && renderUsers()}
                {activeTab === 'requests' && renderRequests()}
            </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50, paddingHorizontal: 20, marginBottom: 20 },
  backButton: { padding: 8 },
  title: { fontFamily: 'Brand_Heading', fontSize: 20, color: Colors.text },
  
  // TABS
  tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  tab: { marginRight: 20, paddingVertical: 10 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: Colors.accent },
  tabText: { fontFamily: 'Brand_Body', color: 'rgba(255,255,255,0.5)', fontSize: 16 },
  activeTabText: { color: Colors.text, fontFamily: 'Brand_Body_Bold' },

  content: { flex: 1, paddingHorizontal: 20 },

  // OVERVIEW STYLES
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  statCard: { 
      width: '48%', 
      backgroundColor: 'rgba(255,255,255,0.05)', 
      borderRadius: 12, 
      padding: 20, 
      marginBottom: 10,
      alignItems: 'center' 
  },
  statNumber: { fontFamily: 'Brand_Heading', fontSize: 28, color: Colors.text, marginVertical: 8 },
  statLabel: { fontFamily: 'Brand_Body', fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  
  insightSection: { marginTop: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 20 },
  sectionTitle: { fontFamily: 'Brand_Body_Bold', color: Colors.text, marginBottom: 10 },
  insightRow: { flexDirection: 'row', alignItems: 'center' },
  insightText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 20 },

  // USERS STYLES
  listHeaderTitle: { fontFamily: 'Brand_Body_Bold', color: Colors.accent, marginBottom: 15 },
  userRow: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: 'rgba(255,255,255,0.05)', 
      padding: 12, 
      borderRadius: 10, 
      marginBottom: 10 
  },
  userIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userEmail: { color: Colors.text, fontFamily: 'Brand_Body_Bold', fontSize: 14 },
  userDate: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 10 },

  // REQUESTS SUB-TABS
  subTabs: { flexDirection: 'row', marginBottom: 15, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 2 },
  subTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  subTabActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  subTabText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  subTabTextActive: { color: Colors.text, fontWeight: 'bold' },

  // CARDS (Requests)
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardEmail: { color: Colors.accent, fontWeight: 'bold' },
  cardContent: { color: 'rgba(255,255,255,0.9)', marginBottom: 10, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardDate: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  emptyText: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: 20 },
});