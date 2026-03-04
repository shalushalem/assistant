import React, { useState, useEffect, useRef } from 'react';
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
type Category = 'Health' | 'Relationships' | 'Career' | 'Learning' | 'Finance' | 'Creativity' | 'Mindfulness' | 'Purpose';

interface Goal {
  id: string;
  title: string;
  desc: string;
  cat: Category;
  progress: number;
  color: string;
  bgColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  reminder?: { freq: string; time: string; day?: string; note?: string };
}

const CATEGORIES: { label: Category; icon: keyof typeof Ionicons.glyphMap; emoji: string }[] = [
  { label: 'Health', icon: 'fitness-outline', emoji: '🌿' },
  { label: 'Relationships', icon: 'people-outline', emoji: '💞' },
  { label: 'Career', icon: 'briefcase-outline', emoji: '💼' },
  { label: 'Learning', icon: 'book-outline', emoji: '📚' },
  { label: 'Finance', icon: 'wallet-outline', emoji: '💰' },
  { label: 'Creativity', icon: 'color-palette-outline', emoji: '🎨' },
  { label: 'Mindfulness', icon: 'leaf-outline', emoji: '🧘' },
  { label: 'Purpose', icon: 'planet-outline', emoji: '✨' },
];

const COLORS = ['#c9a84c', '#7a9e7e', '#c4714a', '#6a8caf', '#a07bbf', '#2d6a4f'];
const COLOR_BGS = ['#fdf7e8', '#f0f7f0', '#fef0eb', '#eef3fb', '#f5f0fb', '#e8f4ee'];

const AI_SUGGESTIONS = [
  { title: 'Gratitude Journal', desc: "Write 3 things you're grateful for each evening.", cat: 'Mindfulness', icon: 'book-outline', colorIdx: 0 },
  { title: 'Learn Cooking', desc: 'Master 10 simple healthy recipes at home.', cat: 'Health', icon: 'restaurant-outline', colorIdx: 1 },
  { title: 'Emergency Fund', desc: 'Save 3 months of expenses as a safety net.', cat: 'Finance', icon: 'wallet-outline', colorIdx: 2 },
  { title: 'Digital Detox', desc: 'Spend Sunday mornings fully offline.', cat: 'Mindfulness', icon: 'wifi-outline', colorIdx: 3 },
];

