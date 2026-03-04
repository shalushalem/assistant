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
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// ── TYPES & MOCK DATA ──
type Tab = 'stats' | 'plans' | 'chat';

const ACTIVITY_STATS = [
  { id: 'cal', label: 'Move', current: 420, target: 600, unit: 'kcal', colors: ['#ff6b6b', '#ff8e8e'] as const },
  { id: 'steps', label: 'Steps', current: 6500, target: 10000, unit: 'steps', colors: ['#4ecdc4', '#7ae5df'] as const },
  { id: 'water', label: 'Hydration', current: 5, target: 8, unit: 'glasses', colors: ['#45b7d1', '#72cce3'] as const },
];

const WORKOUTS = [
  { id: '1', title: 'Morning Flow', duration: '20 min', type: 'Yoga', icon: 'body-outline', colors: ['rgba(184, 160, 232, 0.6)', 'rgba(155, 127, 212, 0.4)'] as const },
  { id: '2', title: 'HIIT Core', duration: '15 min', type: 'Cardio', icon: 'flame-outline', colors: ['rgba(255, 107, 107, 0.6)', 'rgba(255, 142, 142, 0.4)'] as const },
  { id: '3', title: 'Evening Stretch', duration: '10 min', type: 'Recovery', icon: 'moon-outline', colors: ['rgba(69, 183, 209, 0.6)', 'rgba(114, 204, 227, 0.4)'] as const },
  { id: '4', title: 'Leg Day', duration: '45 min', type: 'Strength', icon: 'barbell-outline', colors: ['rgba(255, 184, 184, 0.6)', 'rgba(255, 200, 200, 0.4)'] as const },
];

// ── PROGRESS PILL COMPONENT ──
const ActivityPill = ({ stat, index }: { stat: typeof ACTIVITY_STATS[0], index: number }) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const percentage = Math.min((stat.current / stat.target) * 100, 100);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: percentage,
      duration: 1000,
      delay: index * 200,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={styles.statContainer}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel}>{stat.label}</Text>
        <Text style={styles.statValues}>
          <Text style={{ fontWeight: '700', color: '#1a1a1a' }}>{stat.current}</Text> / {stat.target} {stat.unit}
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: widthInterpolated }]}>
          <LinearGradient colors={stat.colors} style={StyleSheet.absoluteFillObject} start={{x:0, y:0}} end={{x:1, y:0}} />
        </Animated.View>
      </View>
    </View>
  );
};

