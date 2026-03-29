import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList, Modal, SafeAreaView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Colors } from '../../constants/colors';

// --- CONSTANTS ---
const BIBLE_VERSIONS = [
    { id: 'NBS', name: 'Nouvelle Segond 2002' },
    { id: 'FRDBY', name: 'La Bible de Darby 1890' }, 
    { id: 'FRLSG', name: 'Bible Segond 1910' }, 
    { id: 'FRPDV17', name: 'Parole de Vie 2017' }, 
    { id: 'BDS', name: 'La Bible du Semeur 2015' } 
];

// Bolls.life utilise des numéros (1 à 66) pour identifier les livres
const BIBLE_BOOKS = [
    { number: 1, name: "Genèse", chapters: 50 }, { number: 2, name: "Exode", chapters: 40 }, 
    { number: 3, name: "Lévitique", chapters: 27 }, { number: 4, name: "Nombres", chapters: 36 },
    { number: 5, name: "Deutéronome", chapters: 34 }, { number: 6, name: "Josué", chapters: 24 },
    { number: 7, name: "Juges", chapters: 21 }, { number: 8, name: "Ruth", chapters: 4 },
    { number: 9, name: "1 Samuel", chapters: 31 }, { number: 10, name: "2 Samuel", chapters: 24 },
    { number: 11, name: "1 Rois", chapters: 22 }, { number: 12, name: "2 Rois", chapters: 25 },
    { number: 13, name: "1 Chroniques", chapters: 29 }, { number: 14, name: "2 Chroniques", chapters: 36 },
    { number: 15, name: "Esdras", chapters: 10 }, { number: 16, name: "Néhémie", chapters: 13 },
    { number: 17, name: "Esther", chapters: 10 }, { number: 18, name: "Job", chapters: 42 },
    { number: 19, name: "Psaumes", chapters: 150 }, { number: 20, name: "Proverbes", chapters: 31 },
    { number: 21, name: "Ecclésiaste", chapters: 12 }, { number: 22, name: "Cantique des Cant.", chapters: 8 },
    { number: 23, name: "Ésaïe", chapters: 66 }, { number: 24, name: "Jérémie", chapters: 52 },
    { number: 25, name: "Lamentations", chapters: 5 }, { number: 26, name: "Ézéchiel", chapters: 48 },
    { number: 27, name: "Daniel", chapters: 12 }, { number: 28, name: "Osée", chapters: 14 },
    { number: 29, name: "Joël", chapters: 3 }, { number: 30, name: "Amos", chapters: 9 },
    { number: 31, name: "Abdias", chapters: 1 }, { number: 32, name: "Jonas", chapters: 4 },
    { number: 33, name: "Michée", chapters: 7 }, { number: 34, name: "Nahum", chapters: 3 },
    { number: 35, name: "Habacuc", chapters: 3 }, { number: 36, name: "Sophonie", chapters: 3 },
    { number: 37, name: "Aggée", chapters: 2 }, { number: 38, name: "Zacharie", chapters: 14 },
    { number: 39, name: "Malachie", chapters: 4 }, { number: 40, name: "Matthieu", chapters: 28 },
    { number: 41, name: "Marc", chapters: 16 }, { number: 42, name: "Luc", chapters: 24 },
    { number: 43, name: "Jean", chapters: 21 }, { number: 44, name: "Actes", chapters: 28 },
    { number: 45, name: "Romains", chapters: 16 }, { number: 46, name: "1 Corinthiens", chapters: 16 },
    { number: 47, name: "2 Corinthiens", chapters: 13 }, { number: 48, name: "Galates", chapters: 6 },
    { number: 49, name: "Éphésiens", chapters: 6 }, { number: 50, name: "Philippiens", chapters: 4 },
    { number: 51, name: "Colossiens", chapters: 4 }, { number: 52, name: "1 Thessaloniciens", chapters: 5 },
    { number: 53, name: "2 Thessaloniciens", chapters: 3 }, { number: 54, name: "1 Timothée", chapters: 6 },
    { number: 55, name: "2 Timothée", chapters: 4 }, { number: 56, name: "Tite", chapters: 3 },
    { number: 57, name: "Philémon", chapters: 1 }, { number: 58, name: "Hébreux", chapters: 13 },
    { number: 59, name: "Jacques", chapters: 5 }, { number: 60, name: "1 Pierre", chapters: 5 },
    { number: 61, name: "2 Pierre", chapters: 3 }, { number: 62, name: "1 Jean", chapters: 5 },
    { number: 63, name: "2 Jean", chapters: 1 }, { number: 64, name: "3 Jean", chapters: 1 },
    { number: 65, name: "Jude", chapters: 1 }, { number: 66, name: "Apocalypse", chapters: 22 }
];

type Version = typeof BIBLE_VERSIONS[0];
type Book = typeof BIBLE_BOOKS[0];
type Verse = { verse: number; text: string };

