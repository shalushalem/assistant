import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { databases, appwriteConfig, uploadFile } from '../lib/appwrite';
import { useGlobalContext } from '../context/GlobalProvider';
import { Query, ID } from 'react-native-appwrite';
import { captureRef } from 'react-native-view-shot';

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
    setIsSaving(true);
    try {
      const localUri = await captureRef(viewRef, {
        format: 'jpg',
        quality: 0.8,
      });

      const styleBoardUrl = await uploadFile(localUri, 'image', 'styleboard');

      if (styleBoardUrl) {
          await databases.createDocument(
            appwriteConfig.databaseId!,
            appwriteConfig.savedBoardsCollectionId!,
            ID.unique(),
            {
              name: outfitName,
              image_url: styleBoardUrl,
              user_id: user.$id,
              item_ids: (ids as string).split(',').map(id => id.trim()) 
            }
          );
          
          Alert.alert("Success", "Style Board saved successfully!");
          router.back();
      }
    } catch (error) {
      console.error("Error saving style card: ", error);
      Alert.alert('Error', 'Failed to save style board');
    } finally {
      setIsSaving(false);
    }
  };

  const topItem = items.find(item => getCategoryType(item.category) === 'top');
  const bottomItem = items.find(item => getCategoryType(item.category) === 'bottom');
  const footwearItem = items.find(item => getCategoryType(item.category) === 'footwear');
  const accessories = items.filter(item => getCategoryType(item.category) === 'accessory');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Save <Text style={{ color: '#FF9C01', fontStyle: 'italic' }}>Card</Text></Text>
        <View style={{ width: 30 }} /> 
      </View>

      {isLoading ? (
        <View style={styles.centerFlex}>
          <ActivityIndicator size="large" color="#FF9C01" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <TextInput 
            style={styles.nameInput}
            value={outfitName}
            onChangeText={setOutfitName}
            placeholder="Name your outfit..."
            placeholderTextColor="#CDCDE0"
          />

          <View ref={viewRef} style={styles.collageBoard}>
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

          <TouchableOpacity style={styles.saveBtn} onPress={handleConfirmSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#161622" /> : <Text style={styles.saveBtnText}>Save to Profile</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default SaveStyleCardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#161622' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#232533',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  centerFlex: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, alignItems: 'center' },
  
  nameInput: {
    width: '100%', backgroundColor: '#232533', color: '#FFFFFF',
    fontSize: 20, fontWeight: 'bold', textAlign: 'center', 
    paddingVertical: 15, borderRadius: 12, marginBottom: 20,
    borderWidth: 1, borderColor: '#FF9C01'
  },

  collageBoard: {
    width: '100%', height: 450, backgroundColor: '#D9DBE0', 
    borderRadius: 20, flexDirection: 'row', padding: 15,
  },
  leftCol: { flex: 6, alignItems: 'center', justifyContent: 'center' },
  rightCol: { flex: 4, alignItems: 'center', justifyContent: 'space-around', paddingLeft: 10 },
  collageMainPiece: { width: '95%', height: '55%', zIndex: 2 },
  collageBottomPiece: { width: '95%', height: '50%', marginTop: -20, zIndex: 1 },
  collageSmallPiece: { width: '85%', height: 100 },

  saveBtn: {
    width: '100%', backgroundColor: '#FF9C01', paddingVertical: 16, 
    borderRadius: 30, alignItems: 'center', marginTop: 30
  },
  saveBtnText: { color: '#161622', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' },
});