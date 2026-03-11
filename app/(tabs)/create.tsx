import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Boards() {
  const router = useRouter();
  
  // ── STATE ──
  const [activeTab, setActiveTab] = useState<'life' | 'boards'>('life');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // ── PACKING ENGINE STATE ──
  const [isPackingModalVisible, setIsPackingModalVisible] = useState(false);
  const [packingForm, setPackingForm] = useState({ destination: '', days: '3', weather: '', events: '' });
  const [packingLoading, setPackingLoading] = useState(false);
  const [packingResult, setPackingResult] = useState<Record<string, string[]> | null>(null);

  // Animation for calendar drop-down
  const calendarAnim = useRef(new Animated.Value(0)).current;

  // ── LOGIC ──
  const toggleCalendar = () => {
    const toValue = isCalendarOpen ? 0 : 1;
    setIsCalendarOpen(!isCalendarOpen);
    Animated.spring(calendarAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + direction));
    setCurrentDate(new Date(newDate));
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const days = [];
    
    for (let i = 1; i <= daysCount; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        dayNum: i,
        dayStr: DAYS[date.getDay()],
        isToday: date.toDateString() === new Date().toDateString(),
        isSelected: date.toDateString() === selectedDate.toDateString()
      });
    }
    return days;
  };

  // ⚡ THE PACKING ENGINE API CALL
  const handleGeneratePacking = async () => {
    if (!packingForm.destination || !packingForm.weather) {
      Alert.alert("Missing Info", "Please enter at least a destination and weather vibe.");
      return;
    }
    setPackingLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/packing/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: packingForm.destination,
          duration_days: parseInt(packingForm.days) || 3,
          weather: packingForm.weather,
          events: packingForm.events || "casual sightseeing"
        }),
      });

      if (!response.ok) throw new Error("Failed to generate packing list.");
      const data = await response.json();
      setPackingResult(data);
    } catch (error) {
      console.error("Packing Engine Error:", error);
      Alert.alert("Error", "Ahvi couldn't generate the packing list right now.");
    } finally {
      setPackingLoading(false);
    }
  };

  // ── RENDER ──
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Boards</Text>
          <View style={styles.titleUnderline} />
          <Text style={styles.subtitle}>Your life, organised visually.</Text>
        </View>

        {/* TOGGLE SWITCH */}
        <View style={styles.toggleContainer}>
          <BlurView intensity={40} tint="light" style={styles.toggleBlur}>
            <TouchableOpacity 
              style={[styles.toggleBtn, activeTab === 'life' && styles.toggleBtnActive]}
              onPress={() => setActiveTab('life')}
              activeOpacity={0.8}
            >
              {activeTab === 'life' && (
                <LinearGradient colors={['#9060d0', '#e87090']} style={StyleSheet.absoluteFillObject} start={{x:0, y:0}} end={{x:1, y:1}} />
              )}
              <Feather name="grid" size={14} color={activeTab === 'life' ? '#fff' : '#6b6b6b'} style={{ zIndex: 1 }} />
              <Text style={[styles.toggleText, activeTab === 'life' && styles.toggleTextActive]}>Life</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.toggleBtn, activeTab === 'boards' && styles.toggleBtnActive]}
              onPress={() => setActiveTab('boards')}
              activeOpacity={0.8}
            >
              {activeTab === 'boards' && (
                <LinearGradient colors={['#9060d0', '#e87090']} style={StyleSheet.absoluteFillObject} start={{x:0, y:0}} end={{x:1, y:1}} />
              )}
              <Feather name="layout" size={14} color={activeTab === 'boards' ? '#fff' : '#6b6b6b'} style={{ zIndex: 1 }} />
              <Text style={[styles.toggleText, activeTab === 'boards' && styles.toggleTextActive]}>Boards</Text>
            </TouchableOpacity>
          </BlurView>
        </View>

        {/* ── LIFE SECTION ── */}
        {activeTab === 'life' && (
          <View style={styles.section}>
            
            {/* Calendar Trigger */}
            <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={toggleCalendar}>
              <View style={styles.cardLeft}>
                <View style={styles.cardIconWrap}>
                  <Ionicons name="calendar-outline" size={20} color="#1a1a1a" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Schedule / Calendar</Text>
                  <Text style={styles.cardSub}>3 upcoming events · 2 outfit reminders</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <View style={styles.pulseDot} />
                <Animated.View style={{ transform: [{ rotate: calendarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
                  <Feather name="chevron-down" size={20} color="#6b6b6b" />
                </Animated.View>
              </View>
            </TouchableOpacity>

            {/* Collapsible Calendar Box */}
            {isCalendarOpen && (
              <View style={styles.calendarBox}>
                <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFillObject} />
                
                {/* Month Nav */}
                <View style={styles.monthNav}>
                  <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(-1)}>
                    <Feather name="chevron-left" size={18} color="#6b6b6b" />
                  </TouchableOpacity>
                  <Text style={styles.monthTitle}>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</Text>
                  <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(1)}>
                    <Feather name="chevron-right" size={18} color="#6b6b6b" />
                  </TouchableOpacity>
                </View>

                {/* Days Strip */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekStrip} contentContainerStyle={{ paddingRight: 20 }}>
                  {getDaysInMonth().map((day, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={[styles.dayPill, day.isSelected && styles.dayPillActive]}
                      onPress={() => setSelectedDate(day.date)}
                    >
                      {day.isSelected && <LinearGradient colors={['rgba(220, 200, 255, 0.7)', 'rgba(255, 210, 235, 0.6)']} style={StyleSheet.absoluteFillObject} start={{x:0, y:0}} end={{x:1, y:1}} />}
                      <Text style={[styles.dayStr, day.isSelected && styles.dayStrActive]}>{day.dayStr}</Text>
                      <Text style={[styles.dayNum, day.isSelected && styles.dayNumActive]}>{day.dayNum}</Text>
                      {day.isToday && <View style={styles.todayDot} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Plans Section */}
                <View style={styles.plansSection}>
                  <Text style={styles.plansLabel}>
                    {selectedDate.toDateString() === new Date().toDateString() ? "Today's Plans" : selectedDate.toDateString()}
                  </Text>
                  
                  {/* Empty State Stub */}
                  <View style={styles.planEmpty}>
                    <Text style={styles.planEmptyText}>Nothing planned 🌿</Text>
                    <Text style={styles.planEmptySub}>Tap "Add a Plan" below</Text>
                  </View>

                  <TouchableOpacity style={styles.addPlanBtn}>
                    <Feather name="plus" size={16} color="#6b6b6b" />
                    <Text style={styles.addPlanText}>Add a Plan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Life Grid Cards */}
            <View style={styles.itemsGrid}>
              
              <TouchableOpacity style={styles.vcard} onPress={() => router.push('/dailywear')}>
                <LinearGradient colors={['rgba(210, 200, 255, 0.65)', 'rgba(230, 210, 255, 0.45)']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.vcardHeader}>
                  <Ionicons name="shirt-outline" size={28} color="#1a1a1a" />
                  <View style={styles.vcardBadge}><Text style={styles.vcardBadgeText}>12</Text></View>
                </View>
                <Text style={styles.vcardTitle}>Daily Wear</Text>
                <Text style={styles.vcardSub}>Today's outfits</Text>
                <View style={styles.vcardArrow}><Feather name="chevron-right" size={12} color="#6b6b6b" /></View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.vcard} onPress={() => router.push('/homeutilities')}>
                <LinearGradient colors={['rgba(255, 215, 190, 0.65)', 'rgba(255, 195, 175, 0.45)']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.vcardHeader}>
                  <Ionicons name="home-outline" size={28} color="#1a1a1a" />
                  <View style={styles.vcardBadge}><Text style={styles.vcardBadgeText}>5</Text></View>
                </View>
                <Text style={styles.vcardTitle}>Home / Utilities</Text>
                <Text style={styles.vcardSub}>Bills & stuff</Text>
                <View style={styles.vcardArrow}><Feather name="chevron-right" size={12} color="#6b6b6b" /></View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.vcard} onPress={() => router.push('/workout')}>
                <LinearGradient colors={['rgba(190, 240, 225, 0.65)', 'rgba(170, 230, 215, 0.45)']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.vcardHeader}>
                  <Ionicons name="barbell-outline" size={28} color="#1a1a1a" />
                  <View style={styles.vcardBadge}><Text style={styles.vcardBadgeText}>3×/wk</Text></View>
                </View>
                <Text style={styles.vcardTitle}>Work Out</Text>
                <Text style={styles.vcardSub}>Gym & yoga</Text>
                <View style={styles.vcardArrow}><Feather name="chevron-right" size={12} color="#6b6b6b" /></View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.vcard} onPress={() => router.push('/lifegoals')}>
                <LinearGradient colors={['rgba(195, 220, 255, 0.65)', 'rgba(175, 210, 255, 0.45)']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.vcardHeader}>
                  <Ionicons name="checkmark-circle-outline" size={28} color="#1a1a1a" />
                  <View style={styles.vcardBadge}><Text style={styles.vcardBadgeText}>8</Text></View>
                </View>
                <Text style={styles.vcardTitle}>Life Goals</Text>
                <Text style={styles.vcardSub}>Habits & goals</Text>
                <View style={styles.vcardArrow}><Feather name="chevron-right" size={12} color="#6b6b6b" /></View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.vcard, { width: '100%' }]} onPress={() => router.push('/skincare')}>
                <LinearGradient colors={['rgba(255, 200, 220, 0.65)', 'rgba(255, 180, 210, 0.45)']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.vcardHeader}>
                  <Ionicons name="sparkles-outline" size={28} color="#1a1a1a" />
                  <View style={styles.vcardBadge}><Text style={styles.vcardBadgeText}>AM · PM</Text></View>
                </View>
                <Text style={styles.vcardTitle}>Skincare</Text>
                <Text style={styles.vcardSub}>Morning & night routine</Text>
                <View style={styles.vcardArrow}><Feather name="chevron-right" size={12} color="#6b6b6b" /></View>
              </TouchableOpacity>

            </View>
          </View>
        )}

        {/* ── BOARDS SECTION ── */}
        {activeTab === 'boards' && (
          <View style={styles.section}>
            <View style={styles.itemsGrid}>
              
              <TouchableOpacity style={styles.vcard}>
                <LinearGradient colors={['rgba(255, 200, 220, 0.65)', 'rgba(255, 180, 210, 0.45)']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.vcardHeader}>
                  <Ionicons name="glass-outline" size={28} color="#1a1a1a" />
                  <View style={styles.vcardBadge}><Text style={styles.vcardBadgeText}>8</Text></View>
                </View>
                <Text style={styles.vcardTitle}>Party Looks</Text>
                <Text style={styles.vcardSub}>Evening & cocktail</Text>
                <View style={styles.vcardArrow}><Feather name="chevron-right" size={12} color="#6b6b6b" /></View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.vcard}>
                <LinearGradient colors={['rgba(195, 220, 255, 0.65)', 'rgba(175, 210, 255, 0.45)']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.vcardHeader}>
                  <Ionicons name="briefcase-outline" size={28} color="#1a1a1a" />
                  <View style={styles.vcardBadge}><Text style={styles.vcardBadgeText}>10</Text></View>
                </View>
                <Text style={styles.vcardTitle}>Office Fits</Text>
                <Text style={styles.vcardSub}>Work-ready looks</Text>
                <View style={styles.vcardArrow}><Feather name="chevron-right" size={12} color="#6b6b6b" /></View>
              </TouchableOpacity>

              {/* ✈️ THE NEW VACATION / PACKING TRIGGER */}
              <TouchableOpacity style={[styles.vcard, { width: '100%' }]} onPress={() => setIsPackingModalVisible(true)}>
                <LinearGradient colors={['rgba(190, 240, 225, 0.65)', 'rgba(170, 230, 215, 0.45)']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.vcardHeader}>
                  <Ionicons name="airplane-outline" size={28} color="#1a1a1a" />
                  <View style={styles.vcardBadge}><Text style={styles.vcardBadgeText}>AI</Text></View>
                </View>
                <Text style={styles.vcardTitle}>Vacation</Text>
                <Text style={styles.vcardSub}>AI-Powered Packing Lists</Text>
                <View style={styles.vcardArrow}><Feather name="chevron-right" size={12} color="#6b6b6b" /></View>
              </TouchableOpacity>

            </View>
          </View>
        )}
      </ScrollView>

      {/* ── PACKING ENGINE MODAL ── */}
      <Modal visible={isPackingModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <BlurView intensity={70} tint="light" style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trip <Text style={{ fontStyle: 'italic', color: '#b8a8e8' }}>Packing</Text></Text>
              <TouchableOpacity 
                onPress={() => { setIsPackingModalVisible(false); setPackingResult(null); }} 
                style={styles.iconBtn}
              >
                <Ionicons name="close" size={24} color="#6b6b6b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {!packingResult ? (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Destination *</Text>
                    <TextInput 
                      style={styles.input} 
                      placeholder="e.g. Goa, Paris, Tokyo" 
                      placeholderTextColor="#a0a0a0" 
                      value={packingForm.destination} 
                      onChangeText={(t) => setPackingForm({...packingForm, destination: t})} 
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Weather *</Text>
                    <TextInput 
                      style={styles.input} 
                      placeholder="e.g. Hot & Humid, Chilly" 
                      placeholderTextColor="#a0a0a0" 
                      value={packingForm.weather} 
                      onChangeText={(t) => setPackingForm({...packingForm, weather: t})} 
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Duration (Days) *</Text>
                    <TextInput 
                      style={styles.input} 
                      keyboardType="numeric" 
                      value={packingForm.days} 
                      onChangeText={(t) => setPackingForm({...packingForm, days: t})} 
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Planned Events</Text>
                    <TextInput 
                      style={styles.input} 
                      placeholder="e.g. Beach party, fine dining" 
                      placeholderTextColor="#a0a0a0" 
                      value={packingForm.events} 
                      onChangeText={(t) => setPackingForm({...packingForm, events: t})} 
                    />
                  </View>

                  <TouchableOpacity style={[styles.btnPrimaryFlex, { marginTop: 10 }]} onPress={handleGeneratePacking} disabled={packingLoading}>
                    <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} start={{x:0, y:0}} end={{x:1, y:1}} />
                    {packingLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Feather name="zap" size={14} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.btnPrimaryText}>Generate List</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <View>
                  {Object.keys(packingResult).map((category) => (
                    <View key={category} style={{ marginBottom: 18 }}>
                      <Text style={styles.resultCategory}>{category}</Text>
                      {Array.isArray(packingResult[category]) && packingResult[category].map((item, idx) => (
                        <View key={idx} style={styles.resultItemRow}>
                          <Feather name="check-circle" size={16} color="#7b6cc8" style={{ marginRight: 10 }} />
                          <Text style={styles.resultItemText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                  <TouchableOpacity style={[styles.btnSecondary, { marginTop: 10 }]} onPress={() => setPackingResult(null)}>
                    <Text style={styles.btnSecondaryText}>Plan Another Trip</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { padding: 20, paddingBottom: 120 },
  
  // ── HEADER ──
  header: { marginBottom: 24 },
  title: { fontFamily: 'System', fontSize: 38, fontWeight: '700', color: '#000000', letterSpacing: -0.5 },
  titleUnderline: { height: 3, width: 48, borderRadius: 4, marginTop: 6, backgroundColor: '#9060d0' },
  subtitle: { color: '#6b6b6b', fontSize: 13.5, marginTop: 6, letterSpacing: 0.1 },

  // ── TOGGLE ──
  toggleContainer: { marginBottom: 20, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.4)', shadowColor: '#3c145a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16 },
  toggleBlur: { flexDirection: 'row', padding: 4, backgroundColor: 'rgba(255, 255, 255, 0.35)' },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 20, gap: 7, overflow: 'hidden' },
  toggleBtnActive: { shadowColor: '#9060d0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 4 },
  toggleText: { fontSize: 14, fontWeight: '500', color: '#6b6b6b', zIndex: 1 },
  toggleTextActive: { color: '#ffffff', fontWeight: '600' },

  section: { flex: 1 },

  // ── CALENDAR CARD ──
  card: { backgroundColor: 'rgba(255, 255, 255, 0.4)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, shadowColor: '#502878', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 32, elevation: 4 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  cardIconWrap: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(220, 210, 255, 0.7)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  cardSub: { fontSize: 13, color: '#6b6b6b' },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e87090' },

  // ── CALENDAR EXPANDED BOX ──
  calendarBox: { borderRadius: 22, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)', backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingBottom: 6 },
  navBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.8)' },
  monthTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  weekStrip: { paddingHorizontal: 14, paddingBottom: 14 },
  dayPill: { width: 50, height: 76, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.45)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)', alignItems: 'center', justifyContent: 'center', marginRight: 8, overflow: 'hidden' },
  dayPillActive: { borderColor: 'rgba(255, 255, 255, 0.95)', shadowColor: '#a078d0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  dayStr: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#8070a8', marginBottom: 2, zIndex: 2 },
  dayStrActive: { color: '#9060d0' },
  dayNum: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', zIndex: 2 },
  dayNumActive: { color: '#000' },
  todayDot: { position: 'absolute', top: 6, right: 6, width: 5, height: 5, borderRadius: 3, backgroundColor: '#6dd8b8', zIndex: 3 },
  plansSection: { padding: 14, backgroundColor: 'rgba(255, 255, 255, 0.25)', borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.4)' },
  plansLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, color: '#6b6b6b', marginBottom: 10 },
  planEmpty: { alignItems: 'center', paddingVertical: 20 },
  planEmptyText: { fontSize: 13, color: '#6b6b6b', fontWeight: '500', marginBottom: 4 },
  planEmptySub: { fontSize: 11, color: '#a0a0a0' },
  addPlanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.55)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.8)', borderStyle: 'dashed', borderRadius: 16, padding: 12, gap: 8 },
  addPlanText: { fontSize: 13.5, fontWeight: '600', color: '#6b6b6b' },

  // ── GRID CARDS ──
  itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  vcard: { width: (width - 52) / 2, borderRadius: 22, padding: 16, paddingTop: 18, minHeight: 130, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.6)', backgroundColor: 'rgba(255, 255, 255, 0.3)', shadowColor: '#502878', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 3, overflow: 'hidden', position: 'relative' },
  vcardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, zIndex: 5 },
  vcardBadge: { backgroundColor: 'rgba(255, 255, 255, 0.65)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.8)' },
  vcardBadgeText: { fontSize: 10, fontWeight: '700', color: '#6b6b6b' },
  vcardTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 4, zIndex: 5 },
  vcardSub: { fontSize: 11.5, color: '#6b6b6b', lineHeight: 16, zIndex: 5, flex: 1 },
  vcardArrow: { position: 'absolute', bottom: 14, right: 14, width: 22, height: 22, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 5 },

  // ── MODAL STYLES (Copied from Wardrobe for consistency) ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(20, 12, 36, 0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, backgroundColor: 'rgba(255, 255, 255, 0.85)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.95)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 26, color: '#1a1a1a', fontWeight: '300' },
  iconBtn: { padding: 4 },
  field: { marginBottom: 18 },
  label: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, color: '#6b6b6b', marginBottom: 8 },
  input: { backgroundColor: 'rgba(255, 255, 255, 0.65)', borderWidth: 1, borderColor: 'rgba(190, 170, 230, 0.3)', padding: 14, borderRadius: 14, fontSize: 14, color: '#1a1a1a' },
  btnPrimaryFlex: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 100, overflow: 'hidden' },
  btnPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  btnSecondary: { flexDirection: 'row', paddingVertical: 14, borderRadius: 100, backgroundColor: 'rgba(255, 255, 255, 0.6)', borderWidth: 1, borderColor: 'rgba(190, 170, 230, 0.3)', alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { color: '#6b6b6b', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  
  // ── RESULTS STYLES ──
  resultCategory: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: '#b8a8e8', marginBottom: 10 },
  resultItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  resultItemText: { fontSize: 15, color: '#1a1a1a', fontWeight: '400' }
});