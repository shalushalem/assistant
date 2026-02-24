import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { databases, appwriteConfig } from '../lib/appwrite';
import { useGlobalContext } from '../context/GlobalProvider';
import { Query } from 'react-native-appwrite';

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

  // --- UPDATED: Smart Shuffle based on broad category ---
  const handleShuffle = () => {
    setIsShuffling(true);
    
    setTimeout(() => {
      const shuffledOutfit = items.map(currentItem => {
        if (lockedIds.includes(currentItem.$id)) {
          return currentItem;
        }

        const currentType = getCategoryType(currentItem.category);
        
        // Find alternatives of the SAME broader type (e.g., any bottom for a bottom)
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
    alert("Style Board Saved!");
  };

  // --- NEW: Smart Column Distributor ---
  const mainPiece = items.find(item => getCategoryType(item.category) === 'top') || items[0];
  const sideItems = items.filter(item => item.$id !== mainPiece?.$id);
  
  const leftColumnItems: WardrobeItem[] = [];
  const rightColumnItems: WardrobeItem[] = [];

  const bottomPiece = sideItems.find(item => getCategoryType(item.category) === 'bottom');
  const footwearPiece = sideItems.find(item => getCategoryType(item.category) === 'footwear');
  const accessoryPieces = sideItems.filter(item => getCategoryType(item.category) === 'accessory');
  const leftovers = sideItems.filter(item => item !== bottomPiece && item !== footwearPiece && !accessoryPieces.includes(item));

  // Balance the layout logically
  if (bottomPiece) leftColumnItems.push(bottomPiece);
  if (footwearPiece) rightColumnItems.push(footwearPiece);
  
  if (accessoryPieces.length > 0) leftColumnItems.push(accessoryPieces[0]);
  if (accessoryPieces.length > 1) rightColumnItems.push(accessoryPieces[1]);

  // Fail-safe for any weird backend anomalies
  leftovers.forEach(item => {
    if (leftColumnItems.length <= rightColumnItems.length) leftColumnItems.push(item);
    else rightColumnItems.push(item);
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Style <Text style={{ color: '#FF9C01', fontStyle: 'italic' }}>Board</Text></Text>
        
        <TouchableOpacity style={styles.savedBtn} onPress={() => setIsSavedOpen(true)}>
          <Text style={styles.savedBtnText}>SAVED</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>{savedBoards.length}</Text></View>
        </TouchableOpacity>
      </View>

      {/* MAIN CANVAS */}
      <View style={styles.canvasContainer}>
        {isLoading || isShuffling ? (
          <ActivityIndicator size="large" color="#FF9C01" />
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles" size={40} color="#CDCDE0" />
            <Text style={styles.emptyText}>Ahvi couldn't find those items.{'\n'}Try generating a new look.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.canvas}>
            {/* Left Column (Bottoms & Acc 1) */}
            <View style={styles.sideColumn}>
              {leftColumnItems.map(item => (
                <View key={item.$id} style={styles.sideItem}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => toggleLock(item.$id)}>
                    <View style={[styles.sideFrame, lockedIds.includes(item.$id) && styles.lockedBorder]}>
                      <Image source={{ uri: item.image_url }} style={styles.imageFull} resizeMode="cover" />
                      {lockedIds.includes(item.$id) && (
                        <View style={styles.lockIconOverlay}>
                          <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.sideName} numberOfLines={1}>{item.category || 'Item'}</Text>
                </View>
              ))}
            </View>

            {/* Center Column (Main Piece) */}
            {mainPiece && (
              <View style={styles.centerColumn}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => toggleLock(mainPiece.$id)} style={styles.centerFrameWrap}>
                  <View style={[styles.centerFrame, lockedIds.includes(mainPiece.$id) && styles.lockedBorderCenter]}>
                    <Image source={{ uri: mainPiece.image_url }} style={styles.imageFull} resizeMode="cover" />
                    {lockedIds.includes(mainPiece.$id) && (
                      <View style={styles.lockIconOverlayCenter}>
                        <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <View style={styles.sigBadge}>
                    <Text style={styles.sigBadgeText}>✦ Main Piece</Text>
                  </View>
                </TouchableOpacity>
                <Text style={styles.centerTag}>{mainPiece.category}</Text>
                <Text style={styles.centerName}>{mainPiece.name}</Text>
              </View>
            )}

            {/* Right Column (Footwear & Acc 2) */}
            <View style={styles.sideColumn}>
              {rightColumnItems.map(item => (
                <View key={item.$id} style={styles.sideItem}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => toggleLock(item.$id)}>
                    <View style={[styles.sideFrame, lockedIds.includes(item.$id) && styles.lockedBorder]}>
                      <Image source={{ uri: item.image_url }} style={styles.imageFull} resizeMode="cover" />
                      {lockedIds.includes(item.$id) && (
                        <View style={styles.lockIconOverlay}>
                          <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
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

      {/* BOTTOM BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.shuffleBtn} 
          onPress={handleShuffle}
          disabled={isLoading || isShuffling || items.length === 0}
        >
          <Ionicons name="shuffle" size={18} color="#FFFFFF" />
          <Text style={styles.shuffleText}>Shuffle</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveActionBtn} onPress={handleSaveBoard}>
          <Text style={styles.saveActionText}>✦ Save Style Card</Text>
        </TouchableOpacity>
      </View>

      {/* SAVED ITEMS MODAL */}
      <Modal visible={isSavedOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saved <Text style={{ color: '#FF9C01', fontStyle: 'italic' }}>Items</Text></Text>
              <TouchableOpacity onPress={() => setIsSavedOpen(false)}>
                <Ionicons name="close" size={28} color="#CDCDE0" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Ionicons name="sparkles-outline" size={48} color="#CDCDE0" style={{ alignSelf: 'center', opacity: 0.5, marginTop: 100 }} />
              <Text style={styles.emptyText}>No style cards saved yet.</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default StyleBoardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#161622' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#232533',
    borderBottomWidth: 1,
    borderBottomColor: '#161622',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  savedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF9C01',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  savedBtnText: { color: '#FF9C01', fontSize: 10, fontWeight: 'bold', marginRight: 6 },
  badge: { backgroundColor: '#FF9C01', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#161622', fontSize: 9, fontWeight: 'bold' },
  canvasContainer: { flex: 1, justifyContent: 'center' },
  canvas: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 10,
    gap: 15,
  },
  emptyState: { alignItems: 'center', opacity: 0.6 },
  emptyText: { color: '#CDCDE0', textAlign: 'center', marginTop: 10, fontSize: 16, fontStyle: 'italic' },
  sideColumn: { flexDirection: 'column', justifyContent: 'center', gap: 20, width: 90 },
  sideItem: { alignItems: 'center', gap: 8 },
  sideFrame: {
    width: 80, height: 100, borderRadius: 12, backgroundColor: '#FFFFFF', overflow: 'hidden',
    borderWidth: 2, borderColor: '#232533', position: 'relative'
  },
  lockedBorder: {
    borderColor: '#FF9C01',
    borderWidth: 3,
  },
  lockIconOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 156, 1, 0.9)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideName: { color: '#CDCDE0', fontSize: 10, textTransform: 'uppercase', textAlign: 'center' },
  centerColumn: { alignItems: 'center', zIndex: 2, paddingHorizontal: 10 },
  centerFrameWrap: { position: 'relative', marginBottom: 15 },
  centerFrame: {
    width: 180, height: 260, borderRadius: 16, backgroundColor: '#FFFFFF', overflow: 'hidden',
    borderWidth: 3, borderColor: '#FF9C01',
    shadowColor: '#FF9C01', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10,
    position: 'relative'
  },
  lockedBorderCenter: {
    borderColor: '#FF4C4C', 
    borderWidth: 4,
  },
  lockIconOverlayCenter: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 156, 1, 0.9)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigBadge: {
    position: 'absolute', top: -12, alignSelf: 'center', backgroundColor: '#FF9C01',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
  },
  sigBadgeText: { color: '#161622', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  centerTag: { color: '#FF9C01', fontSize: 10, textTransform: 'uppercase', marginBottom: 4, fontWeight: 'bold' },
  centerName: { color: '#FFFFFF', fontSize: 18, fontStyle: 'italic', fontWeight: '600', textAlign: 'center' },
  imageFull: { width: '100%', height: '100%' },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#232533', borderTopWidth: 1, borderTopColor: '#161622',
  },
  shuffleBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#3A3D52', 
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 6 
  },
  shuffleText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  saveActionBtn: { backgroundColor: '#FF9C01', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 },
  saveActionText: { color: '#161622', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#161622', height: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#232533',
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  modalBody: { flex: 1, padding: 24 },
});