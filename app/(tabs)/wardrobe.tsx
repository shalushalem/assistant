import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Models, Query, ID } from 'react-native-appwrite';
import * as FileSystem from 'expo-file-system/legacy';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { useGlobalContext } from '../../context/GlobalProvider';
import { appwriteConfig, databases, uploadFile, deleteFileFromR2 } from '../../lib/appwrite';

const { width, height } = Dimensions.get('window');

const { databaseId, outfitCollectionId } = appwriteConfig;
const AI_ANALYZE_ENDPOINT = 'http://192.168.29.193:8000/api/analyze-image';
const BG_REMOVE_ENDPOINT = 'http://192.168.29.193:8000/api/remove-bg';

type OutfitItem = Models.Document & {
  name: string;
  category: string;
  tags: string[];
  image_url: string;
  user_id: string;
  status: string;
  image_id: string;
  masked_url?: string; 
  masked_id?: string;
  worn?: number; // Added for UI compatibility
};

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Footwear', 'Outerwear', 'Accessories', 'Dresses'];

export default function Wardrobe() {
  const { user } = useGlobalContext();
  const router = useRouter();

  const [items, setItems] = useState<OutfitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // --- Pagination State ---
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // --- Modals State ---
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLensVisible, setIsLensVisible] = useState(false);
  const [isInsightsVisible, setIsInsightsVisible] = useState(false);

  // --- Add Item State ---
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Tops');
  const [newItemTags, setNewItemTags] = useState('');
  const [newItemImages, setNewItemImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);

  const fetchItems = async (isLoadMore = false) => {
    if (!user?.$id) return;
    if (isLoadMore && (!hasMore || loadingMore)) return;

    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const limit = 25;
      const currentOffset = isLoadMore ? offset : 0;

      const response = await databases.listDocuments(
        databaseId!,
        outfitCollectionId!,
        [
          Query.equal('user_id', user.$id), 
          Query.orderDesc('$createdAt'),
          Query.limit(limit),
          Query.offset(currentOffset)
        ]
      );

      const fetchedItems = response.documents as OutfitItem[];

      // Map to ensure worn exists for UI
      const formattedItems = fetchedItems.map(item => ({ ...item, worn: item.worn || 0 }));

      if (isLoadMore) {
        setItems(prevItems => [...prevItems, ...formattedItems]);
      } else {
        setItems(formattedItems);
      }

      setHasMore(fetchedItems.length === limit);
      setOffset(currentOffset + limit);
    } catch (error) {
      console.error('Error fetching wardrobe:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchItems(false);
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    setOffset(0);
    fetchItems(false);
  };

  // --- Image Pick & AI Logic (Untouched) ---
  const pickImage = async (useCamera = false) => {
    try {
      let result;
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: !useCamera,
        quality: 0.5,
        base64: true, 
      };

      if (useCamera) {
        await ImagePicker.requestCameraPermissionsAsync();
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewItemImages(result.assets);
        analyzeImageWithAI(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not select image.');
    }
  };

  const analyzeImageWithAI = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset) return; 
    setAnalyzingImage(true);
    try {
      let base64Image = asset.base64;
      if (!base64Image && asset.uri) {
        base64Image = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
      }
      if (!base64Image) throw new Error("Could not get image data.");

      const response = await fetch(AI_ANALYZE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64Image }),
      });

      const data = await response.json();
      if (data && data.name) {
        setNewItemName(data.name);
        if (CATEGORIES.includes(data.category)) setNewItemCategory(data.category);
        if (data.tags && Array.isArray(data.tags)) setNewItemTags(data.tags.join(', '));
      }
    } catch (error) {
      console.error("AI Analysis Failed:", error);
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleDeleteItem = async (item: OutfitItem) => {
    Alert.alert("Delete Item", `Are you sure you want to remove ${item.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setItems((prevItems) => prevItems.filter((i) => i.$id !== item.$id));
          try {
            await databases.deleteDocument(databaseId!, outfitCollectionId!, item.$id);
            if (item.image_url) await deleteFileFromR2(item.image_url, 'raw');
            if (item.masked_url) await deleteFileFromR2(item.masked_url, 'wardrobe');
          } catch (error: any) {
            console.error("Delete Error: ", error);
            Alert.alert("Error", "Could not fully delete the item.");
            onRefresh();
          }
        },
      },
    ]);
  };

  const handleAddItem = async () => {
    if (newItemImages.length === 0 || !newItemName) {
      Alert.alert('Missing Fields', 'Please add at least one image and a name.');
      return;
    }

    setUploading(true);
    try {
      const tagsArray = newItemTags ? newItemTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

      for (const imageAsset of newItemImages) {
        if (!imageAsset) continue; 
        const uniqueId = ID.unique();
        const rawImageUrl = await uploadFile(imageAsset.uri, 'image', 'raw');

        let base64Image = imageAsset.base64;
        if (!base64Image && imageAsset.uri) {
          base64Image = await FileSystem.readAsStringAsync(imageAsset.uri, { encoding: 'base64' });
        }
        if (!base64Image) throw new Error("Could not read image base64 data.");

        const bgResponse = await fetch(BG_REMOVE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64Image }),
        });
        
        const bgData = await bgResponse.json();
        if (!bgData || !bgData.processed_image_base64) throw new Error(bgData?.error || "Failed to remove background.");

        const processedUri = FileSystem.cacheDirectory + `processed_${uniqueId}.png`;
        await FileSystem.writeAsStringAsync(processedUri, bgData.processed_image_base64, { encoding: 'base64' });

        const wardrobeImageUrl = await uploadFile(processedUri, 'image', 'wardrobe');
        if (!wardrobeImageUrl || !rawImageUrl) throw new Error("Failed to upload images to R2.");

        await databases.createDocument(databaseId!, outfitCollectionId!, uniqueId, {
          name: newItemName, category: newItemCategory, tags: tagsArray,             
          image_url: rawImageUrl, image_id: uniqueId, masked_url: wardrobeImageUrl, 
          masked_id: `${uniqueId}_processed`, user_id: user?.$id, status: 'ready'             
        });
      }

      Alert.alert('Success', 'Item(s) added to your wardrobe!');
      setIsModalVisible(false);
      setNewItemImages([]);
      setNewItemName('');
      setNewItemTags('');
      onRefresh();
    } catch (error: any) {
      console.error("Upload/Database Error: ", error);
      Alert.alert('Upload Failed', error.message || 'Something went wrong.');
    } finally {
      setUploading(false);
    }
  };

  const handleAhviAction = (action: string) => {
    setIsLensVisible(false);
    if (action === 'add') {
      setTimeout(() => setIsModalVisible(true), 300);
    } else if (action === 'chat') {
      router.push('/chat');
    } else {
      Alert.alert('Coming Soon', 'This feature is currently in development!');
    }
  };

  const filteredItems = selectedCategory === 'All' ? items : items.filter(item => item.category === selectedCategory);

  const getCatEmoji = (cat: string) => {
    const map: any = { Tops: '👕', Bottoms: '👖', Outerwear: '🧥', Footwear: '👟', Dresses: '👗', Accessories: '👜' };
    return map[cat] || '✨';
  };

  const renderItem = ({ item }: { item: OutfitItem }) => (
    <TouchableOpacity style={styles.itemCard} activeOpacity={0.9}>
      <Image source={{ uri: item.masked_url || item.image_url }} style={styles.itemImg} resizeMode="contain" />
      
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDeleteItem(item)}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <BlurView intensity={40} tint="light" style={styles.iconBtnBlur}>
          <Ionicons name="trash-outline" size={16} color="#c04868" />
        </BlurView>
      </TouchableOpacity>

      <BlurView intensity={20} tint="light" style={styles.itemBody}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.itemMeta}>
          <Text style={styles.itemCat}>{item.category}</Text>
          <View style={styles.wornBadge}>
            <Text style={styles.wornText}>{item.worn === 0 ? 'UNWORN' : `WORN ${item.worn}×`}</Text>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      
      {/* ── HEADER ── */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>My <Text style={{ fontStyle: 'italic', color: '#b8a8e8' }}>Wardrobe</Text></Text>
          <Text style={styles.sectionMeta}>{items.length} items</Text>
        </View>
        <View style={styles.headerBtnRow}>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setIsInsightsVisible(true)}>
            <Feather name="bar-chart-2" size={14} color="#6b6b6b" style={{ marginRight: 6 }} />
            <Text style={styles.btnSecondaryText}>Insights</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setIsModalVisible(true)}>
            <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} />
            <Feather name="plus" size={14} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.btnPrimaryText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── CATEGORIES ── */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setSelectedCategory(cat)}
              style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
            >
              {selectedCategory === cat && (
                <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} />
              )}
              <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={{ width: 20 }} />
        </ScrollView>
      </View>

      {/* ── ITEMS LIST ── */}
      {loading && !loadingMore ? (
        <ActivityIndicator size="large" color="#e07090" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.$id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e07090" />}
          onEndReached={() => fetchItems(true)} 
          onEndReachedThreshold={0.5} 
          ListFooterComponent={() => 
            loadingMore ? <ActivityIndicator size="small" color="#e07090" style={{ marginVertical: 20 }} /> : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40, opacity: 0.5, marginBottom: 10 }}>👗</Text>
              <Text style={styles.emptyTitle}>Your wardrobe is empty</Text>
              <Text style={styles.emptySub}>Add clothes, shoes, and accessories to build your digital closet.</Text>
            </View>
          }
        />
      )}

      {/* ── AHVI LENS FAB ── */}
      <TouchableOpacity style={styles.ahviFab} onPress={() => setIsLensVisible(true)} activeOpacity={0.85}>
        <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} start={{x:0,y:0}} end={{x:1,y:1}} />
        <Feather name="aperture" size={24} color="#fff" />
      </TouchableOpacity>

      {/* ── AHVI LENS BOTTOM SHEET ── */}
      <Modal visible={isLensVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsLensVisible(false)}>
          <View style={styles.lensOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.lensSheet}>
                <View style={styles.lensHandle} />
                <View style={styles.lensHeader}>
                  <View style={styles.lensBrandRow}>
                    <View style={styles.lensIconWrap}>
                      <LinearGradient colors={['rgba(123, 108, 200, 0.15)', 'rgba(224, 112, 144, 0.15)']} style={StyleSheet.absoluteFillObject} />
                      <Feather name="aperture" size={18} color="#e07090" />
                    </View>
                    <Text style={styles.lensBrandName}>AHVI Lens</Text>
                  </View>
                  <TouchableOpacity style={styles.lensCloseBtn} onPress={() => setIsLensVisible(false)}>
                    <Feather name="x" size={16} color="#6b6b6b" />
                  </TouchableOpacity>
                </View>

                <View style={styles.lensOptions}>
                  <TouchableOpacity style={styles.lensOption} onPress={() => handleAhviAction('find')}>
                    <View style={[styles.lensOptionIcon, { backgroundColor: 'rgba(123, 108, 200, 0.15)' }]}>
                      <Feather name="search" size={20} color="#7b6cc8" />
                    </View>
                    <View style={styles.lensOptionTextWrap}>
                      <Text style={styles.lensOptionTitle}>Find this</Text>
                      <Text style={styles.lensOptionDesc}>Shopping links for similar pieces.</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color="rgba(150, 128, 216, 0.5)" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.lensOption} onPress={() => handleAhviAction('add')}>
                    <View style={[styles.lensOptionIcon, { backgroundColor: 'rgba(224, 112, 144, 0.15)' }]}>
                      <Feather name="plus-square" size={20} color="#e07090" />
                    </View>
                    <View style={styles.lensOptionTextWrap}>
                      <Text style={styles.lensOptionTitle}>Add to wardrobe</Text>
                      <Text style={styles.lensOptionDesc}>Extract items and save to your closet.</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color="rgba(150, 128, 216, 0.5)" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.lensOption} onPress={() => handleAhviAction('chat')}>
                    <View style={[styles.lensOptionIcon, { backgroundColor: 'rgba(90, 157, 126, 0.15)' }]}>
                      <Feather name="message-square" size={20} color="#5a9d7e" />
                    </View>
                    <View style={styles.lensOptionTextWrap}>
                      <Text style={styles.lensOptionTitle}>Use in chat</Text>
                      <Text style={styles.lensOptionDesc}>Style advice, dupes, and links.</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color="rgba(150, 128, 216, 0.5)" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── INSIGHTS MODAL ── */}
      <Modal visible={isInsightsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <BlurView intensity={70} tint="light" style={[styles.modalContent, { height: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wardrobe <Text style={{ fontStyle: 'italic', color: '#b8a8e8' }}>Insights</Text></Text>
              <TouchableOpacity onPress={() => setIsInsightsVisible(false)} style={styles.iconBtn}>
                <Ionicons name="close" size={24} color="#6b6b6b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statNum}>{items.length}</Text>
                  <Text style={styles.statLabel}>Total Pieces</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNum}>
                    {items.reduce((acc, item) => acc + (item.worn || 0), 0)}
                  </Text>
                  <Text style={styles.statLabel}>Total Wears</Text>
                </View>
              </View>
              
              <Text style={styles.insightSectionTitle}>By Category</Text>
              {CATEGORIES.slice(1).map(cat => {
                const count = items.filter(i => i.category === cat).length;
                if (count === 0) return null;
                const percentage = Math.round((count / items.length) * 100);
                return (
                  <View key={cat} style={styles.statBarRow}>
                    <Text style={styles.statBarLabel}>{cat}</Text>
                    <View style={styles.statBarBg}>
                      <LinearGradient 
                        colors={['#7b6cc8', '#e07090']} 
                        style={[StyleSheet.absoluteFillObject, { width: `${percentage}%`, borderRadius: 8 }]} 
                        start={{x:0, y:0}} end={{x:1, y:0}}
                      />
                    </View>
                    <Text style={styles.statBarCount}>{count}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

      {/* ── ADD ITEM MODAL ── */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <BlurView intensity={70} tint="light" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add <Text style={{ fontStyle: 'italic', color: '#b8a8e8' }}>new piece</Text></Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.iconBtn}>
                <Ionicons name="close" size={24} color="#6b6b6b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Photo Upload */}
              <View style={styles.field}>
                <Text style={styles.label}>Photo *</Text>
                {newItemImages.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                    {newItemImages.map((img, index) => (
                      <Image key={index} source={{ uri: img.uri }} style={[styles.previewImage, { marginRight: 10 }]} />
                    ))}
                  </ScrollView>
                )}
                <View style={styles.uploadSourceRow}>
                  <TouchableOpacity style={styles.uploadSourceBtn} onPress={() => pickImage(false)}>
                    <Ionicons name="images-outline" size={16} color="#6b6b6b" style={{ marginRight: 6 }} />
                    <Text style={styles.uploadSourceText}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.uploadSourceBtn} onPress={() => pickImage(true)}>
                    <Ionicons name="camera-outline" size={16} color="#6b6b6b" style={{ marginRight: 6 }} />
                    <Text style={styles.uploadSourceText}>Camera</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {analyzingImage && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#e07090" size="small" style={{ marginRight: 10 }} />
                  <Text style={{ color: '#e07090', fontSize: 12 }}>Ahvi is analyzing your item...</Text>
                </View>
              )}

              {/* Form Inputs */}
              <View style={styles.field}>
                <Text style={styles.label}>Item Name *</Text>
                <TextInput style={styles.input} placeholder="e.g. White linen shirt" placeholderTextColor="#a0a0a0" value={newItemName} onChangeText={setNewItemName} editable={!analyzingImage} />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Tags (Comma separated)</Text>
                <TextInput style={styles.input} placeholder="e.g. summer, casual, cotton" placeholderTextColor="#a0a0a0" value={newItemTags} onChangeText={setNewItemTags} editable={!analyzingImage} />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Category *</Text>
                <View style={styles.occChips}>
                  {CATEGORIES.slice(1).map(cat => (
                    <TouchableOpacity key={cat} style={[styles.occChip, newItemCategory === cat && styles.occChipActive]} onPress={() => setNewItemCategory(cat)} disabled={analyzingImage}>
                      {newItemCategory === cat && <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} />}
                      <Text style={[styles.occChipText, newItemCategory === cat && styles.occChipTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Footer Actions */}
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.btnSecondary} onPress={() => setIsModalVisible(false)} disabled={uploading}>
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimary, { flex: 2, justifyContent: 'center' }, (uploading || analyzingImage) && { opacity: 0.6 }]} onPress={handleAddItem} disabled={uploading || analyzingImage}>
                  <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} />
                  {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Add to wardrobe</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  
  // ── HEADER ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontFamily: 'System', 
    fontSize: 34,
    fontWeight: '300',
    color: '#1a1a1a',
  },
  sectionMeta: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#6b6b6b',
    marginTop: 4,
  },
  headerBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // ── BUTTONS ──
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 100,
    overflow: 'hidden',
    shadowColor: '#9680D8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  btnSecondary: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: '#6b6b6b',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── FILTERS ──
  categoryContainer: { height: 50, marginBottom: 10 },
  filterBar: { paddingHorizontal: 20, alignItems: 'center' },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginRight: 8,
    overflow: 'hidden',
  },
  filterChipActive: { borderColor: 'transparent' },
  filterChipText: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#6b6b6b' },
  filterChipTextActive: { color: '#fff', fontWeight: 'bold' },

  // ── ITEM GRID ──
  listContent: { paddingHorizontal: 16, paddingBottom: 130 },
  columnWrapper: { justifyContent: 'space-between' },
  itemCard: {
    width: (width - 44) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    overflow: 'hidden',
    shadowColor: '#7850B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 3,
  },
  itemImg: { width: '100%', height: 180, backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  itemBody: { padding: 12, backgroundColor: 'rgba(255, 255, 255, 0.4)', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.5)' },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  itemMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemCat: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b6b6b' },
  wornBadge: { backgroundColor: 'rgba(160, 150, 190, 0.15)', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 10 },
  wornText: { fontSize: 9, fontWeight: 'bold', color: '#6b6b6b' },
  deleteBtn: { position: 'absolute', top: 10, right: 10, borderRadius: 20, overflow: 'hidden' },
  iconBtnBlur: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.6)' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 22, color: '#1a1a1a', fontWeight: '300', marginBottom: 8 },
  emptySub: { fontSize: 12, color: '#6b6b6b', textAlign: 'center', maxWidth: 260, lineHeight: 18 },

  // ── MODALS SHARED ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(20, 12, 36, 0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '90%', backgroundColor: 'rgba(255, 255, 255, 0.85)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.95)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 26, color: '#1a1a1a', fontWeight: '300' },
  iconBtn: { padding: 4 },

  // ── ADD MODAL FORM ──
  field: { marginBottom: 20 },
  label: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, color: '#6b6b6b', marginBottom: 8 },
  input: { backgroundColor: 'rgba(255, 255, 255, 0.65)', borderWidth: 1, borderColor: 'rgba(190, 170, 230, 0.3)', padding: 14, borderRadius: 14, fontSize: 14, color: '#1a1a1a' },
  previewImage: { width: 120, height: 120, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(190, 170, 230, 0.3)' },
  uploadSourceRow: { flexDirection: 'row', gap: 10 },
  uploadSourceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: 'rgba(255, 255, 255, 0.65)', borderWidth: 1, borderColor: 'rgba(190, 170, 230, 0.3)', borderRadius: 14 },
  uploadSourceText: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#6b6b6b', fontWeight: '500' },
  occChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  occChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(190, 170, 230, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.65)', overflow: 'hidden' },
  occChipActive: { borderColor: 'transparent' },
  occChipText: { fontSize: 11, color: '#6b6b6b', letterSpacing: 1, textTransform: 'uppercase' },
  occChipTextActive: { color: '#fff', fontWeight: 'bold' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: 'rgba(224, 112, 144, 0.1)', padding: 12, borderRadius: 10 },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(190, 170, 230, 0.2)' },

  // ── INSIGHTS MODAL ──
  statsRow: { flexDirection: 'row', gap: 14, marginBottom: 30 },
  statCard: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.6)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  statNum: { fontSize: 36, fontWeight: '300', color: '#1a1a1a', marginBottom: 4 },
  statLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, color: '#6b6b6b' },
  insightSectionTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  statBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statBarLabel: { width: 80, fontSize: 10, textTransform: 'uppercase', color: '#6b6b6b' },
  statBarBg: { flex: 1, height: 16, backgroundColor: 'rgba(190, 170, 230, 0.2)', borderRadius: 8, marginHorizontal: 10, overflow: 'hidden' },
  statBarCount: { width: 30, fontSize: 12, color: '#1a1a1a', textAlign: 'right' },

  // ── AHVI LENS FAB ──
  ahviFab: {
    position: 'absolute',
    bottom: 95, // Above the bottom tab bar
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7b6cc8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
    overflow: 'hidden'
  },

  // ── AHVI LENS SHEET ──
  lensOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 20, 50, 0.35)',
    justifyContent: 'flex-end',
  },
  lensSheet: {
    backgroundColor: 'rgba(255, 248, 255, 0.98)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    shadowColor: '#7850B4',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  lensHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(150, 128, 216, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
  },
  lensHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  lensBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lensIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(190, 170, 230, 0.3)',
    overflow: 'hidden'
  },
  lensBrandName: {
    fontFamily: 'System',
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  lensCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(190, 170, 230, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensOptions: {
    gap: 10,
  },
  lensOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 18,
    padding: 15,
  },
  lensOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  lensOptionTextWrap: {
    flex: 1,
  },
  lensOptionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  lensOptionDesc: {
    fontSize: 11,
    color: '#6b6b6b',
  },
});