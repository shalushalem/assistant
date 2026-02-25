import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile, databases, appwriteConfig } from '../../lib/appwrite';
import { useGlobalContext } from '../../context/GlobalProvider';
import { ID } from 'react-native-appwrite';

const Create = () => {
  const { user } = useGlobalContext();
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const pickImage = async (setter: React.Dispatch<React.SetStateAction<string | null>>) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setter(result.assets[0].uri);
    }
  };

  const handleVirtualTryOn = async () => {
    if (!personImage || !garmentImage) {
      Alert.alert("Missing Input", "Please upload both your photo and a clothing item.");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. You would normally send 'personImage' and 'garmentImage' to your Try-On Python API here.
      // const response = await fetch('YOUR_TRYON_API', { ... });
      // const aiResultUri = response.data.outputImageUri;

      // 2. We'll simulate getting a processed image back (for now, we'll pretend the personImage is the result)
      const mockAiResultUri = personImage; 

      // 3. Upload AI result to TRY-ON Bucket in Cloudflare R2
      const tryonResultUrl = await uploadFile(mockAiResultUri, 'image', 'tryon');
      
      if (tryonResultUrl) {
          setResultImage(tryonResultUrl);

          // 4. Save to Appwrite Memories Collection
          await databases.createDocument(
            appwriteConfig.databaseId!,
            appwriteConfig.memoryCollectionId!,
            ID.unique(),
            {
              user_id: user?.$id,
              image_url: tryonResultUrl,
              created_at: new Date().toISOString()
            }
          );
          
          Alert.alert("Success", "Try-on result saved!");
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to generate or save Try-On.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        <Text style={styles.title}>AI Virtual Try-On</Text>
        <Text style={styles.subtitle}>Upload a photo of yourself and a clothing item to see how it looks.</Text>

        <View style={styles.uploadRow}>
            <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setPersonImage)}>
                {personImage ? (
                    <Image source={{ uri: personImage }} style={styles.previewImage} />
                ) : (
                    <Text style={styles.uploadText}>+ Your Photo</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setGarmentImage)}>
                {garmentImage ? (
                    <Image source={{ uri: garmentImage }} style={styles.previewImage} />
                ) : (
                    <Text style={styles.uploadText}>+ Clothing</Text>
                )}
            </TouchableOpacity>
        </View>

        <TouchableOpacity 
            style={[styles.tryOnBtn, (!personImage || !garmentImage || isProcessing) && styles.disabledBtn]}
            onPress={handleVirtualTryOn}
            disabled={!personImage || !garmentImage || isProcessing}
        >
            {isProcessing ? (
                <ActivityIndicator color="#161622" />
            ) : (
                <Text style={styles.btnText}>Generate Try-On</Text>
            )}
        </TouchableOpacity>

        {resultImage && (
            <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>Your Try-On Result:</Text>
                <Image source={{ uri: resultImage }} style={styles.resultImage} resizeMode="cover" />
            </View>
        )}

      </View>
    </SafeAreaView>
  );
};

export default Create;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#161622' },
  content: { padding: 20, alignItems: 'center', height: '100%' },
  title: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10, marginTop: 20 },
  subtitle: { color: '#CDCDE0', textAlign: 'center', marginBottom: 30, fontSize: 14 },
  
  uploadRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 30 },
  uploadBox: {
      width: '48%', height: 180, backgroundColor: '#232533', 
      borderRadius: 15, justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: '#FF9C01', borderStyle: 'dashed'
  },
  uploadText: { color: '#FF9C01', fontWeight: 'bold' },
  previewImage: { width: '100%', height: '100%', borderRadius: 15 },
  
  tryOnBtn: { backgroundColor: '#FF9C01', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#161622', fontWeight: 'bold', fontSize: 16, textTransform: 'uppercase' },
  disabledBtn: { opacity: 0.5 },

  resultContainer: { marginTop: 40, width: '100%', alignItems: 'center' },
  resultTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  resultImage: { width: '100%', height: 350, borderRadius: 20, borderWidth: 2, borderColor: '#FF9C01' }
});