export default function Workout() {
  const router = useRouter();
  
  // ── STATE ──
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  
  // Chat & Voice State
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── LOGIC ──
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    } else {
      setIsRecording(true);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true })
        ])
      ).start();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* ── BACKGROUND ── */}
      <LinearGradient colors={['#f4f0ff', '#fcebf0', '#ebf4ff']} style={StyleSheet.absoluteFillObject} />

      {/* ── TOP NAV BAR ── */}
      <BlurView intensity={60} tint="light" style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={20} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Workout Studio</Text>
        <View style={{ width: 36 }} /> {/* Spacer to center title */}
      </BlurView>

      {/* ── TABS ── */}
      <View style={styles.tabContainer}>
        <BlurView intensity={40} tint="light" style={styles.tabBlur}>
          {(['stats', 'plans', 'chat'] as Tab[]).map((tab) => (
            <TouchableOpacity 
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              {activeTab === tab && (
                <LinearGradient colors={['#b8a0e8', '#9b7fd4']} style={StyleSheet.absoluteFillObject} start={{x:0, y:0}} end={{x:1, y:1}} />
              )}
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </BlurView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ── STATS TAB ── */}
        {activeTab === 'stats' && (
          <View style={styles.section}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Daily Activity</Text>
              <Text style={styles.headerSub}>You're on track to hit your goals today!</Text>
            </View>

            <BlurView intensity={50} tint="light" style={styles.activityCard}>
              {ACTIVITY_STATS.map((stat, idx) => (
                <ActivityPill key={stat.id} stat={stat} index={idx} />
              ))}
            </BlurView>
            
            <View style={styles.streakCard}>
              <LinearGradient colors={['rgba(184, 160, 232, 0.2)', 'rgba(155, 127, 212, 0.1)']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.streakIcon}><Text style={{fontSize: 24}}>🔥</Text></View>
              <View>
                <Text style={styles.streakTitle}>5 Day Streak!</Text>
                <Text style={styles.streakSub}>Keep the momentum going.</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── PLANS TAB ── */}
        {activeTab === 'plans' && (
          <View style={styles.section}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Your Routines</Text>
              <Text style={styles.headerSub}>Curated workouts for your fitness level.</Text>
            </View>

            <View style={styles.grid}>
              {WORKOUTS.map(workout => (
                <TouchableOpacity key={workout.id} style={styles.workoutCard} activeOpacity={0.9}>
                  <LinearGradient colors={workout.colors} style={StyleSheet.absoluteFillObject} start={{x:0,y:0}} end={{x:1,y:1}} />
                  <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFillObject} />
                  
                  <View style={styles.workoutIconWrap}>
                    <Ionicons name={workout.icon as any} size={24} color="#1a1a1a" />
                  </View>
                  <Text style={styles.workoutType}>{workout.type}</Text>
                  <Text style={styles.workoutTitle}>{workout.title}</Text>
                  <View style={styles.workoutMeta}>
                    <Feather name="clock" size={10} color="#1a1a1a" />
                    <Text style={styles.workoutDuration}>{workout.duration}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── CHAT / VOICE TAB ── */}
        {activeTab === 'chat' && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.chatSection}>
            <View style={styles.chatHeader}>
              <View style={styles.aiAvatar}>
                <LinearGradient colors={['#b8a0e8', '#9b7fd4']} style={StyleSheet.absoluteFillObject} />
                <Feather name="activity" size={24} color="#fff" />
              </View>
              <Text style={styles.aiGreeting}>Hey! I'm your AI Coach. Ready to sweat?</Text>
            </View>

            <View style={styles.voiceOrbContainer}>
              {isRecording && (
                <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
              )}
              <TouchableOpacity 
                style={[styles.voiceOrb, isRecording && styles.voiceOrbRecording]}
                onPress={toggleRecording}
                activeOpacity={0.9}
              >
                <LinearGradient 
                  colors={isRecording ? ['#ff6b6b', '#ee5253'] : ['#b8a0e8', '#9b7fd4']} 
                  style={StyleSheet.absoluteFillObject} 
                />
                <Feather name={isRecording ? "square" : "mic"} size={32} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.voiceStatusText}>
                {isRecording ? "Listening to your goals..." : "Tap to speak your workout goals"}
              </Text>
            </View>

            <View style={styles.chatInputWrap}>
              <BlurView intensity={50} tint="light" style={styles.chatInputInner}>
                <TextInput
                  style={styles.inputField}
                  placeholder="Or type your fitness question..."
                  placeholderTextColor="#a0a0a0"
                  value={inputText}
                  onChangeText={setInputText}
                />
                <TouchableOpacity style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} disabled={!inputText.trim()}>
                  <LinearGradient colors={['#b8a0e8', '#9b7fd4']} style={StyleSheet.absoluteFillObject} />
                  <Feather name="arrow-up" size={18} color="#fff" />
                </TouchableOpacity>
              </BlurView>
            </View>
          </KeyboardAvoidingView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f0ff' },
  
  // ── NAV BAR ──
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.6)',
    zIndex: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)'
  },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },

  // ── TABS ──
  tabContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  tabBlur: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tabBtnActive: {
    shadowColor: '#9b7fd4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b6b6b', zIndex: 1 },
  tabTextActive: { color: '#ffffff' },

  scrollContent: { padding: 20, paddingBottom: 60 },
  section: { flex: 1 },
  
  // ── HEADERS ──
  header: { marginBottom: 25 },
  headerTitle: { fontFamily: 'System', fontSize: 32, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  headerSub: { fontSize: 13, color: '#666', lineHeight: 20 },

  // ── STATS SECTION ──
  activityCard: {
    padding: 24,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    marginBottom: 20,
    shadowColor: '#9b7fd4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
  },
  statContainer: { marginBottom: 20 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  statLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 1 },
  statValues: { fontSize: 12, color: '#6b6b6b' },
  track: { height: 14, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 7, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 7, overflow: 'hidden' },

  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden',
  },
  streakIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  streakTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  streakSub: { fontSize: 12, color: '#6b6b6b' },

  // ── PLANS SECTION ──
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 },
  workoutCard: {
    width: (width - 54) / 2,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    overflow: 'hidden',
    shadowColor: '#502878',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    minHeight: 160,
  },
  workoutIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  workoutType: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#1a1a1a', opacity: 0.7, marginBottom: 4 },
  workoutTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
  workoutMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.4)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  workoutDuration: { fontSize: 11, fontWeight: '600', color: '#1a1a1a' },

  // ── CHAT SECTION ──
  chatSection: { flex: 1, minHeight: 400, justifyContent: 'space-between' },
  chatHeader: { alignItems: 'center', marginTop: 20 },
  aiAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 15, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
  aiGreeting: { fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center', paddingHorizontal: 40 },
  
  voiceOrbContainer: { alignItems: 'center', justifyContent: 'center', flex: 1, marginVertical: 40 },
  pulseRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(184, 160, 232, 0.3)' },
  voiceOrb: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#9b7fd4', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 5 },
  voiceOrbRecording: { shadowColor: '#ff6b6b' },
  voiceStatusText: { marginTop: 20, fontSize: 14, color: '#6b6b6b', fontWeight: '500' },

  chatInputWrap: { paddingBottom: 10 },
  chatInputInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.6)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 22, paddingVertical: 6, paddingLeft: 16, paddingRight: 6 },
  inputField: { flex: 1, height: 40, fontFamily: 'System', fontSize: 14, color: '#1a1a1a' },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 8, overflow: 'hidden' },
});