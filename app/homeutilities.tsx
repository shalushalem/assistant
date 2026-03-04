import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// ── MOCK DATA ──
const MOCK_DATA = {
  meals: { count: 7, prog: 100, badge: '7 planned' },
  meds: { count: 3, prog: 60, badge: '3 of 5 taken' },
  bills: { count: 2, prog: 25, badge: '2 due soon' },
};

// ── CUSTOM ANIMATED COUNTER COMPONENT ──
const AnimatedCounter = ({ endValue }: { endValue: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000; 
    const stepTime = Math.abs(Math.floor(duration / (endValue || 1)));
    
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= endValue) clearInterval(timer);
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [endValue]);

  return <Text style={styles.statNum}>{count}</Text>;
};

// ── UTILITY CARD COMPONENT ──
interface UtilityCardProps {
  title: string;
  iconName: keyof typeof Ionicons.glyphMap;
  data: { count: number; prog: number; badge: string };
  colors: readonly [string, string];
  actionText: string;
}

const UtilityCard = ({ title, iconName, data, colors, actionText }: UtilityCardProps) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: data.prog,
      duration: 1200,
      useNativeDriver: false, // width interpolation doesn't support native driver
    }).start();
  }, [data.prog]);

  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={styles.cardWrapper}>
      <BlurView intensity={50} tint="light" style={styles.card}>
        
        {/* Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <View style={[styles.iconWrap, { backgroundColor: colors[0] + '20' }]}>
              <Ionicons name={iconName} size={20} color={colors[1]} />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          <View style={styles.badgeWrap}>
            <Text style={[styles.badgeText, { color: colors[1] }]}>{data.badge}</Text>
          </View>
        </View>

        {/* Stats & Progress */}
        <View style={styles.statsRow}>
          <AnimatedCounter endValue={data.count} />
          
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFillWrap, { width: widthInterpolated }]}>
                <LinearGradient colors={colors} style={StyleSheet.absoluteFillObject} start={{x: 0, y: 0}} end={{x: 1, y: 0}} />
              </Animated.View>
            </View>
            <Text style={styles.progressLabel}>{data.prog}% Complete</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
          <Text style={styles.actionBtnText}>{actionText}</Text>
          <Feather name="chevron-right" size={14} color="#1a1a1a" />
        </TouchableOpacity>

      </BlurView>
    </View>
  );
};

export default function HomeUtilities() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* ── AMBIENT BACKGROUND (Peach -> Rose -> Lavender) ── */}
      <LinearGradient 
        colors={['#fff0e6', '#fce4ec', '#f3e5f5']} 
        style={StyleSheet.absoluteFillObject} 
      />

      {/* ── TOP NAV BAR ── */}
      <BlurView intensity={60} tint="light" style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={20} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Home / Utilities</Text>
        <View style={{ width: 36 }} /> {/* Spacer */}
      </BlurView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ── HEADER INTRO ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Life Admin</Text>
          <Text style={styles.headerSub}>Manage your meals, meds, and bills all in one place.</Text>
        </View>

        {/* ── CARDS ── */}
        <UtilityCard 
          title="Meal Prep" 
          iconName="restaurant-outline" 
          data={MOCK_DATA.meals} 
          colors={['#56c8a0', '#2ea87c']} // Meal Colors
          actionText="View meal plan"
        />

        <UtilityCard 
          title="Medications" 
          iconName="medical-outline" 
          data={MOCK_DATA.meds} 
          colors={['#e8739a', '#c94f7a']} // Med Colors
          actionText="Log medication"
        />

        <UtilityCard 
          title="Bills & Finance" 
          iconName="wallet-outline" 
          data={MOCK_DATA.bills} 
          colors={['#f5a623', '#d4881a']} // Bill Colors
          actionText="Pay upcoming bills"
        />

        {/* ── ADDITIONAL QUICK ACTIONS ── */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickBtn}>
            <View style={[styles.quickIconWrap, { backgroundColor: 'rgba(123, 108, 200, 0.15)' }]}>
              <Feather name="shopping-cart" size={18} color="#7b6cc8" />
            </View>
            <Text style={styles.quickBtnText}>Groceries</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn}>
            <View style={[styles.quickIconWrap, { backgroundColor: 'rgba(224, 112, 144, 0.15)' }]}>
              <Feather name="home" size={18} color="#e07090" />
            </View>
            <Text style={styles.quickBtnText}>Chores</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── AHVI CHAT FAB ── */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => router.push('/chat')}>
        <LinearGradient colors={['#9060d0', '#e87090']} style={StyleSheet.absoluteFillObject} />
        <Feather name="message-circle" size={24} color="#fff" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff0e6' },
  
  // Nav Bar
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
  
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  // Header
  header: { marginBottom: 25 },
  headerTitle: { fontFamily: 'System', fontSize: 32, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  headerSub: { fontSize: 13, color: '#666', lineHeight: 20 },

  // Cards
  cardWrapper: { marginBottom: 20 },
  card: {
    padding: 22,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    shadowColor: '#502878',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
    overflow: 'hidden'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  badgeWrap: { backgroundColor: 'rgba(255, 255, 255, 0.8)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  
  statsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 20, marginBottom: 24 },
  statNum: { fontSize: 54, fontWeight: '300', color: '#1a1a1a', lineHeight: 60 },
  progressContainer: { flex: 1, paddingBottom: 10 },
  progressTrack: { width: '100%', height: 8, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFillWrap: { height: '100%', borderRadius: 4, overflow: 'hidden' },
  progressLabel: { fontSize: 11, color: '#666', textAlign: 'right', fontWeight: '500' },
  
  actionBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(255, 255, 255, 0.65)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.9)' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },

  // Quick Actions
  quickActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.45)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.8)', padding: 14, borderRadius: 18, gap: 10 },
  quickIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickBtnText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },

  // FAB
  fab: { position: 'absolute', bottom: 30, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#9060d0', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 5, overflow: 'hidden' }
});