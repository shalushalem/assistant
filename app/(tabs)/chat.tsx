import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Keyboard,
  Animated,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; 
import { useGlobalContext } from '../../context/GlobalProvider';
import { databases, appwriteConfig } from '../../lib/appwrite'; 
import { Query } from 'react-native-appwrite'; 

type Role = 'user' | 'ai' | 'assistant';

interface Message {
  id: string;
  role: Role;
  text: string;
  time: string;
  hasActions?: boolean;
  images?: string[];
  boardIds?: string; // 🟢 Now a single string of comma-separated IDs!
}

const OCCASIONS = [
  { name: 'Gym', emoji: '💪' },
  { name: 'Office', emoji: '💼' },
  { name: 'Party', emoji: '🎊' },
  { name: 'Shopping', emoji: '🛍️' },
  { name: 'Study', emoji: '📖' },
  { name: 'Travel', emoji: '✈️' },
  { name: 'Date Night', emoji: '❤️' },
];

const QUICK_PROMPTS = [
  "What's trending for summer?",
  "Suggest a minimalist outfit.",
  "I need a cozy weekend look."
];

export default function Chat() {
  const { user } = useGlobalContext(); 
  const router = useRouter(); 

  const [activeOccasion, setActiveOccasion] = useState(OCCASIONS[0]);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const getTime = () => {
    const d = new Date();
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || inputText.trim();
    if (!textToSend) return;

    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', text: textToSend, time: getTime() };
    const currentHistory = [...messages, newUserMsg];
    
    setMessages(currentHistory);
    setInputText('');
    Keyboard.dismiss();
    setIsTyping(true);

    try {
      let currentWardrobe = [];
      if (user?.$id) {
        const response = await databases.listDocuments(
          appwriteConfig.databaseId!,
          appwriteConfig.outfitCollectionId!,
          [Query.equal('user_id', user.$id), Query.limit(50)] 
        );
        
        currentWardrobe = response.documents.map(doc => ({
          id: doc.$id,
          name: doc.name,
          category: doc.category,
          image_url: doc.masked_url || doc.image_url 
        }));
      }

      const API_URL = `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/text`;
      
      const apiMessages = currentHistory.map(m => ({
        role: m.role === 'ai' ? 'assistant' : m.role, 
        content: m.text
      }));

      const payload = {
        messages: apiMessages,
        language: "en",
        current_memory: "", 
        user_profile: {
          username: user?.name || "Buddy",
          gender: user?.gender || "male"
        },
        wardrobe_items: currentWardrobe 
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const aiResponseText = data.message?.content || "I'm having trouble thinking right now.";
      
      const newAiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: aiResponseText,
        time: getTime(),
        hasActions: !!data.board_ids || (data.images && data.images.length > 0),
        images: data.images,
        boardIds: data.board_ids // 🟢 Save the string to state
      };
      
      setMessages(prev => [...prev, newAiMsg]);

    } catch (error) {
      console.error("Chat API Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "Sorry, I couldn't reach the styling server right now.",
        time: getTime(),
        hasActions: false
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (isTyping) {
      const animateDot = (dot: Animated.Value, delay: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, { toValue: -5, duration: 300, delay, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.delay(600)
          ])
        ).start();
      };
      animateDot(dot1, 0);
      animateDot(dot2, 180);
      animateDot(dot3, 360);
    } else {
      dot1.stopAnimation(); dot2.stopAnimation(); dot3.stopAnimation();
      dot1.setValue(0); dot2.setValue(0); dot3.setValue(0);
    }
  }, [isTyping]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAi]}>
        {!isUser && (
          <View style={styles.bubbleAvatarAi}>
            <Text style={{ fontSize: 14 }}>{activeOccasion.emoji}</Text>
          </View>
        )}

        <View style={[styles.bubbleWrap, isUser ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
          {isUser ? (
            <LinearGradient colors={['rgba(144, 96, 208, 0.28)', 'rgba(232, 112, 144, 0.20)']} style={styles.bubbleUser}>
              <Text style={styles.bubbleTextUser}>{item.text}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.bubbleAiWrap}>
              <BlurView intensity={30} tint="light" style={styles.bubbleAi}>
                {item.text.length > 0 && <Text style={styles.bubbleTextAi}>{item.text}</Text>}
                
                {/* 🟢 RENDER THE VIEW STYLE BOARD BUTTON */}
                {item.boardIds ? (
                  <View style={{ marginTop: 8 }}>
                    <TouchableOpacity 
                      style={styles.boardLinkBtn}
                      onPress={() => router.push({ pathname: '/style-board', params: { ids: item.boardIds } })}
                    >
                      <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} start={{x:0, y:0}} end={{x:1, y:1}} />
                      <Feather name="layout" size={14} color="#fff" />
                      <Text style={styles.boardLinkBtnText}>View Style Board</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                
              </BlurView>
            </View>
          )}
          <Text style={styles.bubbleTime}>{item.time}</Text>
        </View>

        {isUser && (
          <View style={styles.bubbleAvatarUser}>
            <Feather name="user" size={14} color="#8070a8" />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>AHVI Chat</Text>
          <View style={styles.titleUnderline} />
          <Text style={styles.subtitle}>Your personal AI styling assistant</Text>
        </View>

        <View style={styles.occasionContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.occasionStrip}>
            {OCCASIONS.map((occ) => {
              const isActive = activeOccasion.name === occ.name;
              return (
                <TouchableOpacity 
                  key={occ.name} 
                  style={[styles.occTab, isActive && styles.occTabActive]}
                  onPress={() => setActiveOccasion(occ)}
                  activeOpacity={0.8}
                >
                  {isActive && (
                    <LinearGradient colors={['rgba(144, 96, 208, 0.22)', 'rgba(232, 112, 144, 0.16)']} style={StyleSheet.absoluteFillObject} />
                  )}
                  <Text style={{ fontSize: 13 }}>{occ.emoji}</Text>
                  <Text style={[styles.occTabText, isActive && styles.occTabTextActive]}>{occ.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.welcomeContainer}>
              <BlurView intensity={40} tint="light" style={styles.welcomeBox}>
                <Text style={styles.welcomeEmoji}>✨</Text>
                <Text style={styles.welcomeTitle}>Ready to style!</Text>
                <Text style={styles.welcomeDesc}>
                  I'm here to help you put together the perfect {activeOccasion.name.toLowerCase()} look. Just tell me what you have in mind.
                </Text>
              </BlurView>
              
              <View style={styles.chipsWrap}>
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <TouchableOpacity key={idx} style={styles.promptChip} onPress={() => handleSend(prompt)}>
                    <Text style={styles.promptChipText}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          ListFooterComponent={
            isTyping ? (
              <View style={[styles.bubbleRow, styles.bubbleRowAi]}>
                <View style={styles.bubbleAvatarAi}>
                  <Text style={{ fontSize: 14 }}>{activeOccasion.emoji}</Text>
                </View>
                <BlurView intensity={30} tint="light" style={styles.typingBubble}>
                  <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1 }] }]} />
                  <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2 }] }]} />
                  <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3 }] }]} />
                </BlurView>
              </View>
            ) : null
          }
        />

        <View style={styles.inputContainer}>
          <BlurView intensity={50} tint="light" style={styles.inputInner}>
            <TextInput
              style={styles.inputField}
              placeholder={`Ask AHVI about ${activeOccasion.name}...`}
              placeholderTextColor="#a0a0a0"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={200}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
              onPress={() => handleSend()}
              disabled={!inputText.trim()}
            >
              <LinearGradient colors={['#9060d0', '#e87090']} style={StyleSheet.absoluteFillObject} start={{x:0, y:0}} end={{x:1, y:1}} />
              <Feather name="arrow-up" size={18} color="#fff" />
            </TouchableOpacity>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  title: { fontFamily: 'System', fontSize: 28, fontWeight: '700', color: '#000000', letterSpacing: -0.3 },
  titleUnderline: { height: 2.5, width: 36, borderRadius: 4, marginTop: 5, backgroundColor: '#9060d0' },
  subtitle: { color: '#8070a8', fontSize: 13, marginTop: 5 },
  occasionContainer: { height: 45, marginBottom: 10 },
  occasionStrip: { paddingHorizontal: 20, alignItems: 'center', gap: 8 },
  occTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 50, backgroundColor: 'rgba(255, 255, 255, 0.45)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.6)', overflow: 'hidden' },
  occTabActive: { borderColor: 'rgba(180, 140, 220, 0.6)', shadowColor: '#9060d0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 2 },
  occTabText: { fontSize: 12.5, fontWeight: '600', color: '#8070a8' },
  occTabTextActive: { color: '#3a2050' },
  messagesContent: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 100 },
  welcomeContainer: { alignItems: 'center', marginTop: 20 },
  welcomeBox: { width: '100%', padding: 20, borderRadius: 22, alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.4)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.6)', marginBottom: 20 },
  welcomeEmoji: { fontSize: 38, marginBottom: 10 },
  welcomeTitle: { fontSize: 17, fontWeight: '700', color: '#000000', marginBottom: 5 },
  welcomeDesc: { fontSize: 12.5, color: '#8070a8', textAlign: 'center', lineHeight: 18 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  promptChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 50, backgroundColor: 'rgba(255, 255, 255, 0.5)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.7)' },
  promptChipText: { fontSize: 12, fontWeight: '500', color: '#3a2050' },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, gap: 8 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAi: { justifyContent: 'flex-start' },
  bubbleWrap: { maxWidth: '82%' }, 
  bubbleUser: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 18, borderBottomRightRadius: 5, borderWidth: 1, borderColor: 'rgba(180, 140, 220, 0.42)' },
  bubbleTextUser: { fontSize: 13.5, color: '#3a2050', lineHeight: 20 },
  bubbleAvatarUser: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.6)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.8)', alignItems: 'center', justifyContent: 'center' },
  bubbleAiWrap: { borderRadius: 18, borderBottomLeftRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.7)' },
  bubbleAi: { paddingVertical: 12, paddingHorizontal: 15, backgroundColor: 'rgba(255, 255, 255, 0.6)' },
  bubbleTextAi: { fontSize: 13.5, color: '#3a2050', lineHeight: 20, marginBottom: 8 },
  bubbleAvatarAi: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.6)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.8)', alignItems: 'center', justifyContent: 'center' },
  
  // 🟢 NEW: BOARDS BUTTON STYLE
  boardLinkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 100, overflow: 'hidden', shadowColor: '#7850B4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  boardLinkBtnText: { fontSize: 12, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  bubbleTime: { fontSize: 10, color: '#b8aed0', marginTop: 4, paddingHorizontal: 4 },
  typingBubble: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 18, borderBottomLeftRadius: 5, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255, 255, 255, 0.6)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.7)' },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9060d0' },
  inputContainer: { position: 'absolute', bottom: 90, left: 0, right: 0, paddingHorizontal: 18 },
  inputInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.7)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 22, paddingVertical: 6, paddingLeft: 16, paddingRight: 6, shadowColor: '#502878', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5, overflow: 'hidden' },
  inputField: { flex: 1, minHeight: 36, maxHeight: 100, fontFamily: 'System', fontSize: 14, color: '#3a2050', paddingTop: 8, paddingBottom: 8 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 8, overflow: 'hidden' },
});