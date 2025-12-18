import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Linking, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../providers/AuthProvider';

export default function AdminDashboard() {
  const router = useRouter();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'suggestions' | 'prayers'>('suggestions');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const tableName = activeTab === 'suggestions' ? 'suggestions' : 'prayer_requests';
      
      const { data: results, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
          console.error("Admin Fetch Error:", error);
      } else {
          setData(results || []);
      }
      setLoading(false);
    };

    fetchData();
  }, [activeTab]);

  const handleContact = (email: string) => {
    if (email) Linking.openURL(`mailto:${email}`);
  };

  const metadata = session?.user?.user_metadata;
  const rawName = metadata?.first_name || metadata?.name || session?.user?.email?.split('@')[0] || "Utilisateur";
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const renderItem = ({ item }: { item: any }) => {
    // 1. Determine the text content based on the active tab
    // Suggestions use 'content', Prayers use 'request_text'
    const contentText = activeTab === 'suggestions' ? item.content : item.request_text;
    
    // 2. Determine status (if any)
    const isAnswered = activeTab === 'prayers' && item.is_fulfilled;

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{flex: 1}}>
                    <Text style={styles.cardEmail}>
                        {displayName}
                    </Text>
                    <Text style={styles.cardEmail}>
                        {item.email || "Utilisateur Anonyme"}
                    </Text>
                    <Text style={styles.cardDate}>
                        {new Date(item.created_at).toLocaleDateString()}
                        {isAnswered && <Text style={{color: Colors.highlight}}> • Exaucé</Text>}
                    </Text>
                </View>
                
                {item.email && (
                    <Pressable onPress={() => handleContact(item.email)} style={styles.contactBtn}>
                        <Feather name="mail" size={16} color={Colors.primary} />
                        <Text style={styles.contactText}>Répondre</Text>
                    </Pressable>
                )}
            </View>

            <Text style={styles.cardContent}>{contentText}</Text>
        </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Administration</Text>
        <View style={{width: 24}} /> 
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        <Pressable 
            style={[styles.tab, activeTab === 'suggestions' && styles.activeTab]} 
            onPress={() => setActiveTab('suggestions')}
        >
            <Text style={[styles.tabText, activeTab === 'suggestions' && styles.activeTabText]}>Suggestions</Text>
        </Pressable>
        <Pressable 
            style={[styles.tab, activeTab === 'prayers' && styles.activeTab]} 
            onPress={() => setActiveTab('prayers')}
        >
            <Text style={[styles.tabText, activeTab === 'prayers' && styles.activeTabText]}>Prières</Text>
        </Pressable>
      </View>

      {/* CONTENT */}
      {loading ? (
        <ActivityIndicator size="large" color={Colors.accent} style={{marginTop: 50}} />
      ) : (
        <FlatList
            data={data}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
                <Text style={styles.emptyText}>
                    {activeTab === 'suggestions' ? "Aucune suggestion." : "Aucune requête de prière."}
                </Text>
            }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50, paddingHorizontal: 20, marginBottom: 20 },
  backButton: { padding: 8 },
  title: { fontFamily: 'Brand_Heading', fontSize: 20, color: Colors.text },
  
  tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 },
  activeTab: { backgroundColor: Colors.accent },
  tabText: { fontFamily: 'Brand_Body_Bold', color: 'rgba(255,255,255,0.5)' },
  activeTabText: { color: Colors.primary },

  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardEmail: { fontFamily: 'Brand_Body_Bold', color: Colors.accent, fontSize: 16 },
  cardDate: { fontFamily: 'Brand_Body', color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  cardContent: { fontFamily: 'Brand_Body', color: Colors.text, fontSize: 15, lineHeight: 22 },
  
  contactBtn: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center', gap: 6 },
  contactText: { fontSize: 12, fontWeight: 'bold' },

  emptyText: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: 50 },
});