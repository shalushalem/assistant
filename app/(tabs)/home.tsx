import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Dimensions, 
  NativeSyntheticEvent, 
  NativeScrollEvent 
} from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CAROUSEL_WIDTH = width - 32; // Screen width minus padding

// Placeholder fashion images (replace with your actual assets later)
const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1000&auto=format&fit=crop',
];

export default function Home() {
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);

  // Sync carousel dots with scroll position
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveSlide(Math.round(index));
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HERO SECTION ── */}
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => router.push('/style-board')} // Mapping 'stylecard.html' to your style-board route
        style={styles.heroContainer}
      >
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.carousel}
        >
          {HERO_IMAGES.map((img, index) => (
            <Image 
              key={index} 
              source={{ uri: img }} 
              style={styles.heroImage} 
            />
          ))}
        </ScrollView>

        {/* Gradient Overlay (mimics CSS hero::after) */}
        <LinearGradient
          colors={['transparent', 'rgba(100, 50, 90, 0.12)', 'rgba(100, 50, 90, 0.55)']}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Glass Pill */}
        <BlurView intensity={40} tint="light" style={styles.heroPill}>
          <Text style={styles.heroPillText}>Style Your Look</Text>
        </BlurView>

        {/* Carousel Dots */}
        <View style={styles.dotsContainer}>
          {HERO_IMAGES.map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.dot, 
                activeSlide === i && styles.dotActive
              ]} 
            />
          ))}
        </View>
      </TouchableOpacity>

      {/* ── CARDS SECTION ── */}
      <View style={styles.cardsContainer}>
        {/* Prepare Card */}
        <TouchableOpacity 
          activeOpacity={0.8} 
          onPress={() => router.push('/chat')} // Assuming prepare/plan uses the AI chat
          style={styles.card}
        >
          <View style={styles.cardImgWrap}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?q=80&w=500&auto=format&fit=crop' }} 
              style={styles.cardImage} 
            />
          </View>
          <BlurView intensity={40} tint="light" style={styles.cardBody}>
            <Text style={styles.cardTitle}>Prepare</Text>
            <Text style={styles.cardSubtitle}>Plan + Pack outfits</Text>
          </BlurView>
        </TouchableOpacity>

        {/* Organise Card */}
        <TouchableOpacity 
          activeOpacity={0.8} 
          onPress={() => router.push('/wardrobe')} // Mapping 'organise.html' to wardrobe tab
          style={styles.card}
        >
          <View style={styles.cardImgWrap}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=500&auto=format&fit=crop' }} 
              style={styles.cardImage} 
            />
          </View>
          <BlurView intensity={40} tint="light" style={styles.cardBody}>
            <Text style={styles.cardTitle}>Organise</Text>
            <Text style={styles.cardSubtitle}>Manage wardrobe</Text>
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Spacer for bottom tab bar */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  
  /* ── HERO STYLES ── */
  heroContainer: {
    height: 310,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#B48CC8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  carousel: {
    flex: 1,
  },
  heroImage: {
    width: CAROUSEL_WIDTH,
    height: '100%',
    resizeMode: 'cover',
  },
  heroPill: {
    position: 'absolute',
    bottom: 20,
    left: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  heroPillText: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(60, 20, 80, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 26,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  dotActive: {
    backgroundColor: '#ffffff',
    width: 18,
  },

  /* ── CARD STYLES ── */
  cardsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  card: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  cardImgWrap: {
    height: 115,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardBody: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    paddingBottom: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Subtle tint over the blur
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.45)',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 10.5,
    fontWeight: '500',
    color: 'rgba(80, 80, 80, 0.75)',
    letterSpacing: 0.2,
  },
});