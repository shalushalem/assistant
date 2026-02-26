import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router'; 
import { databases, appwriteConfig } from '../../lib/appwrite';
import { useGlobalContext } from '../../context/GlobalProvider';
import { ID, Query } from 'react-native-appwrite';
import { Audio } from 'expo-av'; 
import * as Speech from 'expo-speech'; 
import * as FileSystem from 'expo-file-system/legacy';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  boardIds?: string; 
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
  const SERVER_IP = 'http://192.168.29.193:8000';
  const OLLAMA_ENDPOINT = `${SERVER_IP}/api/text`;
  const TRANSCRIBE_ENDPOINT = `${SERVER_IP}/api/transcribe`;

  // Stop Ahvi from talking if we leave the screen
  useEffect(() => {
    if (!isFocused) {
      Speech.stop();
    }
  }, [isFocused]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.$id || !isFocused) return;
      try {
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
      if (recording) return; 

      Speech.stop(); 
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error('❌ Failed to start recording', err);
      setRecording(null); 
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI(); 
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      setRecording(null); 

      if (uri) {
          transcribeAudio(uri);
      }
    } catch (err) {
      console.error('❌ Failed to stop recording cleanly', err);
      setRecording(null); 
    }
  };

  const transcribeAudio = async (uri: string) => {
    setIsLoading(true);
    try {
      console.log(`📤 Uploading audio to server from ${Platform.OS}...`);
      let data;

      if (Platform.OS === 'web') {
        const localResponse = await fetch(uri);
        const audioBlob = await localResponse.blob();
        
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio_record.webm');

        const serverResponse = await fetch(TRANSCRIBE_ENDPOINT, {
          method: 'POST',
          body: formData,
        });
        
        if (!serverResponse.ok) throw new Error(`Server returned ${serverResponse.status}`);
        data = await serverResponse.json();

      } else {
        const response = await FileSystem.uploadAsync(TRANSCRIBE_ENDPOINT, uri, {
          fieldName: 'file',
          httpMethod: 'POST',
          uploadType: 1, 
          mimeType: 'audio/m4a', 
        });
        data = JSON.parse(response.body);
      }
      
      if (data.text) {
        console.log("✅ Ahvi heard:", data.text);
        // Pass true to indicate this came from voice
        sendMessage(data.text, true); 
      } else {
        alert("Ahvi couldn't hear you clearly.");
      }
    } catch (error) {
      console.error("Transcription error:", error);
      alert("Failed to reach Ahvi's voice server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Added isVoiceInput parameter defaulting to false
  const sendMessage = async (textOverride?: string, isVoiceInput: boolean = false) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim()) return;

    Speech.stop(); 

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
          wardrobe_items: wardrobeItems,
          is_voice_input: isVoiceInput // Pass the flag to the backend
        }),
      });

      const data = await response.json();

      if (data.message) {
        let aiResponseText = data.message.content;
        let extractedIds: string | undefined = undefined;

        const boardMatch = aiResponseText.match(/\[?STYLE_BOARD:\s*(.*?)(?:\]|\n|$)/i);
        
        if (boardMatch) {
            extractedIds = boardMatch[1].trim();
            aiResponseText = aiResponseText.replace(/\[?STYLE_BOARD:.*?(\]|\n|$)/gi, '').trim();
            
            router.push({
                pathname: '/style-board',
                params: { ids: extractedIds }
            });
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponseText,
          boardIds: extractedIds 
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // ---------------------------------------------------------
        // 🎙️ PLAY YOUR CUSTOM CLONED VOICE (ONLY IF VOICE INPUT)
        // ---------------------------------------------------------
        if (isVoiceInput) {
            if (data.audio_base64) {
                try {
                    // XTTS generates .wav files, so we specify audio/wav here
                    const uri = `data:audio/wav;base64,${data.audio_base64}`;
                    
                    // Initialize audio playback for iOS/Android
                    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
                    const { sound } = await Audio.Sound.createAsync({ uri });
                    
                    await sound.playAsync();
                    
                    // Unload the file to free up memory when finished
                    sound.setOnPlaybackStatusUpdate((status) => {
                        if (status.isLoaded && status.didJustFinish) {
                            sound.unloadAsync();
                        }
                    });
                } catch (audioError) {
                    console.error("❌ Failed to play cloned voice:", audioError);
                }
            } else {
                // Fallback just in case the server fails to clone the voice
                console.log("⚠️ No base64 audio received, falling back to robot voice.");
                Speech.speak(aiResponseText);
            }
        }

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