import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, ScrollView, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { databases, appwriteConfig, uploadFile } from '../lib/appwrite';
import { useGlobalContext } from '../context/GlobalProvider';
import { Query, ID } from 'react-native-appwrite';
import { captureRef } from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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

const SaveStyleCardScreen = () => {
  const { user } = useGlobalContext();
  const { ids } = useLocalSearchParams(); 
  
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [outfitName, setOutfitName] = useState("My Style Board");
  const [isSaving, setIsSaving] = useState(false);
  
  const viewRef = useRef<View>(null);

  useEffect(() => {
    fetchItemsAndName();
  }, [ids]);

  const fetchItemsAndName = async () => {
    if (!user?.$id || !ids) return;

    try {
      const targetIds = (ids as string).split(',').map(id => id.trim());
      
      const response = await databases.listDocuments(
        appwriteConfig.databaseId!,
        appwriteConfig.outfitCollectionId!, 
        [Query.equal('user_id', user.$id)]
      );

      const allItems = response.documents as unknown as WardrobeItem[];
      const selectedItems = allItems.filter(doc => targetIds.includes(doc.$id));
      setItems(selectedItems);

      const itemNames = selectedItems.map(i => i.name);
      
      // Keep your exact local IP URL for the AI naming request
      const nameRes = await fetch('http://192.168.29.193:8000/api/name-outfit', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemNames })
      });
      const nameData = await nameRes.json();
      if (nameData.name) setOutfitName(nameData.name);

    } catch (error) {
      console.error("Error fetching items for card:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!user?.$id) {
      Alert.alert("Error", "You must be logged in to save an outfit.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Capture the UI view to an image
      const localUri = await captureRef(viewRef, {
        format: 'jpg',
        quality: 0.9,
      });

      // 2. Upload to Appwrite Storage Bucket
      const styleBoardUrl = await uploadFile(localUri, 'image', 'styleboard');

      if (styleBoardUrl) {
          // 3. Save to Appwrite Database using EXACT schema keys
          await databases.createDocument(
            appwriteConfig.databaseId!,
            appwriteConfig.savedBoardsCollectionId!,
            ID.unique(),
            {
              userId: user.$id,                                          // Fixed: matched to schema
              imageUrl: styleBoardUrl,                                   // Fixed: matched to schema
              itemIds: (ids as string).split(',').map(id => id.trim()),  // Fixed: matched to schema
              occasion: outfitName                                       // Fixed: mapped name to 'occasion'
            }
          );
          
          Alert.alert("Success", "Style Board saved successfully!");
          router.back();
      } else {
        throw new Error("Failed to get image upload URL");
      }
    } catch (error: any) {
      console.error("Error saving style card: ", error);
      Alert.alert('Error', error.message || 'Failed to save style board');
    } finally {
      setIsSaving(false);
    }
  };

  const topItem = items.find(item => getCategoryType(item.category) === 'top');
  const bottomItem = items.find(item => getCategoryType(item.category) === 'bottom');
  const footwearItem = items.find(item => getCategoryType(item.category) === 'footwear');
  const accessories = items.filter(item => getCategoryType(item.category) === 'accessory');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── HEADER ── */}
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="x" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Save <Text style={{ fontStyle: 'italic', color: '#b8a8e8' }}>Card</Text></Text>
        <View style={{ width: 32 }} /> {/* Spacer to center the title */}
      </View>

      {isLoading ? (
        <View style={styles.centerFlex}>
          <ActivityIndicator size="large" color="#e07090" />
          <Text style={{ marginTop: 15, color: '#6b6b6b', fontSize: 12 }}>Curating your aesthetic...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.label}>Style Name</Text>
          <TextInput 
            style={styles.nameInput}
            value={outfitName}
            onChangeText={setOutfitName}
            placeholder="e.g. Sunday Brunch Look"
            placeholderTextColor="#a0a0a0"
            selectionColor="#e07090"
          />

          {/* ── COLLAGE BOARD (This is what gets captured!) ── */}
          <View ref={viewRef} style={styles.collageContainer}>
            {/* The background of the saved image */}
            <LinearGradient 
              colors={['#fdfbfb', '#f5f7fa']} 
              style={StyleSheet.absoluteFillObject} 
            />
            
            {/* Soft decorative blur circle in the background of the image */}
            <View style={styles.decorativeCircle} />

            <View style={styles.collageBoard}>
              <View style={styles.leftCol}>
                {topItem && (
                  <Image source={{ uri: topItem.masked_url || topItem.image_url }} style={styles.collageMainPiece} resizeMode="contain" />
                )}
                {bottomItem && (
                  <Image source={{ uri: bottomItem.masked_url || bottomItem.image_url }} style={styles.collageBottomPiece} resizeMode="contain" />
                )}
              </View>

              <View style={styles.rightCol}>
                {accessories.map((acc, index) => (
                  <Image key={index} source={{ uri: acc.masked_url || acc.image_url }} style={styles.collageSmallPiece} resizeMode="contain" />
                ))}
                {footwearItem && (
                  <Image source={{ uri: footwearItem.masked_url || footwearItem.image_url }} style={styles.collageSmallPiece} resizeMode="contain" />
                )}
              </View>
            </View>

            {/* A subtle watermark/footer on the saved image */}
            <View style={styles.cardFooter}>
               <Text style={styles.cardFooterText}>Curated by Ahvi</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleConfirmSave} disabled={isSaving}>
            <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} />
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="download" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnPrimaryText}>Save to Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default SaveStyleCardScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10, marginTop: 10 },
  sectionTitle: { fontFamily: 'System', fontSize: 28, fontWeight: '300', color: '#1a1a1a' },
  iconBtn: { padding: 4 },
  centerFlex: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, alignItems: 'center', paddingBottom: 60 },
  
  label: { width: '100%', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, color: '#6b6b6b', marginBottom: 8, marginLeft: 10 },
  nameInput: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(190, 170, 230, 0.3)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    fontSize: 18,
    color: '#1a1a1a',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 30,
    shadowColor: '#7850B4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },

  collageContainer: {
    width: width - 40,
    height: 480,
    borderRadius: 24,
    overflow: 'hidden', // Ensures the gradient and snapshot stay in bounds
    borderWidth: 1,
    borderColor: 'rgba(190, 170, 230, 0.2)',
    shadowColor: '#7850B4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: 30,
    backgroundColor: '#fff',
  },
  decorativeCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(224, 112, 144, 0.05)',
    top: -50,
    right: -100,
  },
  collageBoard: {
    flex: 1,
    flexDirection: 'row',
    padding: 15,
    paddingBottom: 40, // Leave room for watermark
  },
  leftCol: { flex: 6, alignItems: 'center', justifyContent: 'center' },
  rightCol: { flex: 4, alignItems: 'center', justifyContent: 'space-around', paddingLeft: 10 },
  collageMainPiece: { width: '95%', height: '55%', zIndex: 2 },
  collageBottomPiece: { width: '95%', height: '50%', marginTop: -20, zIndex: 1 },
  collageSmallPiece: { width: '85%', height: 110 },
  
  cardFooter: {
    position: 'absolute',
    bottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  cardFooterText: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#a0a0a0',
    fontWeight: '600'
  },

  btnPrimary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 100,
    overflow: 'hidden',
    shadowColor: '#9680D8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
  },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
});