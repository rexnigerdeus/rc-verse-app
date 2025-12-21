// src/app/(app)/bible.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert, useWindowDimensions, FlatList, SafeAreaView
} from 'react-native';
import Modal from 'react-native-modal';
import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import { Colors } from '../../constants/colors';
import i18n from '../../lib/i18n';
import { Feather } from '@expo/vector-icons';
import { trackEvent } from '../../lib/analytics';

// --- BIBLE DATA CONSTANTS ---

const BIBLE_VERSIONS = [
    { label: 'King James (Authorized) Version', id: 'eng_kjv' },
    { label: 'Louis Segond 1910', id: 'fra_lsg' },
    { label: 'Bible J.N. Darby', id: 'fra_jnd' },
    // We can now add the other versions when you find their IDs
];

const BIBLE_BOOKS = [
  // Old Testament
  { name: "Genesis", id: "GEN", chapters: 50 },
  { name: "Exodus", id: "EXO", chapters: 40 },
  { name: "Leviticus", id: "LEV", chapters: 27 },
  { name: "Numbers", id: "NUM", chapters: 36 },
  { name: "Deuteronomy", id: "DEU", chapters: 34 },
  { name: "Joshua", id: "JOS", chapters: 24 },
  { name: "Judges", id: "JDG", chapters: 21 },
  { name: "Ruth", id: "RUT", chapters: 4 },
  { name: "1 Samuel", id: "1SA", chapters: 31 },
  { name: "2 Samuel", id: "2SA", chapters: 24 },
  { name: "1 Kings", id: "1KI", chapters: 22 },
  { name: "2 Kings", id: "2KI", chapters: 25 },
  { name: "1 Chronicles", id: "1CH", chapters: 29 },
  { name: "2 Chronicles", id: "2CH", chapters: 36 },
  { name: "Ezra", id: "EZR", chapters: 10 },
  { name: "Nehemiah", id: "NEH", chapters: 13 },
  { name: "Esther", id: "EST", chapters: 10 },
  { name: "Job", id: "JOB", chapters: 42 },
  { name: "Psalms", id: "PSA", chapters: 150 },
  { name: "Proverbs", id: "PRO", chapters: 31 },
  { name: "Ecclesiastes", id: "ECC", chapters: 12 },
  { name: "Song of Solomon", id: "SNG", chapters: 8 },
  { name: "Isaiah", id: "ISA", chapters: 66 },
  { name: "Jeremiah", id: "JER", chapters: 52 },
  { name: "Lamentations", id: "LAM", chapters: 5 },
  { name: "Ezekiel", id: "EZK", chapters: 48 },
  { name: "Daniel", id: "DAN", chapters: 12 },
  { name: "Hosea", id: "HOS", chapters: 14 },
  { name: "Joel", id: "JOL", chapters: 3 },
  { name: "Amos", id: "AMO", chapters: 9 },
  { name: "Obadiah", id: "OBA", chapters: 1 },
  { name: "Jonah", id: "JON", chapters: 4 },
  { name: "Micah", id: "MIC", chapters: 7 },
  { name: "Nahum", id: "NAM", chapters: 3 },
  { name: "Habakkuk", id: "HAB", chapters: 3 },
  { name: "Zephaniah", id: "ZEP", chapters: 3 },
  { name: "Haggai", id: "HAG", chapters: 2 },
  { name: "Zechariah", id: "ZEC", chapters: 14 },
  { name: "Malachi", id: "MAL", chapters: 4 },
  // New Testament
  { name: "Matthew", id: "MAT", chapters: 28 },
  { name: "Mark", id: "MRK", chapters: 16 },
  { name: "Luke", id: "LUK", chapters: 24 },
  { name: "John", id: "JHN", chapters: 21 },
  { name: "Acts", id: "ACT", chapters: 28 },
  { name: "Romans", id: "ROM", chapters: 16 },
  { name: "1 Corinthians", id: "1CO", chapters: 16 },
  { name: "2 Corinthians", id: "2CO", chapters: 13 },
  { name: "Galatians", id: "GAL", chapters: 6 },
  { name: "Ephesians", id: "EPH", chapters: 6 },
  { name: "Philippians", id: "PHP", chapters: 4 },
  { name: "Colossians", id: "COL", chapters: 4 },
  { name: "1 Thessalonians", id: "1TH", chapters: 5 },
  { name: "2 Thessalonians", id: "2TH", chapters: 3 },
  { name: "1 Timothy", id: "1TI", chapters: 6 },
  { name: "2 Timothy", id: "2TI", chapters: 4 },
  { name: "Titus", id: "TIT", chapters: 3 },
  { name: "Philemon", id: "PHM", chapters: 1 },
  { name: "Hebrews", id: "HEB", chapters: 13 },
  { name: "James", id: "JAS", chapters: 5 },
  { name: "1 Peter", id: "1PE", chapters: 5 },
  { name: "2 Peter", id: "2PE", chapters: 3 },
  { name: "1 John", id: "1JN", chapters: 5 },
  { name: "2 John", id: "2JN", chapters: 1 },
  { name: "3 John", id: "3JN", chapters: 1 },
  { name: "Jude", id: "JUD", chapters: 1 },
  { name: "Revelation", id: "REV", chapters: 22 }
];

