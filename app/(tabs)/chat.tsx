import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { databases, appwriteConfig } from '../../lib/appwrite';
import { useGlobalContext } from '../../context/GlobalProvider';
import { ID, Query } from 'react-native-appwrite';

// --- NEW: Added 'image' to the interface ---
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string; 
}

const ChatScreen = () => {
  const { user } = useGlobalContext(); 
  const isFocused = useIsFocused();
  
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Hello! I am Ahvi. Let me check what you have in your wardrobe today!' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [currentMemory, setCurrentMemory] = useState('');
  const [memoryDocId, setMemoryDocId] = useState<string | null>(null);
  const [wardrobeItems, setWardrobeItems] = useState<any[]>([]);

  const OLLAMA_ENDPOINT = 'http://192.168.29.193:8000/api/text';

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.$id || !isFocused) return;
      
      try {
        console.log("🔄 Ahvi is refreshing her eyes...");

        const memResponse = await databases.listDocuments(
          appwriteConfig.databaseId!,
          appwriteConfig.memoryCollectionId!,
          [Query.equal('userId', user.$id)]
        );

        if (memResponse.documents.length > 0) {
          setCurrentMemory(memResponse.documents[0].memory);
          setMemoryDocId(memResponse.documents[0].$id);
        }

        const wardrobeResponse = await databases.listDocuments(
          appwriteConfig.databaseId!,
          appwriteConfig.outfitCollectionId!,
          [Query.equal('user_id', user.$id)] 
        );

        // --- NEW: Appending $id and image_url so the Collage Engine can use them! ---
        const simplifiedWardrobe = wardrobeResponse.documents.map(doc => ({
          id: doc.$id,
          name: doc.name || "Unnamed Item",
          category: doc.category || "Unknown Category",
          tags: doc.tags || [],
          image_url: doc.image_url 
        }));
        
        setWardrobeItems(simplifiedWardrobe);
        console.log("✅ Wardrobe Updated! Items found:", simplifiedWardrobe.length);

      } catch (error: any) {
        console.log("❌ Error fetching user data:", error.message);
      }
    };

    fetchData();
  }, [user, isFocused]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const userProfile = {
        username: user?.username || 'Buddy',
        gender: user?.gender || 'male', 
      };

      const response = await fetch(OLLAMA_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          language: "en",
          current_memory: currentMemory,
          user_profile: userProfile,
          wardrobe_items: wardrobeItems 
        }),
      });

      const data = await response.json();

      if (data.message) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message.content,
          image: data.image // --- NEW: Catch the Base64 image from Python ---
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (data.updated_memory && data.updated_memory !== currentMemory && user?.$id) {
          setCurrentMemory(data.updated_memory);
          
          if (memoryDocId) {
            await databases.updateDocument(
              appwriteConfig.databaseId!,
              appwriteConfig.memoryCollectionId!,
              memoryDocId,
              { memory: data.updated_memory }
            );
          } else {
            const newDoc = await databases.createDocument(
              appwriteConfig.databaseId!,
              appwriteConfig.memoryCollectionId!,
              ID.unique(),
              { userId: user.$id, memory: data.updated_memory }
            );
            setMemoryDocId(newDoc.$id);
          }
        }
      }
    } catch (error) {
      console.error("Error communicating with server:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I am having trouble connecting right now.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        backgroundColor: isUser ? '#FF9C01' : '#232533',
        padding: 12,
        marginVertical: 4,
        marginHorizontal: 16,
        borderRadius: 16,
        maxWidth: '80%',
      }}>
        <Text style={{ color: isUser ? '#FFFFFF' : '#CDCDE0', fontSize: 16 }}>
          {item.content}
        </Text>

        {/* --- NEW: Display the Style Board Image! --- */}
        {item.image && (
          <Image 
            source={{ uri: `data:image/jpeg;base64,${item.image}` }} 
            style={{ width: 250, height: 180, borderRadius: 10, marginTop: 10 }}
            resizeMode="contain"
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#161622' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingVertical: 16 }}
        />

        {isLoading && (
          <View style={{ padding: 10, alignItems: 'flex-start', marginLeft: 16 }}>
             <ActivityIndicator color="#FF9C01" />
          </View>
        )}

        <View style={{ 
          flexDirection: 'row', 
          padding: 16, 
          backgroundColor: '#232533',
          borderTopWidth: 1,
          borderTopColor: '#161622'
        }}>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: '#161622',
              color: '#FFFFFF',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              marginRight: 10,
            }}
            placeholder="Ask Ahvi what to wear..."
            placeholderTextColor="#CDCDE0"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            onPress={sendMessage}
            disabled={isLoading || !inputText.trim()}
            style={{
              backgroundColor: '#FF9C01',
              borderRadius: 20,
              width: 44,
              height: 44,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: (isLoading || !inputText.trim()) ? 0.5 : 1
            }}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;