// ── CUSTOM GOAL CARD COMPONENT ──
const GoalCard = ({ goal, onUpdateProgress, onDelete, onOpenReminder }: any) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: goal.progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [goal.progress]);

  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={[styles.goalCard, { borderLeftColor: goal.color }]}>
      <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFillObject} />
      
      <View style={styles.cardTop}>
        <View style={[styles.cardIcoWrap, { backgroundColor: goal.bgColor }]}>
          <Ionicons name={goal.icon} size={20} color={goal.color} />
        </View>
        <TouchableOpacity style={styles.cardDelBtn} onPress={() => onDelete(goal.id)}>
          <Feather name="trash-2" size={14} color="#d4547a" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.goalTitle}>{goal.title}</Text>
      {goal.desc ? <Text style={styles.goalDesc}>{goal.desc}</Text> : null}
      
      <View style={styles.progBarBg}>
        <Animated.View style={[styles.progBarFillWrap, { width: widthInterpolated }]}>
          <LinearGradient colors={['#d4547a', '#b06ab3']} style={StyleSheet.absoluteFillObject} start={{x:0, y:0}} end={{x:1, y:0}} />
        </Animated.View>
      </View>
      
      <View style={styles.progRow}>
        <Text style={styles.progLabel}>{goal.progress}% complete</Text>
        <TextInput 
          style={styles.progInput} 
          keyboardType="numeric" 
          value={String(goal.progress)} 
          onChangeText={(val) => onUpdateProgress(goal.id, parseInt(val) || 0)}
          maxLength={3}
        />
      </View>

      <View style={styles.catTag}>
        <Ionicons name={CATEGORIES.find(c => c.label === goal.cat)?.icon || 'pricetag-outline'} size={10} color="#666" />
        <Text style={styles.catTagText}>{goal.cat}</Text>
      </View>

      {goal.reminder ? (
        <TouchableOpacity style={styles.remBtnEdit} onPress={() => onOpenReminder(goal)}>
          <Feather name="bell" size={12} color="#8a6820" />
          <Text style={styles.remBtnEditText}>{goal.reminder.freq} · {goal.reminder.time}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.remBtnAdd} onPress={() => onOpenReminder(goal)}>
          <Feather name="bell" size={12} color="#666" />
          <Text style={styles.remBtnAddText}>Set Reminder</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function LifeGoals() {
  const router = useRouter();

  // ── STATE ──
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeFilter, setActiveFilter] = useState<Category | 'All'>('All');
  
  // Add Goal Form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState<Category>('Health');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  
  // Modals
  const [activeGoalForRem, setActiveGoalForRem] = useState<Goal | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMsgs, setChatMsgs] = useState([{ id: '1', role: 'ai', text: "Hey! 👋 I'm AHVI, your AI life coach. Ask me about goals, motivation, or what to focus on next." }]);

  // ── ACTIONS ──
  const handleAddGoal = () => {
    if (!newTitle.trim()) return;
    const colorIdx = goals.length % COLORS.length;
    const catData = CATEGORIES.find(c => c.label === newCat);
    
    const newGoal: Goal = {
      id: Date.now().toString(),
      title: newTitle,
      desc: newDesc,
      cat: newCat,
      progress: 0,
      color: COLORS[colorIdx],
      bgColor: COLOR_BGS[colorIdx],
      icon: catData?.icon || 'star-outline'
    };
    
    setGoals([newGoal, ...goals]);
    setNewTitle('');
    setNewDesc('');
    Keyboard.dismiss();
  };

  const handleQuickAdd = (sugg: typeof AI_SUGGESTIONS[0]) => {
    const newGoal: Goal = {
      id: Date.now().toString(),
      title: sugg.title,
      desc: sugg.desc,
      cat: sugg.cat as Category,
      progress: 0,
      color: COLORS[sugg.colorIdx],
      bgColor: COLOR_BGS[sugg.colorIdx],
      icon: sugg.icon as any
    };
    setGoals([newGoal, ...goals]);
  };

  const handleUpdateProgress = (id: string, val: number) => {
    const safeVal = Math.max(0, Math.min(100, val));
    setGoals(prev => prev.map(g => g.id === id ? { ...g, progress: safeVal } : g));
  };

  const handleDelete = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = { id: Date.now().toString(), role: 'user', text: chatInput };
    setChatMsgs(prev => [...prev, userMsg]);
    setChatInput('');
    
    setTimeout(() => {
      const aiMsg = { id: (Date.now()+1).toString(), role: 'ai', text: "Consistency beats intensity every time. Small daily actions compound into massive change!" };
      setChatMsgs(prev => [...prev, aiMsg]);
    }, 1000);
  };

  const filteredGoals = activeFilter === 'All' ? goals : goals.filter(g => g.cat === activeFilter);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── COMPLEX BACKGROUND ── */}
      <LinearGradient colors={['#fce4ec', '#f8bbd0', '#e8c5e8', '#d4b8f0', '#c8c8f8']} style={StyleSheet.absoluteFillObject} />

      {/* ── TOP NAV BAR ── */}
      <BlurView intensity={60} tint="light" style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={20} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}><Ionicons name="compass-outline" size={16} color="#d4547a" /></View>
          <Text style={styles.navTitle}>Life Goals</Text>
        </View>
        <View style={{ width: 40 }} />
      </BlurView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ── ADD PANEL ── */}
        <View style={styles.addPanelWrapper}>
          <BlurView intensity={40} tint="light" style={styles.addPanel}>
            <View style={styles.addPanelHeader}>
              <Ionicons name="add-circle-outline" size={20} color="#d4547a" />
              <Text style={styles.addPanelTitle}>Add a New Goal</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>GOAL TITLE *</Text>
              <TextInput style={styles.input} placeholder="e.g. Run a 5K, Read 12 books…" placeholderTextColor="#888" value={newTitle} onChangeText={setNewTitle} />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} placeholder="Why does this goal matter to you?" placeholderTextColor="#888" value={newDesc} onChangeText={setNewDesc} multiline />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <TouchableOpacity style={styles.catTrigger} onPress={() => setIsCatDropdownOpen(true)}>
                <Text style={{fontSize: 16}}>{CATEGORIES.find(c => c.label === newCat)?.emoji}</Text>
                <Text style={styles.catTriggerText}>{newCat}</Text>
                <Feather name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.formBtns}>
              <TouchableOpacity style={styles.btnClear} onPress={() => { setNewTitle(''); setNewDesc(''); }}>
                <Text style={styles.btnClearText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnAdd} onPress={handleAddGoal}>
                <LinearGradient colors={['#d4547a', '#b06ab3']} style={StyleSheet.absoluteFillObject} start={{x:0, y:0}} end={{x:1, y:1}} />
                <Feather name="check" size={16} color="#fff" />
                <Text style={styles.btnAddText}>Save Goal</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>

        {/* ── MY GOALS LIST ── */}
        <View style={styles.secHeader}>
          <Text style={styles.secTitle}>My Goals</Text>
          <Text style={styles.secMeta}>{goals.length} goals</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
          <TouchableOpacity style={[styles.filterChip, activeFilter === 'All' && styles.filterChipOn]} onPress={() => setActiveFilter('All')}>
            <Text style={[styles.filterText, activeFilter === 'All' && styles.filterTextOn]}>All</Text>
          </TouchableOpacity>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.label} style={[styles.filterChip, activeFilter === cat.label && styles.filterChipOn]} onPress={() => setActiveFilter(cat.label)}>
              <Text style={[styles.filterText, activeFilter === cat.label && styles.filterTextOn]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.goalsGrid}>
          {filteredGoals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="leaf-outline" size={48} color="rgba(255,255,255,0.6)" />
              <Text style={styles.emptyTitle}>No goals yet</Text>
              <Text style={styles.emptySub}>Add your first goal above or pick from AI suggestions below.</Text>
            </View>
          ) : (
            filteredGoals.map(goal => (
              <GoalCard 
                key={goal.id} 
                goal={goal} 
                onUpdateProgress={handleUpdateProgress} 
                onDelete={handleDelete}
                onOpenReminder={() => {}} // Stubbed out for brevity, can connect later
              />
            ))
          )}
        </View>

        {/* ── AI SUGGESTIONS ── */}
        <View style={styles.secHeader}>
          <Text style={styles.secTitle}>AI Suggestions</Text>
          <Text style={styles.secMeta}>TAP TO ADD</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggScroll} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
          {AI_SUGGESTIONS.map((sugg, idx) => (
            <TouchableOpacity key={idx} style={styles.suggCard} onPress={() => handleQuickAdd(sugg)} activeOpacity={0.9}>
              <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFillObject} />
              <View style={[styles.suggIco, { backgroundColor: COLOR_BGS[sugg.colorIdx] }]}>
                <Ionicons name={sugg.icon as any} size={20} color={COLORS[sugg.colorIdx]} />
              </View>
              <Text style={styles.suggTitle}>{sugg.title}</Text>
              <Text style={styles.suggDesc} numberOfLines={2}>{sugg.desc}</Text>
              <View style={styles.suggTag}><Text style={styles.suggTagText}>{sugg.cat}</Text></View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={{height: 40}} />
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => setIsChatOpen(true)}>
        <BlurView intensity={60} tint="light" style={styles.fabInner}>
          <Ionicons name="sparkles" size={16} color="#d4547a" />
          <Text style={styles.fabText}>AHVI</Text>
          <View style={styles.fabDot} />
        </BlurView>
      </TouchableOpacity>

      {/* ── CHAT DRAWER (MODAL) ── */}
      <Modal visible={isChatOpen} transparent animationType="slide" onRequestClose={() => setIsChatOpen(false)}>
        <View style={styles.chatOverlay}>
          <TouchableWithoutFeedback onPress={() => setIsChatOpen(false)}>
            <View style={{flex: 1}} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.chatDrawer}>
              <View style={styles.chatHandle} />
              <View style={styles.chatHead}>
                <View style={styles.chatHeadLeft}>
                  <LinearGradient colors={['#d4547a', '#b06ab3']} style={styles.chatAvatar}>
                    <Text style={{color: '#fff', fontSize: 12, fontWeight: '700'}}>AH</Text>
                  </LinearGradient>
                  <View>
                    <Text style={styles.chatName}>AHVI</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                      <View style={styles.chatDot} /><Text style={styles.chatSub}>Your AI Life Coach</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.chatClose} onPress={() => setIsChatOpen(false)}>
                  <Feather name="x" size={18} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.chatMsgs} contentContainerStyle={{padding: 16, paddingBottom: 20}}>
                {chatMsgs.map((msg, i) => (
                  <View key={i} style={[styles.bubble, msg.role === 'ai' ? styles.bubbleAi : styles.bubbleUser]}>
                    {msg.role === 'user' && <LinearGradient colors={['#e8857a', '#d07090']} style={StyleSheet.absoluteFillObject} />}
                    <Text style={[styles.bubbleText, msg.role === 'user' && {color: '#fff'}]}>{msg.text}</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.chatInputRow}>
                <TextInput 
                  style={styles.chatInput} 
                  placeholder="Ask me anything..." 
                  placeholderTextColor="#888" 
                  value={chatInput} 
                  onChangeText={setChatInput}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleSendChat} disabled={!chatInput.trim()}>
                  <LinearGradient colors={['#e8857a', '#d07090']} style={StyleSheet.absoluteFillObject} />
                  <Feather name="send" size={16} color="#fff" style={{marginLeft: -2}} />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── CATEGORY PICKER MODAL ── */}
      <Modal visible={isCatDropdownOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsCatDropdownOpen(false)}>
          <View style={styles.catModalOverlay}>
            <View style={styles.catModalBox}>
              <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFillObject} />
              <ScrollView>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity 
                    key={cat.label} 
                    style={[styles.catModalOpt, newCat === cat.label && styles.catModalOptActive]}
                    onPress={() => { setNewCat(cat.label); setIsCatDropdownOpen(false); }}
                  >
                    <Text style={{fontSize: 18}}>{cat.emoji}</Text>
                    <Text style={[styles.catModalOptText, newCat === cat.label && {color: '#b03050', fontWeight: '700'}]}>{cat.label}</Text>
                    {newCat === cat.label && <Feather name="check" size={16} color="#b03050" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fce4ec' },
  
  // ── NAV BAR ──
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.5)', zIndex: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.45)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
  navTitle: { fontSize: 18, fontWeight: '700', color: '#111' },

  scrollContent: { padding: 16, paddingBottom: 100 },

  // ── ADD PANEL ──
  addPanelWrapper: { borderRadius: 20, overflow: 'hidden', marginBottom: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', shadowColor: '#b46496', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 32, elevation: 5 },
  addPanel: { padding: 18, backgroundColor: 'rgba(255,255,255,0.45)' },
  addPanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  addPanelTitle: { fontSize: 18, fontWeight: '600', color: '#111' },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#555', letterSpacing: 1, marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)', borderRadius: 12, padding: 14, fontSize: 14, color: '#111' },
  catTrigger: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)', borderRadius: 12, padding: 14 },
  catTriggerText: { flex: 1, fontSize: 14, color: '#111', fontWeight: '500' },
  formBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btnClear: { paddingVertical: 14, paddingHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 14 },
  btnClearText: { color: '#555', fontWeight: '600', fontSize: 14 },
  btnAdd: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, overflow: 'hidden' },
  btnAddText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // ── SECTIONS & FILTERS ──
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.5)', paddingBottom: 10, marginBottom: 16 },
  secTitle: { fontSize: 22, fontWeight: '600', color: '#111' },
  secMeta: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1 },
  filterScroll: { marginBottom: 18 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  filterChipOn: { backgroundColor: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.9)' },
  filterText: { fontSize: 13, color: '#444', fontWeight: '600' },
  filterTextOn: { color: '#111' },

  // ── GOALS GRID ──
  goalsGrid: { gap: 14, marginBottom: 36 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111', marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#555', textAlign: 'center', paddingHorizontal: 20 },
  
  goalCard: { backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 20, padding: 16, overflow: 'hidden', borderLeftWidth: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardIcoWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardDelBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(224,112,96,0.12)', alignItems: 'center', justifyContent: 'center' },
  goalTitle: { fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 4 },
  goalDesc: { fontSize: 13, color: '#555', marginBottom: 12, lineHeight: 18 },
  progBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 },
  progBarFillWrap: { height: '100%', borderRadius: 10, overflow: 'hidden' },
  progRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progLabel: { fontSize: 12, fontWeight: '600', color: '#555' },
  progInput: { width: 54, textAlign: 'center', paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 8, fontSize: 13, color: '#111', fontWeight: '600' },
  catTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.4)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, marginBottom: 12 },
  catTagText: { fontSize: 11, fontWeight: '700', color: '#555', textTransform: 'uppercase' },
  remBtnEdit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(201,168,76,0.12)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)', paddingVertical: 10, borderRadius: 10 },
  remBtnEditText: { color: '#8a6820', fontSize: 12, fontWeight: '600' },
  remBtnAdd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(220,120,140,0.35)', paddingVertical: 10, borderRadius: 10 },
  remBtnAddText: { color: '#666', fontSize: 12, fontWeight: '600' },

  // ── AI SUGGESTIONS ──
  suggScroll: { paddingBottom: 10 },
  suggCard: { width: 195, padding: 16, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 18, overflow: 'hidden' },
  suggIco: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  suggTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 5 },
  suggDesc: { fontSize: 12, color: '#555', lineHeight: 16, marginBottom: 10 },
  suggTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(220,120,140,0.2)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  suggTagText: { fontSize: 10, fontWeight: '700', color: '#c04060', textTransform: 'uppercase' },

  // ── FAB ──
  fab: { position: 'absolute', bottom: 30, right: 16, borderRadius: 25, overflow: 'hidden', shadowColor: '#d4547a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  fabInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, height: 50, backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
  fabText: { fontSize: 14, fontWeight: '700', color: '#111', letterSpacing: 1 },
  fabDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#b06ab3', marginLeft: 2 },

  // ── CHAT MODAL ──
  chatOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  chatDrawer: { height: height * 0.6, backgroundColor: 'rgba(255,255,255,0.97)', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 20 },
  chatHandle: { width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 10 },
  chatHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(220,120,140,0.15)' },
  chatHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chatAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  chatName: { fontSize: 15, fontWeight: '700', color: '#111' },
  chatSub: { fontSize: 11, color: '#666' },
  chatDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#b06ab3' },
  chatClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  chatMsgs: { flex: 1 },
  bubble: { maxWidth: '82%', padding: 12, borderRadius: 18, marginBottom: 10, overflow: 'hidden' },
  bubbleAi: { alignSelf: 'flex-start', backgroundColor: 'rgba(240,240,240,0.8)', borderBottomLeftRadius: 4 },
  bubbleUser: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: '#111', lineHeight: 20 },
  chatInputRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 },
  chatInput: { flex: 1, backgroundColor: 'rgba(240,240,240,0.8)', borderWidth: 1, borderColor: 'rgba(220,120,140,0.3)', borderRadius: 24, paddingHorizontal: 16, height: 44, color: '#111' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  // ── CATEGORY MODAL ──
  catModalOverlay: { flex: 1, justifyContent: 'center', padding: 40, backgroundColor: 'rgba(0,0,0,0.3)' },
  catModalBox: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, overflow: 'hidden', maxHeight: 400, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  catModalOpt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)' },
  catModalOptActive: { backgroundColor: 'rgba(220,120,140,0.15)' },
  catModalOptText: { flex: 1, fontSize: 15, color: '#111', fontWeight: '500' }
});