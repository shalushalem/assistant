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

// IMPORTS
import { useGlobalContext } from '../../context/GlobalProvider';
import { appwriteConfig, databases, storage } from '../../lib/appwrite';

// ---------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------
const { 
  databaseId, 
  outfitCollectionId, 
  storageId,
  endpoint,
  projectId
} = appwriteConfig;

type OutfitItem = Models.Document & {
  name: string;
  category: string;
  image_url: string;
  user_id: string;
  image_id: string;
  status: string;
  masked_url?: string;
  masked_id?: string;
};

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Footwear', 'Outerwear', 'Accessories'];

export default function Wardrobe() {
  const router = useRouter();
  const { user } = useGlobalContext();
  
  const [items, setItems] = useState<OutfitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Tops');
  const [newItemImage, setNewItemImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  // ---------------------------------------------------------
  // 1. Fetch Items
  // ---------------------------------------------------------
  const fetchItems = async () => {
    try {
      if (!user?.$id) return;

      const response = await databases.listDocuments(
        databaseId,
        outfitCollectionId, 
        [
            Query.equal('user_id', user.$id),
            Query.orderDesc('$createdAt')
        ]
      );
      
      setItems(response.documents as OutfitItem[]);
    } catch (error) {
      console.error('Error fetching wardrobe:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  // ---------------------------------------------------------
  // 2. Pick Image
  // ---------------------------------------------------------
  const pickImage = async (useCamera = false) => {
    try {
      let result;
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      };

      if (useCamera) {
        await ImagePicker.requestCameraPermissionsAsync();
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled) {
        setNewItemImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not select image.');
    }
  };

  // ---------------------------------------------------------
  // 3. Upload & Save (FIXED URL LOGIC)
  // ---------------------------------------------------------
  const handleAddItem = async () => {
    if (!newItemImage || !newItemName) {
      Alert.alert('Missing Fields', 'Please add an image and a name.');
      return;
    }

    setUploading(true);
    try {
      let filePayload;

      // Platform check for File Upload (Web vs Mobile)
      if (Platform.OS === 'web') {
        const response = await fetch(newItemImage.uri);
        const blob = await response.blob();
        
        filePayload = new File(
          [blob], 
          newItemImage.fileName || `photo-${Date.now()}.jpg`, 
          { type: newItemImage.mimeType || 'image/jpeg' }
        );
      } else {
        filePayload = {
          name: newItemImage.fileName || `photo-${Date.now()}.jpg`,
          type: newItemImage.mimeType || 'image/jpeg',
          size: newItemImage.fileSize || 0,
          uri: newItemImage.uri,
        };
      }

      console.log(`Uploading to storage bucket: ${storageId} ...`);

      // A. Upload to Storage
      const uploadedFile = await storage.createFile(
        storageId, 
        'unique()',
        filePayload as any 
      );

      // B. Construct View URL Manually (The "Promise" Fix)
      // This ensures the URL is a plain string and not a Promise object
      const fileUrl = `${endpoint}/storage/buckets/${storageId}/files/${uploadedFile.$id}/view?project=${projectId}`;

      console.log("Generated Image URL:", fileUrl);

      // C. Save to Database
      await databases.createDocument(
        databaseId,
        outfitCollectionId, 
        'unique()',
        {
          name: newItemName,
          category: newItemCategory,
          image_url: fileUrl,  // <-- Guaranteed String
          user_id: user?.$id,
          image_id: uploadedFile.$id,
          status: 'ready',
        }
      );

      Alert.alert('Success', 'Item added to your wardrobe!');
      
      // Reset Form
      setIsModalVisible(false);
      setNewItemImage(null);
      setNewItemName('');
      
      // Refresh List
      fetchItems();

    } catch (error: any) {
      console.error('Upload Error:', error);
      Alert.alert('Upload Failed', error.message || 'Something went wrong.');
    } finally {
      setUploading(false);
    }
  };

  // ---------------------------------------------------------
  // UI Rendering
  // ---------------------------------------------------------
  
  const filteredItems = selectedCategory === 'All' 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  const renderItem = ({ item }: { item: OutfitItem }) => (
    <TouchableOpacity style={styles.itemCard}>
      <Image 
        source={{ uri: item.image_url }} 
        style={styles.itemImage} 
        resizeMode="cover"
        // Error Handler for debugging blank images
        onError={(e) => {
            console.log(`[Image Load Failed] Item: ${item.name}`);
            console.log(`- Broken URL: ${item.image_url}`);
            console.log(`- Error:`, e.nativeEvent.error);
        }}
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wardrobe</Text>
        <TouchableOpacity onPress={() => setIsModalVisible(true)}>
          <Ionicons name="add-circle" size={32} color="#FF9C01" />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat && styles.categoryTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Grid */}
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

      {/* Add Modal */}
      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Item</Text>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Ionicons name="close" size={28} color="#CDCDE0" />
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Image Preview / Picker */}
            <View style={styles.imagePickerContainer}>
              {newItemImage ? (
                <Image source={{ uri: newItemImage.uri }} style={styles.previewImage} />
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

            {/* Form Fields */}
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Blue Denim Jacket"
              value={newItemName}
              onChangeText={setNewItemName}
              placeholderTextColor="#7B7B8B"
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.categorySelect}>
               {CATEGORIES.slice(1).map(cat => (
                 <TouchableOpacity 
                    key={cat} 
                    style={[styles.catOption, newItemCategory === cat && styles.catOptionActive]}
                    onPress={() => setNewItemCategory(cat)}
                 >
                    <Text style={[styles.catOptionText, newItemCategory === cat && styles.catOptionTextActive]}>{cat}</Text>
                 </TouchableOpacity>
               ))}
            </View>

            {/* Save Button */}
            <TouchableOpacity 
              style={[styles.uploadBtn, uploading && styles.disabledBtn]} 
              onPress={handleAddItem}
              disabled={uploading}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  categoryContainer: { height: 50 },
  categoryList: { paddingHorizontal: 15, alignItems: 'center' },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E1E2D',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#232533',
  },
  categoryChipActive: { backgroundColor: '#FF9C01', borderColor: '#FF9C01' },
  categoryText: { fontSize: 14, fontWeight: '600', color: '#CDCDE0' },
  categoryTextActive: { color: '#161622' },
  listContent: { padding: 15, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between' },
  itemCard: {
    width: '48%',
    backgroundColor: '#1E1E2D',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#232533',
  },
  itemImage: { width: '100%', height: 180, backgroundColor: '#232533' },
  itemInfo: { padding: 10 },
  itemName: { fontSize: 16, fontWeight: '600', marginBottom: 4, color: 'white' },
  itemCategory: { fontSize: 12, color: '#CDCDE0' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '500', color: '#CDCDE0' },
  emptySubtext: { fontSize: 14, color: '#7B7B8B', marginTop: 5 },
  
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#161622' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#232533',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  modalContent: { padding: 20 },
  imagePickerContainer: { alignItems: 'center', marginBottom: 20 },
  previewImage: { width: 200, height: 200, borderRadius: 10, marginBottom: 15 },
  placeholderImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    backgroundColor: '#1E1E2D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#232533',
  },
  imageButtons: { flexDirection: 'row', gap: 10 },
  imageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9C01',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 5,
  },
  imageBtnText: { color: '#161622', fontWeight: '600' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 10, marginTop: 10, color: '#CDCDE0' },
  input: {
    backgroundColor: '#1E1E2D',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
    color: 'white',
    borderWidth: 1,
    borderColor: '#232533',
  },
  categorySelect: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  catOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#232533',
    backgroundColor: '#1E1E2D',
  },
  catOptionActive: { backgroundColor: '#FF9C01', borderColor: '#FF9C01' },
  catOptionText: { color: '#CDCDE0' },
  catOptionTextActive: { color: '#161622', fontWeight: 'bold' },
  uploadBtn: {
    backgroundColor: '#FF9C01',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledBtn: { opacity: 0.7 },
  uploadBtnText: { color: '#161622', fontSize: 18, fontWeight: 'bold' },
});