export default function BibleScreen() {
    // --- STATE ---
    const [verses, setVerses] = useState<Verse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    
    const [selectedBook, setSelectedBook] = useState<Book>(BIBLE_BOOKS[0]);
    const [selectedChapter, setSelectedChapter] = useState(1);
    const [selectedVersion, setSelectedVersion] = useState<Version>(BIBLE_VERSIONS[0]); // NOUVEAU

    const [isSelectorVisible, setSelectorVisible] = useState(false);
    const [selectorStep, setSelectorStep] = useState<'BOOK' | 'CHAPTER' | 'VERSION'>('BOOK'); // NOUVEAU: 'VERSION'
    const [tempBook, setTempBook] = useState<Book>(BIBLE_BOOKS[0]);

    // --- FETCH DATA ---
    const fetchChapter = useCallback(async () => {
        setIsLoading(true);
        setError(false);
        try {
            // L'URL s'adapte maintenant à la version choisie !
            const apiUrl = `https://bolls.life/get-chapter/${selectedVersion.id}/${selectedBook.number}/${selectedChapter}/`;

            const response = await fetch(apiUrl);
            
            if (!response.ok) throw new Error("Erreur réseau");
            
            const data = await response.json();
            
            if (Array.isArray(data) && data.length > 0) {
                 const cleanedVerses = data.map((v: any) => ({
                     verse: v.verse,
                     text: v.text.replace(/<[^>]+>/g, '').trim()
                 }));
                 setVerses(cleanedVerses);
            } else {
                 throw new Error("Chapitre vide.");
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [selectedBook, selectedChapter, selectedVersion]); // NOUVEAU: selectedVersion ajouté ici

    useEffect(() => {
        fetchChapter();
    }, [fetchChapter]);

    // --- HANDLERS ---
    const handleNextChapter = () => {
        if (selectedChapter < selectedBook.chapters) setSelectedChapter(c => c + 1);
    };
    const handlePrevChapter = () => {
        if (selectedChapter > 1) setSelectedChapter(c => c - 1);
    };

    // Ouvre le choix des livres
    const openBookSelector = () => {
        setTempBook(selectedBook);
        setSelectorStep('BOOK');
        setSelectorVisible(true);
    };

    // Ouvre le choix des versions
    const openVersionSelector = () => {
        setSelectorStep('VERSION');
        setSelectorVisible(true);
    };

    const selectBook = (book: Book) => {
        setTempBook(book);
        setSelectorStep('CHAPTER');
    };

    const selectChapter = (chapter: number) => {
        setSelectedBook(tempBook);
        setSelectedChapter(chapter);
        setSelectorVisible(false);
    };

    const selectVersion = (version: Version) => {
        setSelectedVersion(version);
        setSelectorVisible(false); // Ferme et recharge automatiquement
    };

    // --- RENDER ---
    return (
        <ScreenWrapper>
            {/* EN-TÊTE SÉPARÉ */}
            <View style={styles.header}>
                <View style={styles.headerSelector}>
                    <Pressable onPress={openBookSelector}>
                        <Text style={styles.headerTitle}>{selectedBook.name} {selectedChapter}</Text>
                    </Pressable>
                    <Pressable onPress={openVersionSelector} style={styles.headerSubtitleRow}>
                        <Text style={styles.headerSubtitle}>{selectedVersion.name}</Text>
                        <Feather name="chevron-down" size={14} color={Colors.textSecondary} />
                    </Pressable>
                </View>
                <Pressable style={styles.searchButton} onPress={openBookSelector}>
                    <Feather name="list" size={20} color={Colors.text} />
                </Pressable>
            </View>

            {/* CONTENU (Identique...) */}
            {/* ... gardez votre View de chargement et votre FlatList de versets ici ... */}
            <View style={{ flex: 1 }}>
                {isLoading ? (
                    <View style={styles.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>
                ) : error ? (
                    <View style={styles.centered}>
                        <Feather name="wifi-off" size={32} color={Colors.textSecondary} style={{marginBottom: 10}}/>
                        <Text style={styles.errorText}>Impossible de charger le chapitre.</Text>
                        <Pressable style={styles.retryButton} onPress={fetchChapter}>
                            <Text style={styles.retryText}>Réessayer</Text>
                        </Pressable>
                    </View>
                ) : (
                    <FlatList
                        data={verses}
                        keyExtractor={(item) => item.verse.toString()}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <Text style={styles.verseText}>
                                <Text style={styles.verseNumber}>{item.verse} </Text>
                                {item.text}
                            </Text>
                        )}
                        ListFooterComponent={<View style={{ height: 60 }} />} 
                    />
                )}
            </View>

            {/* BARRE DU BAS (Identique...) */}
            <View style={styles.bottomBar}>
                <Pressable onPress={handlePrevChapter} disabled={selectedChapter <= 1} style={[styles.navButton, selectedChapter <= 1 && styles.disabled]}>
                    <Feather name="chevron-left" size={24} color={Colors.text} />
                </Pressable>
                <Text style={styles.bottomBarText}>Chapitre {selectedChapter}</Text>
                <Pressable onPress={handleNextChapter} disabled={selectedChapter >= selectedBook.chapters} style={[styles.navButton, selectedChapter >= selectedBook.chapters && styles.disabled]}>
                    <Feather name="chevron-right" size={24} color={Colors.text} />
                </Pressable>
            </View>

            {/* MODAL MIS À JOUR (Gère Livre, Chapitre, et Version) */}
            <Modal visible={isSelectorVisible} animationType="slide" transparent={true} onRequestClose={() => setSelectorVisible(false)}>
                <SafeAreaView style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            {/* Bouton Retour intelligent */}
                            <Pressable 
                                onPress={() => setSelectorStep('BOOK')} 
                                style={{ padding: 10, opacity: selectorStep === 'CHAPTER' ? 1 : 0 }}
                                disabled={selectorStep !== 'CHAPTER'}
                            >
                                <Feather name="arrow-left" size={24} color={Colors.text} />
                            </Pressable>
                            
                            {/* Titre dynamique */}
                            <Text style={styles.modalTitle}>
                                {selectorStep === 'VERSION' ? 'Traductions' : selectorStep === 'BOOK' ? 'Choisir un livre' : tempBook.name}
                            </Text>
                            
                            <Pressable onPress={() => setSelectorVisible(false)} style={{ padding: 10 }}>
                                <Feather name="x" size={24} color={Colors.text} />
                            </Pressable>
                        </View>

                        {/* Rendu Dynamique selon l'étape */}
                        {selectorStep === 'VERSION' ? (
                            <FlatList
                                key="versions"
                                data={BIBLE_VERSIONS}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <Pressable style={styles.listItem} onPress={() => selectVersion(item)}>
                                        <Text style={[
                                            styles.listItemText, 
                                            selectedVersion.id === item.id && {color: Colors.accent, fontFamily: 'Brand_Body_Bold'}
                                        ]}>
                                            {item.name}
                                        </Text>
                                        {selectedVersion.id === item.id && <Feather name="check" size={18} color={Colors.accent} />}
                                    </Pressable>
                                )}
                            />
                        ) : selectorStep === 'BOOK' ? (
                            <FlatList
                                key="books"
                                data={BIBLE_BOOKS}
                                keyExtractor={(item) => item.number.toString()}
                                renderItem={({ item }) => (
                                    <Pressable style={styles.listItem} onPress={() => selectBook(item)}>
                                        <Text style={styles.listItemText}>{item.name}</Text>
                                        <Feather name="chevron-right" size={18} color={Colors.textSecondary} />
                                    </Pressable>
                                )}
                            />
                        ) : (
                            <FlatList
                                key="chapters"
                                data={Array.from({ length: tempBook.chapters }, (_, i) => i + 1)}
                                keyExtractor={(item) => item.toString()}
                                numColumns={5}
                                contentContainerStyle={styles.chapterGrid}
                                renderItem={({ item }) => (
                                    <Pressable style={styles.chapterBox} onPress={() => selectChapter(item)}>
                                        <Text style={styles.chapterBoxText}>{item}</Text>
                                    </Pressable>
                                )}
                            />
                        )}
                    </View>
                </SafeAreaView>
            </Modal>
        </ScreenWrapper>
    );

}

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    headerSelector: { flex: 1 },
    headerTitle: { fontFamily: 'Brand_Heading', fontSize: 24, color: Colors.text },
    headerSubtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    headerSubtitle: { fontFamily: 'Brand_Body', fontSize: 14, color: Colors.textSecondary },
    searchButton: { padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },
    
    scrollContent: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 40 },
    verseText: { fontFamily: 'Brand_Body', color: Colors.text, fontSize: 18, lineHeight: 32, marginBottom: 16, textAlign: 'left' },
    verseNumber: { fontFamily: 'Brand_Body_Bold', color: Colors.accent, fontSize: 14 },
    
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingVertical: Platform.OS === 'ios' ? 20 : 15,
        backgroundColor: Colors.primary,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    navButton: { padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },
    bottomBarText: { fontFamily: 'Brand_Body_Bold', color: Colors.text, fontSize: 16 },
    disabled: { opacity: 0.2 },

    errorText: { fontFamily: 'Brand_Body', color: Colors.textSecondary, fontSize: 16, marginBottom: 20 },
    retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.accent, borderRadius: 20 },
    retryText: { fontFamily: 'Brand_Body_Bold', color: Colors.primary },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: Colors.primary, height: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    modalTitle: { fontFamily: 'Brand_Heading', fontSize: 18, color: Colors.text },
    
    listItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    listItemText: { fontFamily: 'Brand_Body', fontSize: 16, color: Colors.text },
    
    chapterGrid: { padding: 20, alignItems: 'center' },
    chapterBox: { width: 55, height: 55, margin: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    chapterBoxText: { fontFamily: 'Brand_Body_Bold', fontSize: 16, color: Colors.text },
});