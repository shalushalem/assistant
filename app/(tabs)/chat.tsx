import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router'; 
import { databases, appwriteConfig } from '../../lib/appwrite';
import { useGlobalContext } from '../../context/GlobalProvider';
import { ID, Query } from 'react-native-appwrite';
import { Audio } from 'expo-av'; 

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  boardIds?: string; // <-- ADDED to remember the style board IDs for this message
}

const ChatScreen = () => {
  const { user } = useGlobalContext(); 
  const isFocused = useIsFocused();
  
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Hello! I am Ahvi. Let me check what you have in your wardrobe today!' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [activeChips, setActiveChips] = useState<string[]>([]);

  const [currentMemory, setCurrentMemory] = useState('');
  const [memoryDocId, setMemoryDocId] = useState<string | null>(null);
  const [wardrobeItems, setWardrobeItems] = useState<any[]>([]);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Update with your local server IP
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

        const simplifiedWardrobe = wardrobeResponse.documents.map(doc => ({
          id: doc.$id,
          name: doc.name || "Unnamed Item",
          category: doc.category || "Unknown Category",
          tags: doc.tags || [],
          image_url: doc.image_url 
        }));
        
        setWardrobeItems(simplifiedWardrobe);
      } catch (error: any) {
        console.log("❌ Error fetching user data:", error.message);
      }
    };
    fetchData();
  }, [user, isFocused]);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('❌ Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    
    setRecording(null);
  };

  const sendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textOverride) setInputText('');
    
    setActiveChips([]); 
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
        let aiResponseText = data.message.content;
        let extractedIds: string | undefined = undefined;

        // 1. Check if the AI wants to open a style board
        const boardMatch = aiResponseText.match(/\[?STYLE_BOARD:\s*(.*?)(?:\]|\n|$)/i);
        
        if (boardMatch) {
            // 2. Extract the raw IDs
            extractedIds = boardMatch[1].trim();
            
            // 3. Remove the tag from the text the user sees
            aiResponseText = aiResponseText.replace(/\[?STYLE_BOARD:.*?(\]|\n|$)/gi, '').trim();
            
            // 4. Redirect immediately
            router.push({
                pathname: '/style-board',
                params: { ids: extractedIds }
            });
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponseText,
          boardIds: extractedIds // <-- SAVE the IDs in the message state
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (data.chips && data.chips.length > 0) {
            setActiveChips(data.chips);
        }

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
        {item.content ? (
            <Text style={{ color: isUser ? '#FFFFFF' : '#CDCDE0', fontSize: 16 }}>
            {item.content}
            </Text>
        ) : null}
        
        {/* NEW: Render a button to view the style board if IDs exist */}
        {item.boardIds && (
          <TouchableOpacity 
            style={{
              marginTop: 10,
              backgroundColor: '#161622',
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#FF9C01'
            }}
            onPress={() => router.push({ pathname: '/style-board', params: { ids: item.boardIds } })}
          >
            <Ionicons name="sparkles" size={16} color="#FF9C01" style={{ marginRight: 6 }} />
            <Text style={{ color: '#FF9C01', fontWeight: 'bold', fontSize: 14 }}>View Style Board</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#161622' }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingVertical: 16 }}
          keyboardShouldPersistTaps="handled"
        />

        {isLoading && (
          <View style={{ padding: 10, alignItems: 'flex-start', marginLeft: 16 }}>
             <ActivityIndicator color="#FF9C01" />
          </View>
        )}

        {activeChips.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 10, backgroundColor: '#161622' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {activeChips.map((chip, index) => (
                <TouchableOpacity 
                  key={index}
                  style={{ 
                    backgroundColor: '#FF9C01', 
                    paddingVertical: 8, 
                    paddingHorizontal: 16, 
                    borderRadius: 20, 
                    marginRight: 10,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                  onPress={() => sendMessage(chip)} 
                >
                  <Text style={{ color: '#161622', fontWeight: 'bold' }}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
          
          {inputText.trim() ? (
            <TouchableOpacity 
              onPress={() => sendMessage()}
              disabled={isLoading}
              style={{
                backgroundColor: '#FF9C01',
                borderRadius: 20,
                width: 44,
                height: 44,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPressIn={startRecording}
              onPressOut={stopRecording}
              disabled={isLoading}
              style={{
                backgroundColor: isRecording ? '#FF4C4C' : '#FF9C01', 
                borderRadius: 20,
                width: 44,
                height: 44,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: isLoading ? 0.5 : 1,
                transform: [{ scale: isRecording ? 1.2 : 1 }] 
              }}
            >
              <Ionicons name="mic" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;