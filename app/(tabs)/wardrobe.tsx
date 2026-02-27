import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Models, Query, ID } from 'react-native-appwrite';
// 🟢 FIX: Imported from the legacy path for Expo 54 compatibility
import * as FileSystem from 'expo-file-system/legacy';

import { useGlobalContext } from '../../context/GlobalProvider';
import { appwriteConfig, databases, uploadFile, deleteFileFromR2 } from '../../lib/appwrite';

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
};

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Footwear', 'Outerwear', 'Accessories', 'Dresses'];

export default function Wardrobe() {
  const { user } = useGlobalContext();

  const [items, setItems] = useState<OutfitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // --- Pagination State ---
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Tops');
  const [newItemTags, setNewItemTags] = useState('');

  const [newItemImages, setNewItemImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);

  const fetchItems = async (isLoadMore = false) => {
    if (!user?.$id) return;
    
    // Prevent fetching if we are already loading more or if there is no more data
    if (isLoadMore && (!hasMore || loadingMore)) return;

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

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

      if (isLoadMore) {
        setItems(prevItems => [...prevItems, ...fetchedItems]);
      } else {
        setItems(fetchedItems);
      }

      // If we got exactly the limit, there might be more. If less, we've reached the end.
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
    // Initial fetch
    fetchItems(false);
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    setOffset(0);
    fetchItems(false);
  };

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
        base64Image = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64', 
        });
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
        if (CATEGORIES.includes(data.category)) {
          setNewItemCategory(data.category);
        }
        if (data.tags && Array.isArray(data.tags)) {
          setNewItemTags(data.tags.join(', '));
        }
      }
    } catch (error) {
      console.error("AI Analysis Failed:", error);
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleDeleteItem = async (item: OutfitItem) => {
    Alert.alert("Delete Item", "Are you sure you want to remove this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          // Optimistic UI update
          setItems((prevItems) => prevItems.filter((i) => i.$id !== item.$id));
          
          try {
            await databases.deleteDocument(databaseId!, outfitCollectionId!, item.$id);
            
            if (item.image_url) {
              await deleteFileFromR2(item.image_url, 'raw');
            }

            if (item.masked_url) {
              await deleteFileFromR2(item.masked_url, 'wardrobe');
            }

          } catch (error: any) {
            console.error("Delete Error: ", error);
            Alert.alert("Error", "Could not fully delete the item.");
            // Refresh to ensure UI matches DB if delete failed
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
      const tagsArray = newItemTags
        ? newItemTags.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0)
        : [];

      for (const imageAsset of newItemImages) {
        if (!imageAsset) continue; 
        
        const uniqueId = ID.unique();

        console.log("Uploading raw image to R2...");
        const rawImageUrl = await uploadFile(imageAsset.uri, 'image', 'raw');

        let base64Image = imageAsset.base64;
        if (!base64Image && imageAsset.uri) {
          base64Image = await FileSystem.readAsStringAsync(imageAsset.uri, {
            encoding: 'base64',
          });
        }

        if (!base64Image) throw new Error("Could not read image base64 data.");

        console.log("Sending to server for BG removal...");
        const bgResponse = await fetch(BG_REMOVE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64Image }),
        });
        
        const bgData = await bgResponse.json();
        if (!bgData || !bgData.processed_image_base64) {
            throw new Error(bgData?.error || "Failed to remove background.");
        }

        const processedUri = FileSystem.cacheDirectory + `processed_${uniqueId}.png`;
        await FileSystem.writeAsStringAsync(processedUri, bgData.processed_image_base64, {
          encoding: 'base64', 
        });

        console.log("Uploading clean sticker to R2...");
        const wardrobeImageUrl = await uploadFile(processedUri, 'image', 'wardrobe');

        if (!wardrobeImageUrl || !rawImageUrl) throw new Error("Failed to upload images to R2.");

        console.log("Saving records to Appwrite...");
        await databases.createDocument(
          databaseId!,
          outfitCollectionId!,
          uniqueId, 
          {
            name: newItemName,           
            category: newItemCategory,   
            tags: tagsArray,             
            image_url: rawImageUrl,       
            image_id: uniqueId,           
            masked_url: wardrobeImageUrl, 
            masked_id: `${uniqueId}_processed`, 
            user_id: user?.$id,          
            status: 'ready'             
          }
        );
      }

      Alert.alert('Success', 'Item(s) added to your wardrobe!');
      setIsModalVisible(false);
      setNewItemImages([]);
      setNewItemName('');
      setNewItemTags('');
      
      // Refresh the list to show the new item
      onRefresh();
    } catch (error: any) {
      console.error("Upload/Database Error: ", error);
      Alert.alert('Upload Failed', error.message || 'Something went wrong.');
    } finally {
      setUploading(false);
    }
  };

  const filteredItems = selectedCategory === 'All' ? items : items.filter(item => item.category === selectedCategory);

  const renderItem = ({ item }: { item: OutfitItem }) => (
    <View style={styles.itemCard}>
      <Image source={{ uri: item.masked_url || item.image_url }} style={styles.itemImage} resizeMode="contain" />
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteItem(item)}
        activeOpacity={0.6}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Ionicons name="trash" size={20} color="#FF4B4B" />
      </TouchableOpacity>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>

        {item.tags && item.tags.length > 0 && (
          <Text style={styles.itemTags} numberOfLines={1}>
            #{item.tags.join(' #')}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wardrobe</Text>
        <TouchableOpacity onPress={() => setIsModalVisible(true)}>
          <Ionicons name="add-circle" size={32} color="#FF9C01" />
        </TouchableOpacity>
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Show main loading spinner only on initial load, not when loading more */}
      {loading && !loadingMore ? (
        <ActivityIndicator size="large" color="#FF9C01" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.$id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF9C01" />}
          
          // --- Infinite Scroll Triggers ---
          onEndReached={() => fetchItems(true)} 
          onEndReachedThreshold={0.5} 
          ListFooterComponent={() => 
            loadingMore ? <ActivityIndicator size="small" color="#FF9C01" style={{ marginVertical: 20 }} /> : null
          }

          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No items found in {selectedCategory}.</Text>
              <Text style={styles.emptySubtext}>Tap + to add clothes.</Text>
            </View>
          }
        />
      )}

      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Item</Text>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Ionicons name="close" size={28} color="#CDCDE0" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.imagePickerContainer}>
              {newItemImages.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                  {newItemImages.map((img, index) => (
                    <Image key={index} source={{ uri: img.uri }} style={[styles.previewImage, { marginRight: 10 }]} />
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="shirt-outline" size={50} color="#CDCDE0" />
                </View>
              )}
              <View style={styles.imageButtons}>
                <TouchableOpacity style={styles.imageBtn} onPress={() => pickImage(true)}>
                  <Ionicons name="camera" size={20} color="#161622" />
                  <Text style={styles.imageBtnText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imageBtn} onPress={() => pickImage(false)}>
                  <Ionicons name="images" size={20} color="#161622" />
                  <Text style={styles.imageBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>

            {analyzingImage && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <ActivityIndicator color="#FF9C01" size="small" style={{ marginRight: 10 }} />
                <Text style={{ color: '#FF9C01' }}>Ahvi is analyzing your item...</Text>
              </View>
            )}

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Black Cotton Shirt"
              value={newItemName}
              onChangeText={setNewItemName}
              placeholderTextColor="#7B7B8B"
              editable={!analyzingImage}
            />

            <Text style={styles.label}>Tags (Comma separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. shirt, casual, cotton"
              value={newItemTags}
              onChangeText={setNewItemTags}
              placeholderTextColor="#7B7B8B"
              editable={!analyzingImage}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.categorySelect}>
              {CATEGORIES.slice(1).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catOption, newItemCategory === cat && styles.catOptionActive]}
                  onPress={() => setNewItemCategory(cat)}
                  disabled={analyzingImage}
                >
                  <Text style={[styles.catOptionText, newItemCategory === cat && styles.catOptionTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.uploadBtn, (uploading || analyzingImage) && styles.disabledBtn]}
              onPress={handleAddItem}
              disabled={uploading || analyzingImage}
            >
              {uploading ? <ActivityIndicator color="#161622" /> : <Text style={styles.uploadBtnText}>Save Item</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#161622' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  categoryContainer: { height: 50 },
  categoryList: { paddingHorizontal: 15, alignItems: 'center' },
  categoryChip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E1E2D', marginRight: 10, borderWidth: 1, borderColor: '#232533' },
  categoryChipActive: { backgroundColor: '#FF9C01', borderColor: '#FF9C01' },
  categoryText: { fontSize: 14, fontWeight: '600', color: '#CDCDE0' },
  categoryTextActive: { color: '#161622' },
  listContent: { padding: 15, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between' },
  itemCard: { width: '48%', backgroundColor: '#1E1E2D', borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#232533', position: 'relative' },
  itemImage: { width: '100%', height: 180, backgroundColor: '#232533', borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  deleteButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20, zIndex: 999, elevation: 10 },
  itemInfo: { padding: 10 },
  itemName: { fontSize: 16, fontWeight: '600', marginBottom: 4, color: 'white' },
  itemCategory: { fontSize: 12, color: '#CDCDE0' },
  itemTags: { fontSize: 11, color: '#FF9C01', marginTop: 4, fontStyle: 'italic' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '500', color: '#CDCDE0' },
  emptySubtext: { fontSize: 14, color: '#7B7B8B', marginTop: 5 },
  modalContainer: { flex: 1, backgroundColor: '#161622' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#232533' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  modalContent: { padding: 20 },
  imagePickerContainer: { alignItems: 'center', marginBottom: 20 },
  previewImage: { width: 150, height: 150, borderRadius: 10 },
  placeholderImage: { width: 200, height: 200, borderRadius: 10, backgroundColor: '#1E1E2D', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#232533' },
  imageButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  imageBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF9C01', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, gap: 5 },
  imageBtnText: { color: '#161622', fontWeight: '600' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 10, marginTop: 10, color: '#CDCDE0' },
  input: { backgroundColor: '#1E1E2D', padding: 15, borderRadius: 10, fontSize: 16, marginBottom: 15, color: 'white', borderWidth: 1, borderColor: '#232533' },
  categorySelect: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  catOption: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#232533', backgroundColor: '#1E1E2D' },
  catOptionActive: { backgroundColor: '#FF9C01', borderColor: '#FF9C01' },
  catOptionText: { color: '#CDCDE0' },
  catOptionTextActive: { color: '#161622', fontWeight: 'bold' },
  uploadBtn: { backgroundColor: '#FF9C01', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  disabledBtn: { opacity: 0.7 },
  uploadBtnText: { color: '#161622', fontSize: 18, fontWeight: 'bold' },
});