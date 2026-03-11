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

// 🚀 DYNAMIC CLASSIFIER: Groups items into Main Apparel vs Side Accessories
const getCategoryGroup = (category = '', name = '') => {
  const textToSearch = `${category} ${name}`.toLowerCase();
  
  const apparelKeywords = [
    'top', 'shirt', 't-shirt', 'blouse', 'sweater', 'hoodie', 'jacket', 'outer', 
    'dress', 'kurti', 'coat', 'blazer', 'saree', 'sari', 'lehenga', 'kurta', 'suit', 'gown', 'jumpsuit',
    'bottom', 'pant', 'jeans', 'skirt', 'short', 'trouser', 'cargo', 'legging', 'sweatpant', 'denim', 'churidar', 'salwar'
  ];

  // If it's clothing, it goes in the main left column. Otherwise (shoes, bags, watches), it goes to the right.
  if (apparelKeywords.some(kw => textToSearch.includes(kw))) return 'apparel';
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
  const [lockedIds, setLockedIds] = useState<string[]>([]); 
  const [isShuffling, setIsShuffling] = useState(false); 

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
      setFullWardrobe(allItems); 
      
      const selectedItems = allItems.filter(doc => targetIds.includes(doc.$id));
      setItems(selectedItems);

      const itemNames = selectedItems.map(i => i.name);
      
      try {
        const nameRes = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/name-outfit`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemNames })
        });
        const nameData = await nameRes.json();
        if (nameData.name) setOutfitName(nameData.name);
      } catch (e) {
        console.log("Could not fetch smart name, using default.");
      }

    } catch (error) {
      console.error("Error fetching items for card:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShuffle = () => {
    setIsShuffling(true);
    setTimeout(() => {
      const shuffledOutfit = items.map(currentItem => {
        if (lockedIds.includes(currentItem.$id)) return currentItem;

        // Shuffle within the same broad group (apparel -> apparel, accessory -> accessory)
        const currentGroup = getCategoryGroup(currentItem.category, currentItem.name);
        const alternatives = fullWardrobe.filter(wardrobeItem => 
          getCategoryGroup(wardrobeItem.category, wardrobeItem.name) === currentGroup && 
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

  const toggleLock = (id: string) => {
    setLockedIds(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  };

  const handleConfirmSave = async () => {
    if (!user?.$id) return Alert.alert("Error", "You must be logged in to save an outfit.");

    setIsSaving(true);
    
    setTimeout(async () => {
      try {
        const localUri = await captureRef(viewRef, { format: 'jpg', quality: 0.9 });
        const styleBoardUrl = await uploadFile(localUri, 'image', 'styleboard');

        if (styleBoardUrl) {
            await databases.createDocument(
              appwriteConfig.databaseId!,
              appwriteConfig.savedBoardsCollectionId!,
              ID.unique(),
              {
                userId: user.$id,                                      
                imageUrl: styleBoardUrl,                                   
                itemIds: (ids as string).split(',').map(id => id.trim()),  
                occasion: outfitName                                       
              }
            );
            Alert.alert("Success", "Style Board saved successfully!");
            router.back();
        } else {
          throw new Error("Failed to get image upload URL");
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to save style board');
      } finally {
        setIsSaving(false);
      }
    }, 150);
  };

  // 🚀 DYNAMIC FILTERING: No more `.find()`, we use `.filter()` to capture ALL items sent!
  const apparelItems = items.filter(item => getCategoryGroup(item.category, item.name) === 'apparel');
  const accessoryAndFootwearItems = items.filter(item => getCategoryGroup(item.category, item.name) === 'accessory');

  const renderLockableItem = (item: WardrobeItem, containerStyle: any) => {
    const isLocked = lockedIds.includes(item.$id);
    
    return (
      <TouchableOpacity 
        key={item.$id}
        activeOpacity={0.8} 
        onPress={() => toggleLock(item.$id)} 
        style={[containerStyle, isLocked && !isSaving ? styles.lockedBorder : null]}
      >
        <Image source={{ uri: item.masked_url || item.image_url }} style={styles.imageFull} resizeMode="contain" />
        {isLocked && !isSaving && (
          <View style={styles.lockIconOverlay}>
            <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} />
            <Feather name="lock" size={10} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="chevron-left" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Style <Text style={{ fontStyle: 'italic', color: '#b8a8e8' }}>Card</Text></Text>
        <View style={{ width: 32 }} /> 
      </View>

      {isLoading || isShuffling ? (
        <View style={styles.centerFlex}>
          <ActivityIndicator size="large" color="#e07090" />
          <Text style={{ marginTop: 15, color: '#6b6b6b', fontSize: 12 }}>{isShuffling ? "Shuffling wardrobe..." : "Curating your aesthetic..."}</Text>
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

          {/* ── COLLAGE BOARD ── */}
          <View ref={viewRef} style={styles.collageContainer}>
            <LinearGradient colors={['#fdfbfb', '#f5f7fa']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.decorativeCircle} />

            <View style={styles.collageBoard}>
              
              {/* 🚀 DYNAMIC LEFT COLUMN: Maps all apparel, naturally distributing vertical height */}
              <View style={styles.leftCol}>
                {apparelItems.map((item) => renderLockableItem(item, styles.dynamicMainPiece))}
              </View>

              {/* 🚀 DYNAMIC RIGHT COLUMN: Maps all footwear and accessories */}
              <View style={styles.rightCol}>
                {accessoryAndFootwearItems.map((item) => renderLockableItem(item, styles.collageSmallPiece))}
              </View>

            </View>

            <View style={styles.cardFooter}>
               <Text style={styles.cardFooterText}>Curated by Ahvi</Text>
            </View>
          </View>

          {/* ── ACTION BUTTONS ── */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleShuffle} disabled={isShuffling || items.length === 0}>
              <Feather name="shuffle" size={16} color="#6b6b6b" style={{ marginRight: 8 }} />
              <Text style={styles.btnSecondaryText}>Shuffle</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnPrimaryFlex} onPress={handleConfirmSave} disabled={isSaving}>
              <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} />
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="download" size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnPrimaryText}>Save Card</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default StyleBoardScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10, marginTop: 10 },
  sectionTitle: { fontFamily: 'System', fontSize: 28, fontWeight: '300', color: '#1a1a1a' },
  iconBtn: { padding: 4 },
  centerFlex: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, alignItems: 'center', paddingBottom: 60 },
  
  label: { width: '100%', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, color: '#6b6b6b', marginBottom: 8, marginLeft: 10 },
  nameInput: {
    width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.65)', borderWidth: 1, borderColor: 'rgba(190, 170, 230, 0.3)',
    paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, fontSize: 18, color: '#1a1a1a', fontWeight: '500',
    textAlign: 'center', marginBottom: 30, shadowColor: '#7850B4', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5,
  },

  collageContainer: {
    width: width - 40, height: 480, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(190, 170, 230, 0.2)',
    shadowColor: '#7850B4', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 5,
    marginBottom: 20, backgroundColor: '#fff',
  },
  decorativeCircle: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(224, 112, 144, 0.05)', top: -50, right: -100 },
  collageBoard: { flex: 1, flexDirection: 'row', padding: 15, paddingBottom: 40 },
  
  leftCol: { flex: 6, alignItems: 'center', justifyContent: 'center', gap: 10 },
  rightCol: { flex: 4, alignItems: 'center', justifyContent: 'center', paddingLeft: 10, gap: 15 },
  
  imageFull: { width: '100%', height: '100%', zIndex: 2 },
  
  // 🚀 KEY CHANGE HERE: We use `flex: 1` so it dynamically shares the column space!
  dynamicMainPiece: { flex: 1, width: '100%', position: 'relative', marginVertical: 5 },
  collageSmallPiece: { width: '90%', height: 100, position: 'relative' },
  
  lockedBorder: { borderColor: '#e07090', borderWidth: 2, borderRadius: 12, backgroundColor: 'rgba(224, 112, 144, 0.05)' },
  lockIconOverlay: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', zIndex: 10, shadowColor: '#e07090', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },

  cardFooter: { position: 'absolute', bottom: 15, width: '100%', alignItems: 'center' },
  cardFooterText: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: '#a0a0a0', fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 10 },
  btnSecondary: { flex: 1, flexDirection: 'row', paddingVertical: 16, borderRadius: 100, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { color: '#6b6b6b', fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  btnPrimaryFlex: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 100, overflow: 'hidden', shadowColor: '#9680D8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 5 },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
});