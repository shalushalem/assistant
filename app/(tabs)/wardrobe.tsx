import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Models, Query } from 'react-native-appwrite';
import * as FileSystem from 'expo-file-system'; 

import { useGlobalContext } from '../../context/GlobalProvider';
import { appwriteConfig, databases, storage } from '../../lib/appwrite';

const { databaseId, outfitCollectionId, storageId, endpoint, projectId } = appwriteConfig;

const AI_ANALYZE_ENDPOINT = 'http://192.168.29.193:8000/api/analyze-image';

type OutfitItem = Models.Document & {
  name: string;
  category: string;
  tags: string[]; 
  image_url: string;
  user_id: string;
  image_id: string;
  status: string;
};

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Footwear', 'Outerwear', 'Accessories', 'Dresses'];

export default function Wardrobe() {
  const router = useRouter();
  const { user } = useGlobalContext();
  
  const [items, setItems] = useState<OutfitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Tops');
  const [newItemTags, setNewItemTags] = useState(''); 
  
  const [newItemImages, setNewItemImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);

  const fetchItems = async () => {
    try {
      if (!user?.$id) return;
      const response = await databases.listDocuments(
        databaseId,
        outfitCollectionId, 
        [Query.equal('user_id', user.$id), Query.orderDesc('$createdAt')]
      );
      setItems(response.documents as OutfitItem[]);
    } catch (error) {
      console.error('Error fetching wardrobe:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchItems(); }, [user]);
  const onRefresh = () => { setRefreshing(true); fetchItems(); };

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
    setAnalyzingImage(true);
    try {
      let base64Image = asset.base64;
      if (!base64Image && asset.uri) {
         base64Image = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      }
      if (!base64Image) throw new Error("Could not get image data.");

      const response = await fetch(AI_ANALYZE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64Image })
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

  // --- UPDATED DELETE FUNCTION ---
  const handleDeleteItem = async (docId: string, imageId: string) => {
    Alert.alert("Delete Item", "Are you sure you want to remove this item?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          // 1. Optimistic UI Update: Instantly remove it from the screen
          setItems((prevItems) => prevItems.filter(item => item.$id !== docId));

          try {
            // 2. Delete from database
            await databases.deleteDocument(databaseId, outfitCollectionId, docId);
            // 3. Delete from storage
            if (imageId) await storage.deleteFile(storageId, imageId);
          } catch (error: any) {
            console.error("Delete Error: ", error);
            Alert.alert("Error", error.message || "Could not delete item.");
            // If it fails, refresh the list to bring the item back
            fetchItems(); 
          }
        }
      }
    ]);
  };

  const handleAddItem = async () => {
    if (newItemImages.length === 0 || !newItemName) {
      Alert.alert('Missing Fields', 'Please add at least one image and a name.');
      return;
    }

    setUploading(true);
    try {
      const tagsArray = newItemTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

      for (const imageAsset of newItemImages) {
        let filePayload;
        if (Platform.OS === 'web') {
          const response = await fetch(imageAsset.uri);
          const blob = await response.blob();
          filePayload = new File([blob], imageAsset.fileName || `photo-${Date.now()}.jpg`, { type: imageAsset.mimeType || 'image/jpeg' });
        } else {
          filePayload = {
            name: imageAsset.fileName || `photo-${Date.now()}.jpg`,
            type: imageAsset.mimeType || 'image/jpeg',
            size: imageAsset.fileSize || 0,
            uri: imageAsset.uri,
          };
        }

        const uploadedFile = await storage.createFile(storageId, 'unique()', filePayload as any);
        const fileUrl = `${endpoint}/storage/buckets/${storageId}/files/${uploadedFile.$id}/view?project=${projectId}`;

        await databases.createDocument(
          databaseId,
          outfitCollectionId, 
          'unique()',
          {
            name: newItemName,
            category: newItemCategory,
            tags: tagsArray, 
            image_url: fileUrl,  
            user_id: user?.$id,
            image_id: uploadedFile.$id,
            status: 'ready',
          }
        );
      }

      Alert.alert('Success', 'Item(s) added to your wardrobe!');
      setIsModalVisible(false);
      setNewItemImages([]);
      setNewItemName('');
      setNewItemTags('');
      fetchItems();

    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Something went wrong.');
    } finally {
      setUploading(false);
    }
  };

  const filteredItems = selectedCategory === 'All' ? items : items.filter(item => item.category === selectedCategory);

  const renderItem = ({ item }: { item: OutfitItem }) => (
    <View style={styles.itemCard}>
      <Image source={{ uri: item.image_url }} style={styles.itemImage} resizeMode="cover" />
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDeleteItem(item.$id, item.image_id)}
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
            <TouchableOpacity key={cat} style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]} onPress={() => setSelectedCategory(cat)}>
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
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
              {uploading ? (
                <ActivityIndicator color="#161622" />
              ) : (
                <Text style={styles.uploadBtnText}>Save Item</Text>
              )}
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
  
  // --- UPDATED Z-INDEX TO FIX CLICKABILITY ---
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