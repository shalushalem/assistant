import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

// ── DATA ──
const OUTFITS = [
  { id: 'o0', name: 'Linen & Air', desc: 'Breathable layers · Perfect for mild days', range: [26, 99], tip: 'Ideal for hot & humid weather', tags: ['Breezy', 'Linen', 'Relaxed Fit', 'Warm Weather'], occ: ['Casual', 'Weekend', 'Travel'], img: 'https://i.pinimg.com/736x/dc/f4/05/dcf405a9b3fa1734bf1a68c689295012.jpg', colors: ['#e8e0d5', '#c8b89a', '#d4a472'] },
  { id: 'o1', name: 'Coffee Run', desc: 'Cosy & put-together · Weekend energy', range: [15, 25], tip: 'Great for mild & cool days', tags: ['Cosy', 'Casual', 'Everyday', 'Comfortable'], occ: ['Casual', 'Weekend', 'Errands'], img: 'https://i.pinimg.com/736x/a3/f2/18/a3f218d89461024773e4b0c0a0b52de2.jpg', colors: ['#8d8d8d', '#4a6fa5', '#f5f5f5'] },
  { id: 'o2', name: 'Office Hours', desc: 'Sharp & confident · Boardroom ready', range: [18, 28], tip: 'Best in comfortable indoor weather', tags: ['Smart', 'Formal', 'Polished', 'Work-ready'], occ: ['Work', 'Meetings', 'Formal'], img: 'https://i.pinimg.com/736x/e0/c1/9d/e0c19d4fc4c0afe55a832318c50c5b8a.jpg', colors: ['#2c3e50', '#a8bbd1', '#1a1a1a'] },
  { id: 'o3', name: 'Golden Hour', desc: 'Earth tones · Warm palette for evenings', range: [20, 30], tip: 'Perfect for warm evenings out', tags: ['Earth Tones', 'Trendy', 'Textured', 'Date Night'], occ: ['Date Night', 'Casual', 'Dinner'], img: 'https://i.pinimg.com/474x/33/f8/a6/33f8a65105a50fbc1948e176221182d0.jpg', colors: ['#c8864a', '#8b6f5c', '#d4b483'] }
];

const WEATHER_MAP: Record<number, { i: string, l: string, t: string }> = { 
  0: { i: '☀️', l: 'Clear sky', t: 'Great day for light, breezy outfits!' }, 
  1: { i: '🌤️', l: 'Mostly clear', t: 'A light layer is all you need.' }, 
  2: { i: '⛅', l: 'Partly cloudy', t: 'Perfect for light layers today.' }, 
  3: { i: '☁️', l: 'Overcast', t: 'Layer up a little — skies are grey.' }, 
  45: { i: '🌫️', l: 'Foggy', t: 'Keep it cosy today.' }, 
  51: { i: '🌦️', l: 'Light drizzle', t: 'Grab a light jacket just in case.' }, 
  61: { i: '🌧️', l: 'Light rain', t: "Don't forget an umbrella." }, 
  63: { i: '🌧️', l: 'Rain', t: 'Waterproof shoes are a must.' }, 
  65: { i: '⛈️', l: 'Heavy rain', t: 'Stay dry — full rain gear today.' }, 
  80: { i: '🌦️', l: 'Showers', t: 'Pack a compact umbrella.' }, 
  95: { i: '⛈️', l: 'Thunderstorm', t: 'Best to stay in today.' } 
};

