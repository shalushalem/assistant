import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { databases, appwriteConfig } from '../lib/appwrite';
import { useGlobalContext } from '../context/GlobalProvider';
import { Query } from 'react-native-appwrite';

const { width } = Dimensions.get('window');

// --- HELPER: Identify item types robustly ---
const getCategoryType = (category = '') => {
  const cat = category.toLowerCase();
  const tops = ['top', 'shirt', 't-shirt', 'blouse', 'sweater', 'hoodie', 'jacket', 'outer', 'dress'];
  const bottoms = ['bottom', 'pant', 'jeans', 'skirt', 'short', 'trouser', 'cargo'];
  const footwears = ['shoe', 'sneaker', 'heel', 'boot', 'sandal', 'footwear', 'flat'];

  if (tops.some(kw => cat.includes(kw))) return 'top';
  if (bottoms.some(kw => cat.includes(kw))) return 'bottom';
  if (footwears.some(kw => cat.includes(kw))) return 'footwear';
  return 'accessory';
};

interface WardrobeItem {
  $id: string;
  name: string;
  category: string;
  image_url: string;
  masked_url?: string;
}

const StyleBoardScreen = () => {
  const { user } = useGlobalContext();
  const { ids } = useLocalSearchParams(); 
  
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [fullWardrobe, setFullWardrobe] = useState<WardrobeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShuffling, setIsShuffling] = useState(false);
  
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [savedBoards, setSavedBoards] = useState<any[]>([]); 

  useEffect(() => {
    fetchBoardItems();
  }, [ids]);

  const fetchBoardItems = async () => {
    if (!user?.$id || !ids) {
      setIsLoading(false);
      return;
    }

    try {
      const targetIds = (ids as string).split(',').map(id => id.trim());
      
      const response = await databases.listDocuments(
        appwriteConfig.databaseId!,
        appwriteConfig.outfitCollectionId!,
        [Query.equal('user_id', user.$id)]
      );

      const allItems = response.documents as unknown as WardrobeItem[];
      setFullWardrobe(allItems);

      const selectedItems = allItems.filter(doc => targetIds.includes(doc.$id));
      setItems(selectedItems);
    } catch (error) {
      console.error("Error fetching board items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLock = (id: string) => {
    setLockedIds(prev => 
      prev.includes(id) ? prev.filter(lockedId => lockedId !== id) : [...prev, id]
    );
  };

  const handleShuffle = () => {
    setIsShuffling(true);
    
    setTimeout(() => {
      const shuffledOutfit = items.map(currentItem => {
        if (lockedIds.includes(currentItem.$id)) return currentItem;

        const currentType = getCategoryType(currentItem.category);
        const alternatives = fullWardrobe.filter(wardrobeItem => 
          getCategoryType(wardrobeItem.category) === currentType && 
          wardrobeItem.$id !== currentItem.$id
        );

        if (alternatives.length > 0) {
          const randomIndex = Math.floor(Math.random() * alternatives.length);
          return alternatives[randomIndex];
        }
        return currentItem;
      });

      setItems(shuffledOutfit);
      setIsShuffling(false);
    }, 400); 
  };

  const handleSaveBoard = () => {
    const currentIds = items.map(item => item.$id).join(',');
    router.push({
      pathname: '/save-style-card', 
      params: { ids: currentIds }
    });
  };

  const mainPiece = items.find(item => getCategoryType(item.category) === 'top') || items[0];
  const sideItems = items.filter(item => item.$id !== mainPiece?.$id);
  
  const leftColumnItems: WardrobeItem[] = [];
  const rightColumnItems: WardrobeItem[] = [];

  const bottomPiece = sideItems.find(item => getCategoryType(item.category) === 'bottom');
  const footwearPiece = sideItems.find(item => getCategoryType(item.category) === 'footwear');
  const accessoryPieces = sideItems.filter(item => getCategoryType(item.category) === 'accessory');
  const leftovers = sideItems.filter(item => item !== bottomPiece && item !== footwearPiece && !accessoryPieces.includes(item));

  if (bottomPiece) leftColumnItems.push(bottomPiece);
  if (footwearPiece) rightColumnItems.push(footwearPiece);
  
  if (accessoryPieces.length > 0) leftColumnItems.push(accessoryPieces[0]);
  if (accessoryPieces.length > 1) rightColumnItems.push(accessoryPieces[1]);

  leftovers.forEach(item => {
    if (leftColumnItems.length <= rightColumnItems.length) leftColumnItems.push(item);
    else rightColumnItems.push(item);
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── HEADER ── */}
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="chevron-left" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        
        <Text style={styles.sectionTitle}>Style <Text style={{ fontStyle: 'italic', color: '#b8a8e8' }}>Board</Text></Text>
        
        <TouchableOpacity style={styles.btnSecondary} onPress={() => setIsSavedOpen(true)}>
          <Text style={styles.btnSecondaryText}>Saved</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{savedBoards.length}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── MAIN CANVAS ── */}
      <View style={styles.canvasContainer}>
        {isLoading || isShuffling ? (
          <ActivityIndicator size="large" color="#e07090" />
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, opacity: 0.5, marginBottom: 10 }}>✨</Text>
            <Text style={styles.emptyTitle}>No items found</Text>
            <Text style={styles.emptySub}>Ahvi couldn't find those pieces.{'\n'}Try generating a new look.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.canvas} showsVerticalScrollIndicator={false}>
            {/* Left Column */}
            <View style={styles.sideColumn}>
              {leftColumnItems.map(item => (
                <View key={item.$id} style={styles.sideItem}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => toggleLock(item.$id)}>
                    <View style={[styles.glassCard, styles.sideFrame, lockedIds.includes(item.$id) && styles.lockedBorder]}>
                      {lockedIds.includes(item.$id) && (
                        <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} opacity={0.1} />
                      )}
                      <Image source={{ uri: item.masked_url || item.image_url }} style={styles.imageFull} resizeMode="contain" />
                      {lockedIds.includes(item.$id) && (
                        <View style={styles.lockIconOverlay}>
                          <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} />
                          <Feather name="lock" size={10} color="#fff" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.sideName} numberOfLines={1}>{item.category || 'Item'}</Text>
                </View>
              ))}
            </View>

            {/* Center Column */}
            {mainPiece && (
              <View style={styles.centerColumn}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => toggleLock(mainPiece.$id)} style={styles.centerFrameWrap}>
                  <View style={[styles.glassCard, styles.centerFrame, lockedIds.includes(mainPiece.$id) && styles.lockedBorder]}>
                    {lockedIds.includes(mainPiece.$id) && (
                        <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} opacity={0.1} />
                    )}
                    <Image source={{ uri: mainPiece.masked_url || mainPiece.image_url }} style={styles.imageFull} resizeMode="contain" />
                    {lockedIds.includes(mainPiece.$id) && (
                      <View style={[styles.lockIconOverlay, { width: 26, height: 26, borderRadius: 13, top: 8, right: 8 }]}>
                        <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} />
                        <Feather name="lock" size={14} color="#fff" />
                      </View>
                    )}
                  </View>
                  <View style={styles.sigBadge}>
                    <BlurView intensity={80} tint="light" style={styles.sigBadgeBlur}>
                      <Text style={styles.sigBadgeText}>✦ Main Piece</Text>
                    </BlurView>
                  </View>
                </TouchableOpacity>
                <Text style={styles.centerTag}>{mainPiece.category}</Text>
                <Text style={styles.centerName}>{mainPiece.name}</Text>
              </View>
            )}

            {/* Right Column */}
            <View style={styles.sideColumn}>
              {rightColumnItems.map(item => (
                <View key={item.$id} style={styles.sideItem}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => toggleLock(item.$id)}>
                    <View style={[styles.glassCard, styles.sideFrame, lockedIds.includes(item.$id) && styles.lockedBorder]}>
                      {lockedIds.includes(item.$id) && (
                        <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} opacity={0.1} />
                      )}
                      <Image source={{ uri: item.masked_url || item.image_url }} style={styles.imageFull} resizeMode="contain" />
                      {lockedIds.includes(item.$id) && (
                        <View style={styles.lockIconOverlay}>
                          <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} />
                          <Feather name="lock" size={10} color="#fff" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.sideName} numberOfLines={1}>{item.category || 'Item'}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* ── BOTTOM BAR ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={[styles.btnSecondary, { paddingHorizontal: 20 }]} 
          onPress={handleShuffle}
          disabled={isLoading || isShuffling || items.length === 0}
        >
          <Feather name="shuffle" size={14} color="#6b6b6b" style={{ marginRight: 6 }} />
          <Text style={styles.btnSecondaryText}>Shuffle</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveBoard}>
          <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} />
          <Feather name="star" size={14} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.btnPrimaryText}>Save Style Card</Text>
        </TouchableOpacity>
      </View>

      {/* ── SAVED ITEMS MODAL ── */}
      <Modal visible={isSavedOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <BlurView intensity={70} tint="light" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saved <Text style={{ fontStyle: 'italic', color: '#b8a8e8' }}>Items</Text></Text>
              <TouchableOpacity onPress={() => setIsSavedOpen(false)} style={styles.iconBtn}>
                <Ionicons name="close" size={24} color="#6b6b6b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={{ fontSize: 40, opacity: 0.5, marginBottom: 10, alignSelf: 'center', marginTop: 80 }}>🔖</Text>
              <Text style={styles.emptySub}>No style cards saved yet.</Text>
            </View>
          </BlurView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default StyleBoardScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10, marginTop: 10 },
  sectionTitle: { fontFamily: 'System', fontSize: 28, fontWeight: '300', color: '#1a1a1a' },
  iconBtn: { padding: 4 },
  btnSecondary: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 100, backgroundColor: 'rgba(255, 255, 255, 0.6)', alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { color: '#6b6b6b', fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  badge: { backgroundColor: 'rgba(123, 108, 200, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 6 },
  badgeText: { color: '#7b6cc8', fontSize: 9, fontWeight: 'bold' },
  canvasContainer: { flex: 1, justifyContent: 'center' },
  canvas: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 10, gap: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 22, color: '#1a1a1a', fontWeight: '300', marginBottom: 8 },
  emptySub: { fontSize: 12, color: '#6b6b6b', textAlign: 'center', maxWidth: 260, lineHeight: 18 },
  glassCard: { backgroundColor: 'rgba(255, 255, 255, 0.65)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.9)', overflow: 'hidden', shadowColor: '#7850B4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 3 },
  sideColumn: { flexDirection: 'column', justifyContent: 'center', gap: 16, width: (width * 0.22) },
  sideItem: { alignItems: 'center', gap: 6 },
  sideFrame: { width: '100%', aspectRatio: 0.8, position: 'relative' },
  lockedBorder: { borderColor: '#e07090', borderWidth: 2 },
  lockIconOverlay: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', shadowColor: '#e07090', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  sideName: { color: '#6b6b6b', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  centerColumn: { alignItems: 'center', zIndex: 2, width: (width * 0.45) },
  centerFrameWrap: { position: 'relative', marginBottom: 15, width: '100%' },
  centerFrame: { width: '100%', aspectRatio: 0.7, position: 'relative' },
  sigBadge: { position: 'absolute', top: -12, alignSelf: 'center', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.8)' },
  sigBadgeBlur: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255, 255, 255, 0.4)' },
  sigBadgeText: { color: '#1a1a1a', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  centerTag: { color: '#e07090', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: '600' },
  centerName: { color: '#1a1a1a', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  imageFull: { width: '100%', height: '100%' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 20, gap: 12 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 100, overflow: 'hidden', shadowColor: '#9680D8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  btnPrimaryText: { color: '#fff', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(20, 12, 36, 0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, height: '85%', backgroundColor: 'rgba(255, 255, 255, 0.85)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.95)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 26, color: '#1a1a1a', fontWeight: '300' },
  modalBody: { flex: 1, padding: 24 },
});