// --- TYPE DEFINITIONS ---
// Matches the structure inside data.chapter.content
type ApiVerseContent = string | { noteId: number }; // Content can be a string or a note object

type ApiVerse = {
    type: "verse";
    number: number;
    content: ApiVerseContent[];
};

// Matches the top-level API response
type ScriptureApiResponse = {
    book: { name: string; /* ...other book properties */ };
    chapter: {
        number: number;
        content: ApiVerse[]; // The verses are here
        footnotes: any[]; // We can ignore footnotes for now
    };
    // ... other properties like 'translation'
};

// App's internal scripture state (simplified)
type ScriptureContent = {
    verses: ApiVerse[]; // We will store the ApiVerse array directly
    reference: string;
} | null;

type Book = typeof BIBLE_BOOKS[0];
type Version = typeof BIBLE_VERSIONS[0];

// --- COMPONENT ---
export default function BibleScreen() {
    const { width } = useWindowDimensions();

    // --- State ---
    const [selectedVersion, setSelectedVersion] = useState<Version>(BIBLE_VERSIONS[0]);
    const [selectedBook, setSelectedBook] = useState<Book>(BIBLE_BOOKS[0]);
    const [selectedChapter, setSelectedChapter] = useState(1);
    const [scripture, setScripture] = useState<ScriptureContent>(null);
    const [loading, setLoading] = useState(true);
    const [isVersionModalVisible, setVersionModalVisible] = useState(false);
    const [isSelectorModalVisible, setSelectorModalVisible] = useState(false);
    const [modalView, setModalView] = useState<'book' | 'chapter'>('book');
    const [tempSelectedBook, setTempSelectedBook] = useState<Book>(BIBLE_BOOKS[0]);

    // --- Data Fetching ---
    const fetchScripture = useCallback(async (versionId: string, bookId: string, chapter: number) => {
    setLoading(true);
    setScripture(null);

    const apiUrl = `https://bible.helloao.org/api/${versionId}/${bookId}/${chapter}.json`;
    console.log(`Attempting URL: ${apiUrl}`);

    try {
        const response = await fetch(apiUrl);
        const contentType = response.headers.get("content-type");

        if (!response.ok) {
            // ... (error handling for 404, etc. remains the same)
             throw new Error(`API request failed with status ${response.status}`);
        }
        if (!contentType || contentType.indexOf("application/json") === -1) {
             throw new Error(`Unexpected content type received from API: ${contentType}`);
        }

        const data: ScriptureApiResponse | { error: string } = await response.json();
        // console.log("API RESPONSE DATA:", JSON.stringify(data, null, 2)); // You can remove this now

        if ('error' in data) {
            throw new Error(`API Error: ${data.error}`);
        }

        // --- THIS IS THE MAIN FIX ---
        // Check for the verses in the new location: data.chapter.content
        if (!data.chapter || !data.chapter.content || data.chapter.content.length === 0) {
             throw new Error(`No verses found for ${bookId} ${chapter} [${versionId}].`);
        }
        // --- END FIX ---

        setScripture({
            verses: data.chapter.content, // Store the array of verse objects
            reference: `${data.book.name || selectedBook.name} ${chapter} (${selectedVersion.label})`,
        });

    } catch (error: any) {
        console.error("API Fetch Error:", error);
        Alert.alert('Error', i18n.t('bible.error') + `\n${error.message || ''}`);
        setScripture({ verses: [], reference: `Error: ${error.message}` });
    } finally {
        setLoading(false);
    }
}, [selectedBook.name, selectedVersion.label]);

    // --- Effects ---
    useEffect(() => {
        // Fetch scripture using the book's uppercase ID
        fetchScripture(selectedVersion.id, selectedBook.id, selectedChapter);
        if (selectedBook && selectedChapter) {
        trackEvent('bible_read', { book: selectedBook, chapter: selectedChapter });
    }
    }, [selectedVersion.id, selectedBook.id, selectedChapter, fetchScripture]);


   // --- Handlers ---
    const handleSelectVersion = (version: Version) => {
        setSelectedVersion(version);
        setVersionModalVisible(false);
    };

    const openSelectorModal = () => {
        setTempSelectedBook(selectedBook);
        setModalView('book');
        setSelectorModalVisible(true);
    };

    const handleSelectBookInModal = (book: Book) => {
        setTempSelectedBook(book);
        setModalView('chapter');
    };

    const handleSelectChapterInModal = (chapter: number) => {
        setSelectedBook(tempSelectedBook);
        setSelectedChapter(chapter);
        setSelectorModalVisible(false);
    };

    const goBackToBookSelection = () => {
        setModalView('book');
    };

    const chapterNumbers = useMemo(() => {
        return Array.from({ length: tempSelectedBook.chapters }, (_, i) => i + 1);
    }, [tempSelectedBook]);

    const goToPreviousChapter = () => {
        if (selectedChapter > 1) {
            setSelectedChapter(prev => prev - 1);
        }
    };

    const goToNextChapter = () => {
        if (selectedChapter < selectedBook.chapters) {
             setSelectedChapter(prev => prev + 1);
        }
    };

    // --- Memoize HTML Styles ---
    const tagsStyles = useMemo(() => ({
        p: { marginBottom: 5, marginTop: 5 },
        h3: { fontFamily: 'Outfit_700Bold', fontSize: 18, marginBottom: 10, marginTop: 15, textAlign: 'center'}, // This tag might be used by the API
        strong: { fontFamily: 'Outfit_700Bold', fontSize: 18, textAlign: 'center', marginBottom: 10 }, // This is our manual title
        sup: { fontFamily: 'Outfit_400Regular', fontSize: 10, lineHeight: 10, color: 'rgba(255,255,255,0.6)' },
    }), []);


   // --- Render UI ---
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                 <Pressable style={styles.selectorButton} onPress={openSelectorModal}>
                    <Text style={styles.selectorText}>{`${selectedBook.name} ${selectedChapter}`}</Text>
                    <Feather name="chevron-down" size={16} color={Colors.text} />
                 </Pressable>
                <Pressable style={styles.selectorButton} onPress={() => setVersionModalVisible(true)}>
                    <Text style={styles.selectorText}>{selectedVersion.label}</Text>
                    <Feather name="chevron-down" size={16} color={Colors.text} />
                </Pressable>
            </View>

            {/* Scripture Content */}
            <ScrollView style={styles.scriptureScroll} contentContainerStyle={styles.scriptureContentContainer}>
                {loading && <ActivityIndicator color={Colors.text} size="large" style={styles.loader} />}

                {scripture && !loading && (
                    <View>
                        <Text style={styles.chapterTitle}>{scripture.reference}</Text>

                        {/* Map over the new 'verses' (ApiVerse) array */}
                        {scripture.verses.map((verse) => {
                            // Filter out notes, keep only text strings
                            const verseText = verse.content
                                .filter(item => typeof item === 'string')
                                .join(' '); // Join text parts

                            return (
                                <Text key={verse.number} style={styles.verseText}>
                                    <Text style={styles.verseNumber}>{verse.number} </Text>
                                    {verseText}
                                </Text>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Floating Navigation */}
            <View style={styles.navigationContainer}>
                 <Pressable
                    style={[styles.navButton, selectedChapter <= 1 && styles.navButtonDisabled]}
                    onPress={goToPreviousChapter}
                    disabled={selectedChapter <= 1} >
                    <Feather name="arrow-left-circle" size={36} color={selectedChapter <= 1 ? 'rgba(255,255,255,0.3)' : Colors.text} />
                 </Pressable>
                 <Pressable
                     style={[styles.navButton, selectedChapter >= selectedBook.chapters && styles.navButtonDisabled]}
                     onPress={goToNextChapter}
                     disabled={selectedChapter >= selectedBook.chapters} >
                    <Feather name="arrow-right-circle" size={36} color={selectedChapter >= selectedBook.chapters ? 'rgba(255,255,255,0.3)' : Colors.text} />
                 </Pressable>
            </View>

            {/* Modals */}
            <Modal isVisible={isVersionModalVisible} onBackdropPress={() => setVersionModalVisible(false)} style={styles.modal}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{i18n.t('bible.selectVersion')}</Text>
                  <FlatList
                    data={BIBLE_VERSIONS}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <Pressable style={styles.modalItem} onPress={() => handleSelectVersion(item)}>
                        <Text style={styles.modalItemText}>{item.label}</Text>
                      </Pressable>
                    )}
                  />
                </View>
            </Modal>

            {/* NEW Combined Book/Chapter Modal */}
            <Modal
                isVisible={isSelectorModalVisible}
                onBackdropPress={() => setSelectorModalVisible(false)}
                style={modalView === 'book' ? styles.modal : styles.modalChapter}
            >
                <View style={styles.modalContent}>
                    {modalView === 'book' ? (
                        <>
                            <Text style={styles.modalTitle}>{i18n.t('bible.selectBook')}</Text>
                            <FlatList
                                key="book-list" // <-- ADD THIS
                                data={BIBLE_BOOKS}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <Pressable style={styles.modalItem} onPress={() => handleSelectBookInModal(item)}>
                                        <Text style={styles.modalItemText}>{item.name}</Text>
                                    </Pressable>
                                )}
                            />
                        </>
                    ) : ( // Chapter View
                        <>
                            <Pressable onPress={goBackToBookSelection} style={styles.modalBackButton}>
                                <Feather name="chevron-left" size={24} color={Colors.text} />
                                <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode='tail'>{`${i18n.t('bible.selectChapter')} - ${tempSelectedBook.name}`}</Text>
                            </Pressable>
                            <FlatList
                                key="chapter-list" // <-- ADD THIS
                                data={chapterNumbers}
                                keyExtractor={(item) => String(item)}
                                numColumns={5}
                                contentContainerStyle={styles.chapterGridContainer}
                                renderItem={({ item }) => (
                                    <Pressable style={styles.chapterItem} onPress={() => handleSelectChapterInModal(item)}>
                                        <Text style={styles.chapterItemText}>{item}</Text>
                                    </Pressable>
                                )}
                            />
                        </>
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.primary },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(244, 241, 234, 0.1)',
        backgroundColor: Colors.primary,
    },
    selectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 25,
        marginHorizontal: 3,
        borderWidth: 1,
        borderColor: 'rgba(244, 241, 234, 0.1)',
    },
    selectorText: {
        fontFamily: 'Brand_Body_Bold',
        color: Colors.text,
        fontSize: 14,
        marginRight: 8,
    },
    scriptureScroll: { flex: 1 },
    scriptureContentContainer: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 80 },
    loader: { marginTop: 50 },
    // Replaced HTML renderer styles with Text styles
    chapterTitle: { 
        fontFamily: 'Brand_Heading',
        fontSize: 26,
        color: Colors.accent, // Abidjan Clay
        textAlign: 'center',
        marginBottom: 25,
        marginTop: 10,
    },
    verseText: { 
        fontFamily: 'Brand_Heading', // Using Serif for reading feels more "Bible-like"
        color: Colors.text,
        fontSize: 19,
        lineHeight: 32,
        marginBottom: 15,
    },
    verseNumber: { 
        fontFamily: 'Brand_Body_Bold', 
        fontSize: 12,
        color: Colors.accent, // Abidjan Clay for verse numbers
        marginRight: 6,
    },
    navigationContainer: { position: 'absolute', bottom: 20, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    navButton: { padding: 5 },
    navButtonDisabled: { opacity: 0.3 },
    modal: { justifyContent: 'flex-end', margin: 0 },
    modalChapter: { justifyContent: 'center', alignItems: 'center', margin: 0 },
    modalContent: { backgroundColor: Colors.primary, paddingHorizontal: 10, paddingTop: 20, paddingBottom: 30, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', width: '100%', },
    modalTitle: { 
        fontFamily: 'Brand_Heading', 
        fontSize: 22, 
        color: Colors.accent, 
        textAlign: 'center', 
        marginBottom: 20 
    },
    modalItem: { 
        paddingVertical: 18, 
        borderBottomWidth: 1, 
        borderBottomColor: 'rgba(244, 241, 234, 0.1)' 
    },
    modalItemText: { 
        fontFamily: 'Brand_Body', 
        color: Colors.text, 
        fontSize: 18, 
        textAlign: 'center' 
    },
    chapterGridContainer: { alignItems: 'center' },
    chapterItem: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 15, margin: 5, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
    chapterItemText: { fontFamily: 'Outfit_400Regular', color: Colors.text, fontSize: 16 },
    modalBackButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, width: '100%', paddingHorizontal: 10 }, // Use width for centering
});