import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

// ── TYPES & MOCK DATA ──
const DAY_ROUTINE = ['Cleanser', 'Toner', 'Serum', 'Moisturizer', 'Sunscreen'];
const NIGHT_ROUTINE = ['Cleanser', 'Toner', 'Treatment Serum', 'Night Cream', 'Lip Care'];
const SKIN_TYPES = ['Oily', 'Dry', 'Normal', 'Combo', 'Sensitive'];
const CONCERNS = ['Acne', 'Pigmentation', 'Aging', 'Dullness'];

const STEP_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Cleanser': 'water-outline',
  'Toner': 'color-filter-outline',
  'Serum': 'flask-outline',
  'Moisturizer': 'leaf-outline',
  'Sunscreen': 'sunny-outline',
  'Treatment Serum': 'medical-outline',
  'Night Cream': 'moon-outline',
  'Lip Care': 'happy-outline'
};

const SKIN_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Oily': 'water-outline',
  'Dry': 'sunny-outline',
  'Normal': 'happy-outline',
  'Combo': 'apps-outline',
  'Sensitive': 'heart-half-outline'
};

export default function Skincare() {
  const router = useRouter();

  // ── STATE ──
  const [isNight, setIsNight] = useState(false);
  const [skinType, setSkinType] = useState<string | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [completedDay, setCompletedDay] = useState<string[]>([]);
  const [completedNight, setCompletedNight] = useState<string[]>([]);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([
    { id: '1', role: 'ai', text: "Hi! I'm your AHVI skincare advisor ✦\n\nI can help with routines, ingredients, skin concerns and product recommendations. What's your skin type, and what would you like to improve?" }
  ]);

  // ── ANIMATIONS ──
  const toggleAnim = useRef(new Animated.Value(0)).current; // 0 = Day, 1 = Night
  const skinSliderAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Day/Night Toggle Animation
  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: isNight ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 50,
    }).start();
  }, [isNight]);

  const toggleThumbLeft = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 31]
  });

  // Skin Type Slider Animation
  const handleSkinTypeSelect = (type: string, index: number) => {
    setSkinType(type);
    Animated.spring(skinSliderAnim, {
      toValue: index,
      useNativeDriver: false,
      friction: 8,
      tension: 50,
    }).start();
  };

  const skinSliderLeft = skinSliderAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: ['0%', '20%', '40%', '60%', '80%']
  });

  // Progress Bar Animation
  const currentRoutine = isNight ? NIGHT_ROUTINE : DAY_ROUTINE;
  const currentCompleted = isNight ? completedNight : completedDay;
  const progressPct = Math.round((currentCompleted.length / currentRoutine.length) * 100) || 0;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPct,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progressPct]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  // ── LOGIC ──
  const toggleConcern = (c: string) => {
    setConcerns(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const toggleStep = (step: string) => {
    if (isNight) {
      setCompletedNight(prev => prev.includes(step) ? prev.filter(s => s !== step) : [...prev, step]);
    } else {
      setCompletedDay(prev => prev.includes(step) ? prev.filter(s => s !== step) : [...prev, step]);
    }
  };

  const handleSendChat = (presetMsg?: string) => {
    const text = presetMsg || chatInput.trim();
    if (!text) return;

    setChatMsgs(prev => [...prev, { id: Date.now().toString(), role: 'user', text }]);
    setChatInput('');
    Keyboard.dismiss();
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const responses = [
        "For oily skin, a lightweight niacinamide serum is transformative — it regulates sebum and minimises pores. 💧",
        "Always apply SPF last in your morning routine, and reapply every 2 hours if outdoors! ☀️",
        "Retinol is best introduced gradually — start with a low concentration 2× per week at night. 🌙"
      ];
      const aiMsg = { id: (Date.now()+1).toString(), role: 'ai', text: responses[Math.floor(Math.random() * responses.length)] };
      setChatMsgs(prev => [...prev, aiMsg]);
    }, 1500);
  };

  // ── DYNAMIC INFO TEXT ──
  const getInfoText = () => {
    if (!skinType) return { msg: 'Select your skin type to personalise your routine', color: '#c880a8' };
    if (concerns.length === 0) return { msg: `${skinType} skin · ${isNight ? 'Night' : 'Day'} routine · Pick concerns`, color: '#666' };
    if (currentCompleted.length === 0) return { msg: `${skinType} · ${concerns.join(', ')} · Tap a step to start`, color: '#b96080' };
    if (currentCompleted.length < currentRoutine.length) return { msg: `${progressPct}% done · ${currentRoutine.length - currentCompleted.length} steps left`, color: '#c48848' };
    return { msg: `All done! Great ${isNight ? 'night' : 'day'} routine 🎉`, color: '#3a9a7a' };
  };
  const infoData = getInfoText();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── BACKGROUND SCENE ── */}
      <LinearGradient colors={['#fde8e0', '#fad8ec', '#ead0f5', '#d8ccf0', '#ccc8ee']} style={StyleSheet.absoluteFillObject} />
      
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={20} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Skincare</Text>
          <Text style={styles.headerSub}>Your personalised ritual ✨</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ── ROUTINE TOGGLE ── */}
        <View style={styles.section}>
          <View style={styles.secLabel}><Ionicons name="time-outline" size={12} color="#c880a8" /><Text style={styles.secLabelTxt}>ROUTINE</Text></View>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLbl, !isNight && styles.toggleLblActive]}>☀️ Day</Text>
            <TouchableOpacity activeOpacity={0.9} style={styles.toggleTrack} onPress={() => setIsNight(!isNight)}>
              <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: toggleAnim }]}>
                <LinearGradient colors={['rgba(220, 130, 150, 0.38)', 'rgba(180, 80, 110, 0.32)']} style={StyleSheet.absoluteFillObject} />
              </Animated.View>
              <Animated.View style={[styles.toggleThumb, { left: toggleThumbLeft }]}>
                <Text style={{fontSize: 10}}>{isNight ? '🌙' : '☀️'}</Text>
              </Animated.View>
            </TouchableOpacity>
            <Text style={[styles.toggleLbl, isNight && styles.toggleLblActive]}>🌙 Night</Text>
          </View>
        </View>

        {/* ── SKIN TYPE ── */}
        <View style={styles.section}>
          <View style={styles.secLabel}><Ionicons name="water-outline" size={12} color="#c880a8" /><Text style={styles.secLabelTxt}>SKIN TYPE</Text></View>
          <BlurView intensity={40} tint="light" style={styles.skinBar}>
            {skinType && (
              <Animated.View style={[styles.skinSlider, { left: skinSliderLeft }]}>
                <LinearGradient colors={['rgba(244, 168, 184, 0.7)', 'rgba(232, 133, 122, 0.65)']} style={StyleSheet.absoluteFillObject} />
              </Animated.View>
            )}
            {SKIN_TYPES.map((type, idx) => {
              const isActive = skinType === type;
              return (
                <TouchableOpacity key={type} style={styles.skinBtn} onPress={() => handleSkinTypeSelect(type, idx)}>
                  <Ionicons name={SKIN_ICONS[type]} size={16} color={isActive ? '#c880a8' : '#666'} style={isActive && {transform: [{scale: 1.15}]}} />
                  <Text style={[styles.skinBtnTxt, isActive && styles.skinBtnTxtActive]}>{type}</Text>
                </TouchableOpacity>
              );
            })}
          </BlurView>
        </View>

        {/* ── CONCERNS ── */}
        <View style={styles.section}>
          <View style={styles.secLabel}><Ionicons name="sparkles-outline" size={12} color="#c880a8" /><Text style={styles.secLabelTxt}>CONCERN</Text></View>
          <View style={styles.pillContainer}>
            {CONCERNS.map(c => {
              const isActive = concerns.includes(c);
              return (
                <TouchableOpacity key={c} style={[styles.pill, isActive && styles.pillActive]} onPress={() => toggleConcern(c)}>
                  {isActive && <LinearGradient colors={['rgba(244, 168, 184, 0.55)', 'rgba(232, 133, 122, 0.50)']} style={StyleSheet.absoluteFillObject} />}
                  <Text style={[styles.pillTxt, isActive && styles.pillTxtActive]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── INFO TAG ── */}
        <View style={styles.infoTag}>
          <Ionicons name="information-circle-outline" size={14} color={infoData.color} />
          <Text style={[styles.infoTxt, { color: infoData.color }]}>{infoData.msg}</Text>
        </View>

        {/* ── PROGRESS ── */}
        <View style={styles.section}>
          <View style={styles.progHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#c880a8" />
              <Text style={styles.progLabel}>Daily Progress</Text>
            </View>
            <Text style={styles.progPct}>{progressPct}%</Text>
          </View>
          <View style={styles.progTrack}>
            <Animated.View style={[styles.progFillWrap, { width: progressWidth }]}>
              <LinearGradient colors={['#d8a8d0', '#f0c0d8', '#f9c8c0']} style={StyleSheet.absoluteFillObject} start={{x:0, y:0}} end={{x:1, y:0}} />
            </Animated.View>
          </View>
        </View>

        {/* ── ROUTINE STEPS GRID ── */}
        <View style={styles.section}>
          <View style={styles.secLabel}><Ionicons name="list-outline" size={12} color="#c880a8" /><Text style={styles.secLabelTxt}>{isNight ? 'NIGHT ROUTINE' : 'DAY ROUTINE'}</Text></View>
          <View style={styles.stepsGrid}>
            {currentRoutine.map((step, idx) => {
              const isDone = currentCompleted.includes(step);
              const colorSchemes = [
                { bg: 'rgba(232, 245, 255, 0.45)', color: '#4a8eb8', border: 'rgba(180, 220, 255, 0.45)' },
                { bg: 'rgba(252, 232, 240, 0.45)', color: '#c880a8', border: 'rgba(244, 168, 190, 0.45)' },
                { bg: 'rgba(253, 232, 240, 0.45)', color: '#b96080', border: 'rgba(255, 190, 210, 0.45)' },
                { bg: 'rgba(224, 248, 241, 0.45)', color: '#3a9a7a', border: 'rgba(160, 230, 210, 0.45)' },
                { bg: 'rgba(254, 240, 224, 0.45)', color: '#b87838', border: 'rgba(255, 210, 160, 0.45)' }
              ];
              const scheme = colorSchemes[idx % colorSchemes.length];

              return (
                <TouchableOpacity 
                  key={step} 
                  activeOpacity={0.8}
                  onPress={() => toggleStep(step)}
                  style={[
                    styles.stepCard, 
                    { backgroundColor: scheme.bg, borderColor: scheme.border },
                    isDone && styles.stepCardDone
                  ]}
                >
                  {isDone && <LinearGradient colors={['#fce8e8', '#fce8f4']} style={StyleSheet.absoluteFillObject} />}
                  <View style={styles.stepIcoWrap}>
                    <Ionicons name={STEP_ICONS[step]} size={18} color={isDone ? '#c880a8' : scheme.color} />
                  </View>
                  <Text style={[styles.stepName, { color: isDone ? '#c880a8' : scheme.color }, isDone && { textDecorationLine: 'line-through', opacity: 0.7 }]}>
                    {step}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── TIP ── */}
        <BlurView intensity={20} tint="light" style={styles.tipBox}>
          <Ionicons name="heart-outline" size={16} color="#d8a8d0" />
          <Text style={styles.tipTxt}>Consistency is your best skincare ingredient</Text>
        </BlurView>

        {/* ── AI CHAT BUTTON ── */}
        <TouchableOpacity style={styles.chatTriggerBtn} activeOpacity={0.9} onPress={() => setIsChatOpen(true)}>
          <LinearGradient colors={['rgba(180, 130, 190, 0.18)', 'rgba(232, 133, 122, 0.14)']} style={StyleSheet.absoluteFillObject} />
          <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFillObject} />
          <View style={styles.chatTriggerPulse} />
          <View style={styles.chatTriggerAv}>
            <LinearGradient colors={['#c880a8', '#d0a0e0']} style={StyleSheet.absoluteFillObject} />
            <Text style={{color: '#fff', fontSize: 16, fontWeight: '700'}}>✦</Text>
            <View style={styles.chatTriggerDot} />
          </View>
          <View style={styles.chatTriggerTxtWrap}>
            <Text style={styles.chatTriggerTitle}>Ask AI Skincare Expert</Text>
            <Text style={styles.chatTriggerSub}>Get personalised advice</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#888" />
        </TouchableOpacity>

      </ScrollView>

      {/* ── CHAT DRAWER (MODAL) ── */}
      <Modal visible={isChatOpen} transparent animationType="slide" onRequestClose={() => setIsChatOpen(false)}>
        <View style={styles.chatOverlay}>
          <TouchableWithoutFeedback onPress={() => setIsChatOpen(false)}>
            <View style={{flex: 1}} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.chatDrawer}>
              <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFillObject} />
              <View style={styles.chatHandle} />
              
              <View style={styles.chatHead}>
                <View style={styles.chatHeadLeft}>
                  <View style={styles.chatHeadAv}>
                    <LinearGradient colors={['#c880a8', '#d0a0e0']} style={StyleSheet.absoluteFillObject} />
                    <Text style={{color: '#fff', fontSize: 16, fontWeight: '700'}}>✦</Text>
                  </View>
                  <View>
                    <Text style={styles.chatName}>AHVI Skincare</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                      <View style={styles.chatStatusDot} /><Text style={styles.chatSub}>Your AI skincare advisor</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.chatClose} onPress={() => setIsChatOpen(false)}>
                  <Feather name="x" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.chatMsgs} contentContainerStyle={{padding: 16, paddingBottom: 20}}>
                {chatMsgs.map((msg, i) => (
                  <View key={i} style={[styles.bubbleWrap, msg.role === 'ai' ? styles.bubbleAiWrap : styles.bubbleUsrWrap]}>
                    {msg.role === 'ai' && <View style={styles.bubbleAv}><Text style={{color: '#fff', fontSize: 12}}>✦</Text></View>}
                    <View style={[styles.bubble, msg.role === 'ai' ? styles.bubbleAi : styles.bubbleUsr]}>
                      {msg.role === 'user' && <LinearGradient colors={['#c880a8', '#d0a0e0']} style={StyleSheet.absoluteFillObject} />}
                      <Text style={[styles.bubbleText, msg.role === 'user' && {color: '#fff'}]}>{msg.text}</Text>
                    </View>
                  </View>
                ))}
                {isTyping && (
                  <View style={[styles.bubbleWrap, styles.bubbleAiWrap]}>
                    <View style={styles.bubbleAv}><Text style={{color: '#fff', fontSize: 12}}>✦</Text></View>
                    <View style={[styles.bubble, styles.bubbleAi, {flexDirection: 'row', gap: 5, paddingVertical: 14}]}>
                       <View style={styles.typingDot} /><View style={styles.typingDot} /><View style={styles.typingDot} />
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Quick Prompts */}
              {chatMsgs.length === 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickPrompts} contentContainerStyle={{paddingHorizontal: 16, gap: 8}}>
                  {['Best for oily skin? 💧', 'Morning routine order ☀️', 'Vitamin C tips 🍊', 'Retinol guide 🌙'].map(p => (
                    <TouchableOpacity key={p} style={styles.qpChip} onPress={() => handleSendChat(p)}>
                      <Text style={styles.qpTxt}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View style={styles.chatInputRow}>
                <TouchableOpacity style={styles.micBtn}>
                  <Feather name="mic" size={18} color="#c880a8" />
                </TouchableOpacity>
                <View style={styles.inputWrap}>
                  <TextInput 
                    style={styles.chatInput} 
                    placeholder="Ask about skincare..." 
                    placeholderTextColor="#888" 
                    value={chatInput} 
                    onChangeText={setChatInput}
                    multiline
                  />
                </View>
                <TouchableOpacity style={[styles.sendBtn, !chatInput.trim() && {opacity: 0.5}]} onPress={() => handleSendChat()} disabled={!chatInput.trim()}>
                  <LinearGradient colors={['#c880a8', '#d0a0e0']} style={StyleSheet.absoluteFillObject} />
                  <Feather name="send" size={16} color="#fff" style={{marginLeft: -2}} />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fde8e0' },
  
  // ── HEADER ──
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 32, fontWeight: '700', color: '#111', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#555', marginTop: 2 },

  scrollContent: { paddingHorizontal: 18, paddingBottom: 40, gap: 16 },

  // ── REUSABLE SECTION LABELS ──
  section: { gap: 8 },
  secLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  secLabelTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: '#555' },

  // ── ROUTINE TOGGLE ──
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  toggleLbl: { fontSize: 12, fontWeight: '600', color: '#555', minWidth: 50, textAlign: 'center' },
  toggleLblActive: { color: '#111' },
  toggleTrack: { width: 60, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', overflow: 'hidden' },
  toggleThumb: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },

  // ── SKIN TYPE BAR ──
  skinBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 16, padding: 3, position: 'relative', height: 60 },
  skinSlider: { position: 'absolute', top: 3, bottom: 3, width: '20%', borderRadius: 12, overflow: 'hidden' },
  skinBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, zIndex: 1, height: '100%' },
  skinBtnTxt: { fontSize: 10, fontWeight: '500', color: '#666' },
  skinBtnTxtActive: { color: '#111', fontWeight: '700' },

  // ── CONCERNS PILLS ──
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', overflow: 'hidden' },
  pillActive: { borderColor: 'rgba(255,255,255,0.7)' },
  pillTxt: { fontSize: 12, fontWeight: '500', color: '#555', zIndex: 1 },
  pillTxtActive: { color: '#111' },

  // ── INFO TAG ──
  infoTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  infoTxt: { fontSize: 11, fontWeight: '500' },

  // ── PROGRESS ──
  progHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progLabel: { fontSize: 11, color: '#555', fontWeight: '500' },
  progPct: { fontSize: 12, fontWeight: '700', color: '#c880a8' },
  progTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' },
  progFillWrap: { height: '100%', borderRadius: 4, overflow: 'hidden' },

  // ── STEPS GRID ──
  stepsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stepCard: { width: (width - 46) / 2, paddingVertical: 14, alignItems: 'center', borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  stepCardDone: { borderColor: 'rgba(232, 133, 122, 0.8)' },
  stepIcoWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stepName: { fontSize: 12, fontWeight: '600' },

  // ── TIP ──
  tipBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', marginTop: 10 },
  tipTxt: { fontSize: 12, color: '#555', fontWeight: '500' },

  // ── CHAT TRIGGER ──
  chatTriggerBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(220, 140, 160, 0.4)', marginTop: 10, overflow: 'hidden' },
  chatTriggerPulse: { position: 'absolute', inset: -2, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(180, 130, 190, 0.3)' },
  chatTriggerAv: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  chatTriggerDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#6dd8b8', borderWidth: 2, borderColor: '#fff' },
  chatTriggerTxtWrap: { flex: 1 },
  chatTriggerTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  chatTriggerSub: { fontSize: 11, color: '#555', marginTop: 2 },

  // ── CHAT MODAL ──
  chatOverlay: { flex: 1, backgroundColor: 'rgba(120,40,60,0.25)', justifyContent: 'flex-end' },
  chatDrawer: { height: height * 0.8, backgroundColor: 'rgba(252,235,232,0.85)', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden' },
  chatHandle: { width: 40, height: 4, backgroundColor: 'rgba(220,150,160,0.3)', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  chatHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(220,140,160,0.15)' },
  chatHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chatHeadAv: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  chatName: { fontSize: 18, fontWeight: '700', color: '#111' },
  chatSub: { fontSize: 11, color: '#555' },
  chatStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6dd8b8' },
  chatClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
  
  chatMsgs: { flex: 1 },
  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 },
  bubbleAiWrap: { justifyContent: 'flex-start' },
  bubbleUsrWrap: { justifyContent: 'flex-end' },
  bubbleAv: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#c880a8', alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 18, overflow: 'hidden' },
  bubbleAi: { backgroundColor: 'rgba(255,255,255,0.7)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  bubbleUsr: { borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: '#111', lineHeight: 20 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(180,130,190,0.6)' },

  quickPrompts: { paddingBottom: 10 },
  qpChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)' },
  qpTxt: { fontSize: 12, fontWeight: '600', color: '#c880a8' },

  chatInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(220,150,160,0.15)', backgroundColor: 'rgba(255,255,255,0.15)' },
  micBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 4, minHeight: 44, justifyContent: 'center' },
  chatInput: { fontSize: 14, color: '#111', paddingTop: 8, paddingBottom: 8 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }
});