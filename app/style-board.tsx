import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { databases, appwriteConfig } from '../lib/appwrite';
import { useGlobalContext } from '../context/GlobalProvider';
import { Query } from 'react-native-appwrite';

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

      // Maintain the order of the IDs provided by the LLM
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
        if (lockedIds.includes(currentItem.$id)) {
          return currentItem;
        }

        const alternatives = fullWardrobe.filter(
          wardrobeItem => 
            wardrobeItem.category?.toLowerCase() === currentItem.category?.toLowerCase() && 
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

  // --- SMARTER MAIN PIECE DETECTION ---
  const mainPieceKeywords = ['top', 'dress', 'shirt', 't-shirt', 'jacket', 'sweater', 'suit', 'kurta', 'hoodie'];
  const mainPiece = items.find(item => 
    mainPieceKeywords.some(keyword => item.category?.toLowerCase().includes(keyword))
  ) || items[0]; // Fallback to the first item if no keyword matches

  const sideItems = items.filter(item => item.$id !== mainPiece?.$id);
  
  // Distribute remaining items evenly between left and right columns
  const leftColumnItems = sideItems.filter((_, index) => index % 2 === 0);
  const rightColumnItems = sideItems.filter((_, index) => index % 2 !== 0);

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
          <ScrollView contentContainerStyle={styles.canvas} showsVerticalScrollIndicator={false}>
            {/* Left Column */}
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
                  <Text style={styles.sideName} numberOfLines={2}>{item.name}</Text>
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
                <Text style={styles.centerName} numberOfLines={2}>{mainPiece.name}</Text>
              </View>
            )}

            {/* Right Column */}
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
                  <Text style={styles.sideName} numberOfLines={2}>{item.name}</Text>
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
    alignItems: 'center', // <-- Restored to 'center' for perfect masonry anchoring
    paddingVertical: 40,
    paddingHorizontal: 10,
    gap: 15,
  },
  emptyState: { alignItems: 'center', opacity: 0.6 },
  emptyText: { color: '#CDCDE0', textAlign: 'center', marginTop: 10, fontSize: 16, fontStyle: 'italic' },
  sideColumn: { flexDirection: 'column', gap: 20, width: 90 },
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
  centerTag: { color: '#FF9C01', fontSize: 10, textTransform: 'uppercase', marginBottom: 4, fontWeight: 'bold', textAlign: 'center' },
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