export default function DailyWear() {
  const router = useRouter();

  // ── STATE ──
  const [activeSlide, setActiveSlide] = useState(0);
  const [wornId, setWornId] = useState<string | null>(null);
  
  // Date & Time
  const [dateStr, setDateStr] = useState({ day: 'THU', date: 'FEB 19', time: '00:00' });
  
  // Weather
  const [weather, setWeather] = useState({ temp: '--', feel: '--', icon: '⏳', label: 'Loading weather…', tip: 'Fetching conditions', loaded: false });
  
  // Modals
  const [tryOnItem, setTryOnItem] = useState<typeof OUTFITS[0] | null>(null);
  const [tryOnStep, setTryOnStep] = useState<'preview' | 'loading' | 'camera'>('preview');
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Chat
  const [chatInput, setChatInput] = useState('');
  const [chatMsgs, setChatMsgs] = useState<{role: 'user'|'ai', text: string}[]>([
    { role: 'ai', text: "Hi! I'm AHVI, your personal AI stylist ✦\n\nI can see today's weather and your outfit options. What would you like help with — styling tips, what to wear, or outfit advice for any occasion?" }
  ]);

  // ── EFFECTS ──
  useEffect(() => {
    // Clock
    const timer = setInterval(() => {
      const d = new Date();
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      setDateStr({
        day: days[d.getDay()],
        date: `${months[d.getMonth()]} ${d.getDate()}`,
        time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      });
    }, 1000);

    // Fetch Weather (Using Vijayawada coords as fallback default)
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=16.5062&longitude=80.648&current=temperature_2m,weathercode,apparent_temperature&timezone=auto`)
      .then(res => res.json())
      .then(data => {
        const c = data.current;
        const w = WEATHER_MAP[c.weathercode] || WEATHER_MAP[2];
        const temp = Math.round(c.temperature_2m);
        const feel = Math.round(c.apparent_temperature);
        const feelLabel = feel >= 30 ? 'Hot' : feel >= 24 ? 'Warm' : feel >= 18 ? 'Mild' : 'Cool';
        setWeather({ temp: `${temp}°`, feel: feelLabel, icon: w.i, label: `${w.l} · ${feelLabel}`, tip: w.t, loaded: true });
      })
      .catch(() => setWeather({ temp: '26°', feel: 'Warm', icon: '⛅', label: 'Partly cloudy · Warm', tip: 'Perfect for light layers today.', loaded: true }));

    return () => clearInterval(timer);
  }, []);

  // ── LOGIC ──
  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveSlide(Math.round(index));
  };

  const handleShare = async (item: typeof OUTFITS[0]) => {
    try { await Share.share({ message: `AHVI · ${item.name}\n${item.desc}` }); } catch (error) {}
  };

  const openTryOn = (item: typeof OUTFITS[0]) => {
    setTryOnItem(item);
    setTryOnStep('preview');
  };

  const startCamera = () => {
    setTryOnStep('loading');
    setTimeout(() => {
      setTryOnStep('camera');
    }, 1500);
  };

  const handleSendChat = (text = chatInput) => {
    if (!text.trim()) return;
    setChatMsgs(prev => [...prev, { role: 'user', text }]);
    setChatInput('');
    setTimeout(() => {
      setChatMsgs(prev => [...prev, { role: 'ai', text: `Based on today's weather, **Linen & Air** is your strongest choice right now — it reads the conditions well and keeps you looking effortlessly put-together. ✦` }]);
    }, 1000);
  };

  // ── RENDER ──
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LinearGradient colors={['#fef0f5', '#fce0ec', '#f8cce0', '#f0c0d8', '#e4b8e8', '#d8b8f0', '#cdb8f4']} style={StyleSheet.absoluteFillObject} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.hdrLeft}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="chevron-left" size={20} color="#000" />
            </TouchableOpacity>
            <View>
              <Text style={styles.hdrH1}>Daily Wear</Text>
              <Text style={styles.hdrSub}>Curated for you · Today</Text>
            </View>
          </View>
          <View style={styles.datePill}>
            <Text style={styles.dateText}>{dateStr.day} · {dateStr.date}</Text>
            <Text style={styles.timeText}>{dateStr.time}</Text>
          </View>
        </View>

        {/* WEATHER CARD */}
        <BlurView intensity={40} tint="light" style={styles.weatherCard}>
          <View style={styles.wLeft}>
            <Text style={styles.wIcon}>{weather.icon}</Text>
            <View>
              <Text style={[styles.wLabel, !weather.loaded && { color: 'rgba(80,40,30,0.5)' }]}>{weather.label}</Text>
              <Text style={[styles.wTip, !weather.loaded && { color: 'rgba(80,40,30,0.4)' }]}>{weather.tip}</Text>
            </View>
          </View>
          <Text style={[styles.wTemp, !weather.loaded && { color: 'rgba(80,40,30,0.4)' }]}>{weather.temp}</Text>
        </BlurView>

        {/* SUGGESTION BANNER */}
        {weather.loaded && (
          <View style={styles.sugBanner}>
            <Text style={styles.sbIcon}>{parseInt(weather.temp) >= 30 ? '🌡️' : '🌤️'}</Text>
            <Text style={styles.sbTxt}>Sorted for {weather.temp} today</Text>
          </View>
        )}

        {/* HERO CAROUSEL */}
        <View style={styles.carOuter}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={16} style={{ flex: 1 }}>
            {OUTFITS.map((o, i) => (
              <View key={o.id} style={styles.carSlide}>
                <Image source={{ uri: o.img }} style={styles.slideImg} />
                <LinearGradient colors={['rgba(210, 160, 210, 0.02)', 'rgba(210, 170, 200, 0)', 'rgba(185, 130, 175, 0.3)', 'rgba(130, 90, 155, 0.92)']} style={StyleSheet.absoluteFillObject} />
                
                <View style={styles.sTop}>
                  <View style={styles.heroBadge}><Text style={styles.heroBadgeTxt}>✦ AHVI's pick for today</Text></View>
                  <View style={styles.sActions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleShare(o)}><Feather name="share" size={14} color="#fff" /></TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn}><Feather name="heart" size={14} color="#fff" /></TouchableOpacity>
                  </View>
                </View>

                <View style={styles.sBottom}>
                  <View style={styles.sMeta}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sName}>{o.name}</Text>
                      <Text style={styles.sDesc}>{o.desc}</Text>
                    </View>
                    <View style={styles.sCounter}><Text style={styles.sCounterTxt}>{i + 1} / {OUTFITS.length}</Text></View>
                  </View>
                  
                  <View style={styles.tagsRow}>
                    {o.tags.map(t => <View key={t} style={styles.tag}><Text style={styles.tagTxt}>{t}</Text></View>)}
                  </View>

                  <TouchableOpacity style={styles.tryBtn} onPress={() => openTryOn(o)}>
                    <LinearGradient colors={['#e890a8', '#c878b0', '#9878c8']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} />
                    <Text style={styles.tryBtnTxt}>✦ Try On</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.dots}>
            {OUTFITS.map((_, i) => (
              <View key={i} style={[styles.dot, activeSlide === i && styles.dotOn]} />
            ))}
          </View>
        </View>

        {/* OTHER OPTIONS GRID */}
        <Text style={styles.secTitle}>Other good options</Text>
        <View style={styles.optsGrid}>
          {OUTFITS.slice(1).map((o, idx) => (
            <View key={o.id} style={styles.optCard}>
              <LinearGradient colors={
                idx === 0 ? ['rgba(255, 228, 240, 0.85)', 'rgba(255, 215, 230, 0.75)'] : 
                idx === 1 ? ['rgba(255, 232, 215, 0.85)', 'rgba(255, 220, 205, 0.75)'] : 
                ['rgba(228, 218, 255, 0.85)', 'rgba(215, 205, 255, 0.75)']
              } style={StyleSheet.absoluteFillObject} />
              
              <View style={styles.optImgWrap}>
                <Image source={{ uri: o.img }} style={styles.optImg} />
                <LinearGradient colors={['transparent', 'rgba(60, 40, 100, 0.65)']} style={StyleSheet.absoluteFillObject} />
              </View>

              <View style={styles.optBody}>
                <Text style={styles.optName} numberOfLines={1}>{o.name}</Text>
                <Text style={styles.optSub} numberOfLines={2}>{o.desc}</Text>
                
                <View style={styles.optIcons}>
                  <TouchableOpacity style={styles.optIco}><Feather name="heart" size={12} color="#6a4862" /></TouchableOpacity>
                  <TouchableOpacity style={styles.optIco} onPress={() => handleShare(o)}><Feather name="share" size={12} color="#6a4862" /></TouchableOpacity>
                </View>

                <View style={styles.optActs}>
                  <TouchableOpacity 
                    style={[styles.optBtn, wornId === o.id ? styles.optBtnWearWorn : styles.optBtnWear]}
                    onPress={() => setWornId(o.id)}
                  >
                    {wornId !== o.id && <LinearGradient colors={['#e890a8', '#c878b0', '#9878c8']} style={StyleSheet.absoluteFillObject} />}
                    <Text style={[styles.optBtnWearTxt, wornId === o.id && { color: '#1e5438' }]}>{wornId === o.id ? '✓ Wearing' : 'Wear'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.optBtnTry} onPress={() => openTryOn(o)}>
                    <Text style={styles.optBtnTryTxt}>Try On</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── CHAT FAB ── */}
      <TouchableOpacity style={styles.fab} onPress={() => setIsChatOpen(true)} activeOpacity={0.9}>
        <LinearGradient colors={['#e890a8', '#c878b0', '#9878c8']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} />
        <View style={styles.fabPulse} />
        <View style={styles.fabAv}><Text style={{ color: '#fff', fontSize: 13 }}>✦</Text><View style={styles.fabAvDot}/></View>
        <View style={styles.fabTxt}>
          <Text style={styles.fabLbl}>AI Stylist</Text>
          <Text style={styles.fabSub}>Ask me anything</Text>
        </View>
      </TouchableOpacity>

      {/* ── TRY-ON MODAL ── */}
      <Modal visible={!!tryOnItem} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalSheet}>
            <LinearGradient colors={['rgba(252, 240, 250, 0.94)', 'rgba(252, 240, 250, 0.98)']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.modalHandle} />
            <TouchableOpacity style={styles.modalClose} onPress={() => setTryOnItem(null)}><Feather name="x" size={16} color="#6a4862" /></TouchableOpacity>
            
            <Text style={styles.modalTitle}>Virtual Try-On</Text>
            <Text style={styles.modalSub}>See how this looks on you</Text>

            {tryOnStep === 'preview' && tryOnItem && (
              <View>
                <View style={styles.tpPreview}>
                  <Image source={{ uri: tryOnItem.img }} style={styles.tpImg} />
                  <LinearGradient colors={['transparent', 'rgba(60, 30, 90, 0.82)']} style={StyleSheet.absoluteFillObject} />
                  <View style={styles.arBadge}><Text style={styles.arBadgeTxt}>AR MODE</Text></View>
                  <Text style={styles.tpName}>{tryOnItem.name}</Text>
                </View>
                <View style={styles.mActs}>
                  <TouchableOpacity style={[styles.mBtn, { flex: 1.4 }]} onPress={startCamera}>
                    <LinearGradient colors={['#e890a8', '#c878b0', '#9878c8']} style={StyleSheet.absoluteFillObject} />
                    <Text style={styles.mBtnTxtW}>📷 Start Try-On</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.mBtnS} onPress={() => { setWornId(tryOnItem.id); setTryOnItem(null); }}>
                    <Text style={styles.mBtnTxtG}>✓ Wear Today</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {tryOnStep === 'loading' && (
              <View style={styles.stLoad}>
                <ActivityIndicator size="large" color="#e890a8" />
                <Text style={styles.loadMsg}>Initialising AR...</Text>
                <Text style={styles.loadSub}>Preparing camera</Text>
              </View>
            )}

            {tryOnStep === 'camera' && (
              <View>
                <View style={styles.camVp}>
                  <Text style={{ color: 'white', opacity: 0.5, textAlign: 'center', marginTop: '50%' }}>Camera View Active</Text>
                  <View style={styles.camUiTop}>
                    <Text style={styles.camLbl}><View style={styles.rdot}/> LIVE AR</Text>
                    <Text style={styles.camQ}>HD · FRONT</Text>
                  </View>
                  <View style={styles.bodyGuide} />
                  <View style={styles.scanLine} />
                </View>
                <View style={styles.mActs}>
                  <TouchableOpacity style={[styles.mBtn, { flex: 1.4 }]} onPress={() => setTryOnStep('preview')}>
                    <LinearGradient colors={['#e890a8', '#c878b0', '#9878c8']} style={StyleSheet.absoluteFillObject} />
                    <Text style={styles.mBtnTxtW}>📸 Capture</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.mBtnS} onPress={() => setTryOnStep('preview')}>
                    <Text style={[styles.mBtnTxtG, { color: '#c0392b' }]}>✕ Stop</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── CHAT MODAL ── */}
      <Modal visible={isChatOpen} transparent animationType="slide">
        <View style={styles.chatOverlay}>
          <KeyboardAvoidingView style={styles.chatSheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <LinearGradient colors={['rgba(252, 242, 252, 0.94)', 'rgba(252, 242, 252, 0.98)']} style={StyleSheet.absoluteFillObject} />
            
            <View style={styles.chatHdr}>
              <View style={styles.chatHnd} />
              <View style={styles.chatHdrAv}><LinearGradient colors={['#e890a8', '#9878c8']} style={StyleSheet.absoluteFillObject} /><Text style={{color:'#fff'}}>✦</Text><View style={styles.chatAvDot}/></View>
              <View style={styles.chatInfo}>
                <Text style={styles.chatHdrName}>AHVI Stylist</Text>
                <Text style={styles.chatHdrStat}><View style={styles.sdot}/> Your personal AI stylist</Text>
              </View>
              <TouchableOpacity style={styles.chatX} onPress={() => setIsChatOpen(false)}><Feather name="x" size={16} color="#6a4862" /></TouchableOpacity>
            </View>

            <ScrollView style={styles.chatMsgs} contentContainerStyle={{ padding: 16 }}>
              {chatMsgs.map((m, i) => (
                <View key={i} style={[styles.msgRow, m.role === 'user' ? styles.msgRowUsr : styles.msgRowAi]}>
                  {m.role === 'ai' && <View style={styles.mAvAi}><Text style={{color:'#fff', fontSize:12}}>✦</Text></View>}
                  <View style={[styles.mBbl, m.role === 'user' ? styles.mBblUsr : styles.mBblAi]}>
                    {m.role === 'user' && <LinearGradient colors={['#e890a8', '#9878c8']} style={StyleSheet.absoluteFillObject} />}
                    <Text style={m.role === 'user' ? styles.mTxtUsr : styles.mTxtAi}>{m.text}</Text>
                  </View>
                  {m.role === 'user' && <View style={styles.mAvUsr}><Text style={{fontSize:12}}>👤</Text></View>}
                </View>
              ))}
            </ScrollView>

            <View style={styles.chatQp}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['What to wear today? 🌤️', 'Style tips 👔', 'First date outfit 💫'].map(q => (
                  <TouchableOpacity key={q} style={styles.qpBtn} onPress={() => handleSendChat(q)}>
                    <Text style={styles.qpTxt}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.chatBar}>
              <TouchableOpacity style={styles.chatMic}><Feather name="mic" size={16} color="#e0a0b0" /></TouchableOpacity>
              <View style={styles.chatWrap}>
                <TextInput style={styles.chatIn} placeholder="Ask your stylist..." placeholderTextColor="#8a6080" value={chatInput} onChangeText={setChatInput} />
              </View>
              <TouchableOpacity style={styles.chatSend} onPress={() => handleSendChat()}>
                <LinearGradient colors={['#e890a8', '#9878c8']} style={StyleSheet.absoluteFillObject} />
                <Feather name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // ── HEADER ──
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  hdrLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 242, 248, 0.82)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)', alignItems: 'center', justifyContent: 'center' },
  hdrH1: { fontSize: 28, fontWeight: '700', color: '#000', letterSpacing: -0.5 },
  hdrSub: { fontSize: 11, fontWeight: '500', color: '#4a3248', textTransform: 'uppercase', opacity: 0.7, marginTop: 2 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255, 245, 250, 0.88)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.75)' },
  dateText: { fontSize: 10, fontWeight: '600', color: '#4a3248' },
  timeText: { fontSize: 9, fontWeight: '500', color: '#4a3248', opacity: 0.8 },

  // ── WEATHER ──
  weatherCard: { marginHorizontal: 16, marginTop: 10, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.88)', overflow: 'hidden' },
  wLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  wIcon: { fontSize: 30 },
  wLabel: { fontSize: 13, fontWeight: '600', color: '#4a3248' },
  wTip: { fontSize: 11, color: '#4a3248', opacity: 0.75, marginTop: 2 },
  wTemp: { fontSize: 36, fontWeight: '300', color: '#c878b0' }, // Gradient simulated with solid color

  sugBanner: { marginHorizontal: 16, marginTop: 14, backgroundColor: 'rgba(225, 160, 195, 0.12)', borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(225, 160, 195, 0.3)' },
  sbIcon: { fontSize: 20 },
  sbTxt: { fontSize: 12, fontWeight: '600', color: '#5a3458' },

  // ── CAROUSEL ──
  carOuter: { marginHorizontal: 16, marginTop: 16, borderRadius: 28, overflow: 'hidden', height: width * 1.15, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)' },
  carSlide: { width: width - 32, height: '100%', position: 'relative' },
  slideImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  sTop: { padding: 18, flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
  heroBadge: { backgroundColor: 'rgba(255, 240, 248, 0.65)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.55)' },
  heroBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  sActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 238, 248, 0.45)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.4)', alignItems: 'center', justifyContent: 'center' },
  
  sBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, zIndex: 2 },
  sMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  sName: { fontSize: 32, fontWeight: '600', color: '#fff' },
  sDesc: { fontSize: 11, color: 'rgba(255, 255, 255, 0.88)', marginTop: 4 },
  sCounter: { backgroundColor: 'rgba(255, 255, 255, 0.28)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.55)' },
  sCounterTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 14 },
  tag: { backgroundColor: 'rgba(255, 255, 255, 0.24)', paddingHorizontal: 11, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.4)' },
  tagTxt: { fontSize: 10, fontWeight: '600', color: '#fff' },
  
  tryBtn: { padding: 16, borderRadius: 18, alignItems: 'center', overflow: 'hidden' },
  tryBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },

  dots: { position: 'absolute', bottom: 95, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6, zIndex: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 242, 250, 0.72)' },
  dotOn: { width: 22, backgroundColor: '#fff' },

  // ── OPTIONS ──
  secTitle: { fontSize: 20, fontWeight: '600', color: '#4a3248', marginHorizontal: 20, marginTop: 24, marginBottom: 14 },
  optsGrid: { flexDirection: 'row', marginHorizontal: 16, gap: 10 },
  optCard: { flex: 1, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.7)', overflow: 'hidden' },
  optImgWrap: { height: 110, position: 'relative' },
  optImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  optBody: { padding: 10 },
  optName: { fontSize: 11, fontWeight: '700', color: '#4a3248', marginBottom: 2 },
  optSub: { fontSize: 9, color: '#4a3248', opacity: 0.75, marginBottom: 8, minHeight: 24 },
  optIcons: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  optIco: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(255, 242, 250, 0.72)', borderWidth: 1, borderColor: 'rgba(196, 160, 180, 0.3)', alignItems: 'center', justifyContent: 'center' },
  optActs: { flexDirection: 'row', gap: 5 },
  optBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', overflow: 'hidden' },
  optBtnWear: { backgroundColor: '#e890a8' }, // Fallback for gradient
  optBtnWearWorn: { backgroundColor: 'rgba(130, 184, 154, 0.6)', borderWidth: 1, borderColor: 'rgba(130, 184, 154, 0.5)' },
  optBtnWearTxt: { fontSize: 9, fontWeight: '700', color: '#fff', zIndex: 1 },
  optBtnTry: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(210, 150, 190, 0.15)', borderWidth: 1, borderColor: 'rgba(210, 150, 190, 0.4)', alignItems: 'center' },
  optBtnTryTxt: { fontSize: 9, fontWeight: '700', color: '#e0a0b0' },

  // ── FAB ──
  fab: { position: 'absolute', bottom: 30, right: 20, flexDirection: 'row', alignItems: 'center', padding: 12, paddingRight: 18, borderRadius: 50, gap: 10, overflow: 'hidden', shadowColor: '#2109', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20 },
  fabPulse: { position: 'absolute', inset: 0, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(210, 150, 190, 0.4)' },
  fabAv: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255, 238, 248, 0.45)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.35)' },
  fabAvDot: { position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#82b89a', borderWidth: 2, borderColor: 'rgba(180, 130, 190, 0.5)' },
  fabTxt: { justifyContent: 'center' },
  fabLbl: { fontSize: 13, fontWeight: '600', color: '#fff' },
  fabSub: { fontSize: 10, fontWeight: '500', color: 'rgba(255, 255, 255, 0.95)' },

  // ── MODALS ──
  overlay: { flex: 1, backgroundColor: 'rgba(180, 150, 210, 0.2)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: 'rgba(252, 240, 250, 0.94)', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 16, overflow: 'hidden' },
  modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(196, 160, 180, 0.3)', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalClose: { position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 245, 250, 0.88)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  modalTitle: { fontSize: 28, fontWeight: '600', color: '#c878b0' },
  modalSub: { fontSize: 13, color: '#4a3248', opacity: 0.8, marginBottom: 20 },
  
  tpPreview: { height: 260, borderRadius: 20, overflow: 'hidden', position: 'relative', marginBottom: 18 },
  tpImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  arBadge: { position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(210, 150, 190, 0.3)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(210, 150, 190, 0.5)' },
  arBadgeTxt: { color: '#6a4fb8', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  tpName: { position: 'absolute', bottom: 18, left: 18, fontSize: 26, fontWeight: '600', color: '#fff' },
  
  mActs: { flexDirection: 'row', gap: 10 },
  mBtn: { padding: 15, borderRadius: 16, alignItems: 'center', overflow: 'hidden' },
  mBtnTxtW: { color: '#fff', fontSize: 14, fontWeight: '600' },
  mBtnS: { flex: 1, padding: 15, borderRadius: 16, backgroundColor: 'rgba(255, 245, 250, 0.88)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.75)', alignItems: 'center' },
  mBtnTxtG: { color: '#e0a0b0', fontSize: 14, fontWeight: '600' },

  stLoad: { alignItems: 'center', paddingVertical: 40 },
  loadMsg: { fontSize: 15, fontWeight: '600', color: '#4a3248', marginTop: 14 },
  loadSub: { fontSize: 13, color: '#4a3248', opacity: 0.8 },

  camVp: { height: 350, backgroundColor: '#000', borderRadius: 20, overflow: 'hidden', marginBottom: 16, position: 'relative' },
  camUiTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', padding: 14, backgroundColor: 'rgba(0,0,0,0.3)' },
  camLbl: { color: '#fff', fontSize: 11, fontWeight: '600', flexDirection: 'row', alignItems: 'center' },
  rdot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e8856a', marginRight: 5 },
  camQ: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '500' },
  bodyGuide: { position: 'absolute', top: '10%', left: '25%', right: '25%', bottom: '10%', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 100, borderStyle: 'dashed' },
  scanLine: { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: 'rgba(210, 150, 190, 0.9)' },

  // ── CHAT ──
  chatOverlay: { flex: 1, backgroundColor: 'rgba(180, 150, 210, 0.2)', justifyContent: 'flex-end' },
  chatSheet: { backgroundColor: 'rgba(252, 242, 252, 0.94)', borderTopLeftRadius: 28, borderTopRightRadius: 28, height: '88%', overflow: 'hidden' },
  chatHdr: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(225, 160, 195, 0.35)' },
  chatHnd: { position: 'absolute', top: 8, left: '50%', marginLeft: -18, width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(196, 160, 180, 0.28)' },
  chatHdrAv: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  chatAvDot: { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#82b89a', borderWidth: 2, borderColor: '#fff' },
  chatInfo: { flex: 1 },
  chatHdrName: { fontSize: 20, fontWeight: '600', color: '#c878b0' },
  chatHdrStat: { fontSize: 11, color: '#4a3248', opacity: 0.8 },
  sdot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#82b89a', marginRight: 4 },
  chatX: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 245, 250, 0.88)', alignItems: 'center', justifyContent: 'center' },
  
  chatMsgs: { flex: 1 },
  msgRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  msgRowUsr: { justifyContent: 'flex-end' },
  msgRowAi: { justifyContent: 'flex-start' },
  mAvAi: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#c878b0', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  mAvUsr: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255, 245, 250, 0.88)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.72)', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  mBbl: { maxWidth: '80%', padding: 12, paddingHorizontal: 16, borderRadius: 20 },
  mBblAi: { backgroundColor: 'rgba(255, 235, 245, 0.95)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.85)' },
  mBblUsr: { borderBottomRightRadius: 4, overflow: 'hidden' },
  mTxtAi: { fontSize: 13.5, color: '#4a3248', lineHeight: 20 },
  mTxtUsr: { fontSize: 13.5, color: '#fff', lineHeight: 20 },

  chatQp: { paddingHorizontal: 16, paddingBottom: 10 },
  qpBtn: { backgroundColor: 'rgba(255, 245, 250, 0.88)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.75)', marginRight: 8 },
  qpTxt: { fontSize: 12, fontWeight: '600', color: '#e0a0b0' },

  chatBar: { flexDirection: 'row', padding: 12, paddingBottom: 24, backgroundColor: 'rgba(255, 238, 232, 0.28)', borderTopWidth: 1, borderTopColor: 'rgba(196, 160, 180, 0.18)', alignItems: 'center' },
  chatMic: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 235, 245, 0.95)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.85)' },
  chatWrap: { flex: 1, marginHorizontal: 10, backgroundColor: 'rgba(255, 244, 240, 0.8)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.8)', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  chatIn: { fontSize: 14, color: '#4a3248' },
  chatSend: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }
});