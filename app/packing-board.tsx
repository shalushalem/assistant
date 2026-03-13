import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { databases, appwriteConfig, uploadFile } from '../lib/appwrite';
import { useGlobalContext } from '../context/GlobalProvider';
import { Query, ID } from 'react-native-appwrite';
import { captureRef } from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface WardrobeItem {
  $id: string;
  name: string;
  category: string;
  image_url: string;
  masked_url?: string;
}

const CATEGORY_WEIGHTS: Record<string, number> = {
  'Outerwear': 1,
  'Tops': 2,
  'Dresses': 3,
  'Bottoms': 4,
  'Footwear': 5,
  'Accessories': 6,
  'Other': 7,
};

const getCategoryWeight = (category: string) => {
  return CATEGORY_WEIGHTS[category] || 99;
};

export default function PackingBoardScreen() {
  const { user } = useGlobalContext();
  const { ids, text } = useLocalSearchParams(); 
  
  const [packedItems, setPackedItems] = useState<WardrobeItem[]>([]);
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const viewRef = useRef<View>(null);

  useEffect(() => {
    fetchItems();
  }, [ids]);

  const fetchItems = async () => {
    if (!user?.$id || !ids) return;

    try {
      const targetIds = (ids as string).split(',').map(id => id.trim());
      
      const response = await databases.listDocuments(
        appwriteConfig.databaseId!,
        appwriteConfig.outfitCollectionId!, 
        [
          Query.equal('user_id', user.$id),
          Query.limit(5000) 
        ]
      );

      const allItems = response.documents as unknown as WardrobeItem[];
      const selectedItems = allItems.filter(doc => targetIds.includes(doc.$id));
      
      setPackedItems(selectedItems); 

    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCheck = (id: string) => {
    setCheckedState(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleConfirmSave = async () => {
    if (!user?.$id) return Alert.alert("Error", "You must be logged in.");

    setIsSaving(true);
    setTimeout(async () => {
      try {
        const localUri = await captureRef(viewRef, { format: 'jpg', quality: 0.9 });
        const styleBoardUrl = await uploadFile(localUri, 'image', 'packingboard');

        if (styleBoardUrl) {
            await databases.createDocument(
              appwriteConfig.databaseId!,
              appwriteConfig.savedBoardsCollectionId!,
              ID.unique(),
              {
                userId: user.$id,                                      
                imageUrl: styleBoardUrl,                                   
                itemIds: (ids as string).split(',').map(id => id.trim()),  
                occasion: "Packing List"                                       
              }
            );
            Alert.alert("Success", "Packing Menu saved successfully!");
            router.back();
        } else {
          throw new Error("Failed to get image upload URL");
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to save packing board');
      } finally {
        setIsSaving(false);
      }
    }, 150);
  };

  const groupedItems = packedItems.reduce((acc, item) => {
    let rawCat = item.category ? item.category.trim() : 'Other';
    const cleanCat = rawCat.charAt(0).toUpperCase() + rawCat.slice(1).toLowerCase();
    
    if (!acc[cleanCat]) acc[cleanCat] = [];
    acc[cleanCat].push(item);
    return acc;
  }, {} as Record<string, WardrobeItem[]>);

  const sortedCategories = Object.keys(groupedItems).sort((a, b) => getCategoryWeight(a) - getCategoryWeight(b));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.sectionHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="chevron-left" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Packing <Text style={{ fontStyle: 'italic', color: '#b8a8e8' }}>Checklist</Text></Text>
        <View style={{ width: 32 }} /> 
      </View>

      {isLoading ? (
        <View style={styles.centerFlex}>
          <ActivityIndicator size="large" color="#e07090" />
          <Text style={{ marginTop: 15, color: '#6b6b6b', fontSize: 12 }}>Preparing your itinerary...</Text>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 20, alignItems: 'center' }}>
          
          <View ref={viewRef} style={styles.menuCardContainer}>
            <LinearGradient colors={['#FFFCF9', '#F9F6F0']} style={StyleSheet.absoluteFillObject} />
            
            <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>THE EDIT</Text>
                <View style={styles.menuDivider} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
              
              <View style={styles.menuBody}>
                {sortedCategories.map((category) => (
                  <View key={category} style={styles.categorySection}>
                    
                    <Text style={styles.categoryTitle}>{category.toUpperCase()}</Text>
                    
                    <View style={styles.categoryContentRow}>
                      
                      <View style={styles.checklistCol}>
                        {groupedItems[category].map(item => {
                          const isChecked = checkedState[item.$id];
                          return (
                            <TouchableOpacity 
                              key={item.$id} 
                              style={styles.checkItemContainer} 
                              onPress={() => toggleCheck(item.$id)}
                              activeOpacity={0.7}
                            >
                              <Feather 
                                name={isChecked ? "check-square" : "square"} 
                                size={18} 
                                color={isChecked ? "#e07090" : "#a0a0a0"} 
                                style={{ marginTop: 2 }}
                              />
                              <Text style={[styles.itemText, isChecked && styles.itemTextChecked]}>
                                {item.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={styles.imagesCol}>
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false} 
                          contentContainerStyle={styles.imageScrollContent}
                        >
                          {groupedItems[category].map((item, index) => {
                            const isChecked = checkedState[item.$id];
                            return (
                              <View 
                                key={item.$id} 
                                style={[
                                  styles.catImageWrap, 
                                  { marginLeft: index > 0 ? -30 : 0 }, 
                                  isChecked && { opacity: 0.3 }
                                ]}
                              >
                                <Image 
                                  source={{ uri: item.masked_url || item.image_url }} 
                                  style={styles.catImage} 
                                  resizeMode="contain" 
                                />
                              </View>
                            );
                          })}
                        </ScrollView>
                      </View>

                    </View>
                  </View>
                ))}
              </View>

            </ScrollView>

            <View style={styles.cardFooter}>
               <Text style={styles.cardFooterText}>Curated by Ahvi</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.btnPrimaryFlex} onPress={handleConfirmSave} disabled={isSaving}>
              <LinearGradient colors={['#7b6cc8', '#e07090']} style={StyleSheet.absoluteFillObject} />
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="download" size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnPrimaryText}>Save Checklist</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10, marginTop: 10 },
  sectionTitle: { fontFamily: 'System', fontSize: 28, fontWeight: '300', color: '#1a1a1a' },
  iconBtn: { padding: 4 },
  centerFlex: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  menuCardContainer: {
    width: width - 40, 
    flex: 1,
    maxHeight: 650,
    borderRadius: 16, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: 'rgba(190, 170, 230, 0.3)',
    shadowColor: '#7850B4', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 5,
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  menuHeader: { alignItems: 'center', marginBottom: 20, marginTop: 5 },
  menuTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 4, color: '#1a1a1a', textTransform: 'uppercase' }, 
  menuDivider: { width: 30, height: 2, backgroundColor: '#e07090', marginTop: 8 }, 
  
  menuBody: { flex: 1 },
  
  categorySection: {
    marginBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 15,
  },
  categoryTitle: { 
    fontSize: 11, 
    fontWeight: '800', 
    color: '#1a1a1a', 
    letterSpacing: 1.5, 
    marginBottom: 12 
  }, 
  categoryContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  checklistCol: { 
    flex: 1, 
    paddingRight: 10 
  },
  checkItemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  itemText: { 
    flex: 1,
    fontSize: 13, 
    color: '#3a2050', 
    lineHeight: 18, 
    fontWeight: '500' 
  },
  itemTextChecked: {
    color: '#a0a0a0',
    textDecorationLine: 'line-through',
    fontStyle: 'italic'
  },
  
  imagesCol: { 
    width: 140, 
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  imageScrollContent: {
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 5,
    alignItems: 'center',
    flexDirection: 'row'
  },
  
  // 🚨 REMOVED ALL SHADOWS AND ELEVATION 🚨
  // If images still have white boxes after this, the actual image files have white backgrounds!
  catImageWrap: { 
    width: 75, 
    height: 90, 
    backgroundColor: 'transparent', 
    alignItems: 'center', 
    justifyContent: 'center',
    zIndex: 1
  },
  catImage: { 
    width: '100%', 
    height: '100%',
    backgroundColor: 'transparent'
  },

  cardFooter: { position: 'absolute', bottom: 12, width: '100%', alignItems: 'center', alignSelf: 'center', backgroundColor: '#F9F6F0' },
  cardFooterText: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 3, color: '#a0a0a0', fontWeight: '600', left: 20 },

  actionRow: { width: '100%', paddingHorizontal: 20 },
  btnPrimaryFlex: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 100, overflow: 'hidden', shadowColor: '#9680D8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 5 },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
});