import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, SafeAreaView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

interface DailyQuizModalProps {
  visible: boolean;
  onClose: () => void;
}

// Liste de secours au cas où la table Supabase serait temporairement vide ou inaccessible
const FALLBACK_QUESTIONS = [
  { question: "Qui a été jeté dans la fosse aux lions ?", options: ["Daniel", "David", "Jonas", "Pierre"], correctAnswer: "Daniel" },
  { question: "Combien de jours Jésus a-t-il jeûné dans le désert ?", options: ["40 jours", "30 jours", "12 jours", "7 jours"], correctAnswer: "40 jours" },
  { question: "Quel prophète a été enlevé au ciel sur un char de feu ?", options: ["Élie", "Élisée", "Moïse", "Ésaïe"], correctAnswer: "Élie" },
  { question: "Qui a écrit la majorité des Psaumes ?", options: ["David", "Salomon", "Moïse", "Asaph"], correctAnswer: "David" }
];

const getLocalDateString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

export function DailyQuizModal({ visible, onClose }: DailyQuizModalProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [todayScore, setTodayScore] = useState<number | null>(null);

  const [step, setStep] = useState(1); 
  const [score, setScore] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (visible && user) {
      setStep(1);
      setScore(0);
      setIsAnswering(false);
      setSelectedOption(null);
      
      if (!hasPlayedToday) {
        checkAndFetchQuizData();
      }
    }
  }, [visible, user]);

  const checkAndFetchQuizData = async () => {
    setLoading(true);
    const todayStr = getLocalDateString(0);
    const yesterdayStr = getLocalDateString(-1);

    try {
      // 1. Vérification si le quiz a déjà été joué aujourd'hui
      const { data: historyDataToday } = await supabase
        .from('quiz_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('played_on', todayStr)
        .single();

      if (historyDataToday) {
        setHasPlayedToday(true);
        setTodayScore(historyDataToday.score);
        setLoading(false);
        return;
      }

      // 2. Récupération des 2 questions bibliques générales depuis VOTRE table
      const { data: dbQuestions } = await supabase.from('quiz_questions').select('*');
      let generalQuestions = [];
      
      if (dbQuestions && dbQuestions.length >= 2) {
        generalQuestions = dbQuestions
          .sort(() => 0.5 - Math.random()) // Mélange aléatoire
          .slice(0, 2) // On en garde seulement 2
          .map(q => ({
            question: q.question,
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
            correctAnswer: q.correct_answer,
            explanation: q.explanation
          }));
      } else {
        // Fallback si la table est vide
        generalQuestions = [...FALLBACK_QUESTIONS].sort(() => 0.5 - Math.random()).slice(0, 2);
      }

      // 3. Récupération du verset (Question 1) avec filet de sécurité
      let historyData = null;
      
      // On tente de récupérer le verset d'hier
      const { data: historyDataYesterday } = await supabase
        .from('verse_history')
        .select('*, verses(*)')
        .eq('user_id', user.id)
        .eq('viewed_on', yesterdayStr)
        .single();

      if (historyDataYesterday) {
        historyData = historyDataYesterday;
      } else {
        // Si aucun verset lu hier, on récupère le tout dernier verset lu
        const { data: lastViewed } = await supabase
          .from('verse_history')
          .select('*, verses(*)')
          .eq('user_id', user.id)
          .order('viewed_on', { ascending: false })
          .limit(1)
          .single();
        historyData = lastViewed;
      }

      // Si l'utilisateur est totalement nouveau et n'a aucun historique, on prend un verset aléatoire
      if (!historyData || !historyData.verses) {
        const { data: randomVerse } = await supabase.from('verses').select('*').limit(1).single();
        if (randomVerse) historyData = { verses: randomVerse };
      }

      // 4. Construction de la Question 1 (Verset à trous)
      let q1 = null;
      if (historyData && historyData.verses) {
        const verse = historyData.verses;
        const words = verse.text.split(' ');
        
        // Retirer 2 à 3 mots (sans toucher au tout premier ou dernier mot pour garder du sens)
        const wordsToRemove = Math.min(3, Math.max(2, Math.floor(words.length / 4))); 
        const maxStartIndex = Math.max(1, words.length - wordsToRemove - 1);
        const startIndex = Math.min(Math.max(1, Math.floor(Math.random() * maxStartIndex)), words.length - wordsToRemove);
        
        const maskedText = words.map((w: string, i: number) => 
          (i >= startIndex && i < startIndex + wordsToRemove) ? "_____" : w
        ).join(' ');

        const trueRef = `${verse.book} ${verse.chapter}:${verse.verse_number}`;
        const fakeRefs = [
            `${verse.book} ${Number(verse.chapter) + 1}:2`, 
            `Psaumes 23:1`, 
            `Proverbes 3:5`, 
            `Jean 3:16`, 
            `Romains 8:28`
        ].filter(r => r !== trueRef).sort(() => 0.5 - Math.random()).slice(0, 3);

        q1 = {
          question: "Devinez les mots manquants et choisissez la bonne référence :",
          textWithBlank: maskedText,
          options: [trueRef, ...fakeRefs].sort(() => 0.5 - Math.random()),
          correctAnswer: trueRef
        };
      }

      // On assemble les 3 questions
      setQuestions(q1 ? [q1, ...generalQuestions] : [...generalQuestions, FALLBACK_QUESTIONS[2]]);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (isAnswering) return; 
    setIsAnswering(true);
    setSelectedOption(option);

    const isCorrect = option === questions[step - 1].correctAnswer;
    if (isCorrect) setScore(prev => prev + 1);

    setTimeout(() => {
      if (step < 3) {
        setStep(prev => prev + 1);
      } else {
        const finalScore = score + (isCorrect ? 1 : 0);
        setStep(4); 
        setTodayScore(finalScore);
        saveResults(finalScore);
      }
      setSelectedOption(null);
      setIsAnswering(false);
    }, 1500);
  };

  const saveResults = async (finalScore: number) => {
    if (!user) return;
    try {
      await supabase.from('quiz_history').insert({
        user_id: user.id,
        score: finalScore,
        played_on: getLocalDateString(0)
      });
      setHasPlayedToday(true);
    } catch (error) {
      console.log("Erreur lors de la sauvegarde du score", error);
    }
  };

  const getOptionStyle = (opt: string, correctAnswer: string) => {
    if (!isAnswering) return { backgroundColor: colors.surfaceBase, borderColor: colors.border, textColor: colors.text };
    if (opt === correctAnswer) return { backgroundColor: colors.success || '#4CAF50', borderColor: colors.success || '#4CAF50', textColor: '#FFFFFF' };
    if (opt === selectedOption && opt !== correctAnswer) return { backgroundColor: colors.error || '#EF5350', borderColor: colors.error || '#EF5350', textColor: '#FFFFFF' };
    return { backgroundColor: colors.surfaceBase, borderColor: colors.border, textColor: colors.text };
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Défi Quotidien</Text>
            <Pressable onPress={onClose} style={styles.closeButton} disabled={isAnswering && step < 4 && !hasPlayedToday}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 50 }} />
          ) : hasPlayedToday ? (
            <View style={styles.resultsContainer}>
              <View style={[styles.scoreCircle, { borderColor: colors.accentWarm }]}>
                <Text style={styles.scoreText}>{todayScore}/3</Text>
              </View>
              <Text style={styles.resultsTitle}>Défi complété !</Text>
              <Text style={styles.resultsSubtitle}>
                Vous avez déjà relevé votre défi aujourd'hui. Revenez demain pour un nouveau test.
              </Text>
              <Pressable style={styles.finishButton} onPress={onClose}>
                <Text style={styles.finishButtonText}>Fermer</Text>
              </Pressable>
            </View>
          ) : step === 4 ? (
            <View style={styles.resultsContainer}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreText}>{todayScore}/3</Text>
              </View>
              <Text style={styles.resultsTitle}>{todayScore === 3 ? "Parfait !" : "Bel effort !"}</Text>
              <Text style={styles.resultsSubtitle}>
                Défi complété ! Revenez demain pour un autre test.
              </Text>
              <Pressable style={styles.finishButton} onPress={onClose}>
                <Text style={styles.finishButtonText}>Terminer</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.quizBody}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
              </View>
              <Text style={styles.questionCounter}>Question {step} sur 3</Text>
              <Text style={styles.questionText}>{questions[step - 1]?.question}</Text>
              
              {questions[step - 1]?.textWithBlank && (
                <Text style={styles.verseText}>"{questions[step - 1].textWithBlank}"</Text>
              )}

              <View style={styles.optionsGrid}>
                {questions[step - 1]?.options?.map((opt: string, i: number) => {
                  const s = getOptionStyle(opt, questions[step - 1].correctAnswer);
                  return (
                    <Pressable key={i} style={[styles.optionBtn, { backgroundColor: s.backgroundColor, borderColor: s.borderColor }]} onPress={() => handleOptionSelect(opt)}>
                      <Text style={[styles.optionText, { color: s.textColor }]}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.backdrop, justifyContent: 'flex-end' },
  card: { backgroundColor: colors.primary, borderTopLeftRadius: 32, borderTopRightRadius: 32, minHeight: '75%', padding: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontFamily: 'Brand_Heading', fontSize: 24, color: colors.text },
  closeButton: { backgroundColor: colors.surfaceBase, borderRadius: 20, padding: 8 },
  
  quizBody: { flex: 1 },
  progressBar: { height: 6, backgroundColor: colors.surfaceBase, borderRadius: 3, marginBottom: 20, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  
  questionCounter: { fontFamily: 'Brand_Body_Bold', fontSize: 12, color: colors.accent, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  questionText: { fontFamily: 'Brand_Body_Bold', fontSize: 18, color: colors.textSecondary, marginBottom: 20, lineHeight: 26 },
  verseText: { fontFamily: 'Brand_Heading', fontSize: 22, color: colors.text, lineHeight: 34, marginBottom: 30 },
  
  optionsGrid: { gap: 12 },
  optionBtn: { padding: 18, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  optionText: { fontFamily: 'Brand_Body_Bold', fontSize: 16 },

  resultsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  scoreCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.surfaceBase, borderWidth: 4, borderColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  scoreText: { fontFamily: 'Brand_Heading', fontSize: 36, color: colors.text },
  resultsTitle: { fontFamily: 'Brand_Heading', fontSize: 28, color: colors.text, marginBottom: 12 },
  resultsSubtitle: { fontFamily: 'Brand_Body', fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20, marginBottom: 40 },
  finishButton: { backgroundColor: colors.text, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 30, width: '100%', alignItems: 'center' },
  finishButtonText: { fontFamily: 'Brand_Body_Bold', color: colors.primary, fontSize: 16 },
});