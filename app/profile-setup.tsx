import { useState } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, TextInput, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { databases, account, avatars, appwriteConfig } from '../lib/appwrite';
import { useGlobalContext } from '../context/GlobalProvider';
import { ID } from 'react-native-appwrite';

const ProfileSetup = () => {
  const { setUser, setIsLogged } = useGlobalContext();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    gender: 'Female', // Default to avoid empty errors
    age_range: '',
    body_shape: 'Slim',
    skin_tone: 1, // Default integer
    styles: '',
    shop_prefs: ''
  });

  const submitProfile = async () => {
    // 1. Validation
    if (!form.age_range || !form.styles) {
      Alert.alert("Missing Fields", "Please enter your age and style preference.");
      return;
    }

    setLoading(true);

    try {
      const currentAccount = await account.get();
      const avatarUrl = avatars.getInitials(currentAccount.name);

      // 2. Prepare Payload (Ensure types match DB exactly)
      const payload = {
          accountId: currentAccount.$id,
          username: currentAccount.name,
          email: currentAccount.email,
          avatar: avatarUrl.toString(),
          gender: form.gender,
          age_range: parseInt(form.age_range), // Must be Integer
          body_shape: form.body_shape,
          skin_tone: form.skin_tone,           // Must be Integer
          styles: form.styles,
          shop_prefs: form.shop_prefs || "None"
      };

      console.log("Sending Payload:", payload);

      // 3. Create Document
      const newUser = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        ID.unique(),
        payload
      );

      // 4. Success
      setUser(newUser);
      setIsLogged(true);
      router.replace('/home');

    } catch (error: any) {
      console.error("Save Failed:", error);
      Alert.alert("Save Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const OptionButton = ({ title, value, current, onSelect }: any) => (
    <TouchableOpacity
      onPress={() => onSelect(value)}
      style={{
        padding: 10,
        backgroundColor: current === value ? '#FF9C01' : '#1E1E2D',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: current === value ? '#FF9C01' : '#232533',
        marginRight: 8,
        marginBottom: 8
      }}
    >
      <Text style={{ color: current === value ? '#161622' : '#CDCDE0', fontWeight: '600', fontSize: 14 }}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#161622' }}>
      {/* ADDED: KeyboardAvoidingView so the keyboard doesn't hide text inputs */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }}>
          <Text style={{ fontSize: 24, color: 'white', fontWeight: 'bold', marginBottom: 10 }}>
            Complete Profile
          </Text>

          {/* Gender */}
          <Text style={{ color: '#CDCDE0', marginBottom: 8 }}>Gender</Text>
          <View style={{ flexDirection: 'row' }}>
            {['Male', 'Female', 'Other'].map(g => (
               <OptionButton key={g} title={g} value={g} current={form.gender} onSelect={(v: string) => setForm({...form, gender: v})} />
            ))}
          </View>

          {/* Age */}
          <Text style={{ color: '#CDCDE0', marginTop: 20, marginBottom: 8 }}>Age</Text>
          <TextInput 
              value={form.age_range} 
              onChangeText={(t) => setForm({...form, age_range: t})}
              keyboardType='numeric'
              placeholder="e.g. 24"
              placeholderTextColor="#555"
              style={{ backgroundColor: '#1E1E2D', color: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#232533' }} 
          />

          {/* Body Shape */}
          <Text style={{ color: '#CDCDE0', marginTop: 20, marginBottom: 8 }}>Body Shape</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {['Slim', 'Athletic', 'Curvy', 'Rectangular'].map(s => (
               <OptionButton key={s} title={s} value={s} current={form.body_shape} onSelect={(v: string) => setForm({...form, body_shape: v})} />
            ))}
          </View>

          {/* Skin Tone (Integer) */}
          <Text style={{ color: '#CDCDE0', marginTop: 20, marginBottom: 8 }}>Skin Tone Scale (1-6)</Text>
          <View style={{ flexDirection: 'row' }}>
            {[1, 2, 3, 4, 5, 6].map(tone => (
               <OptionButton key={tone} title={tone.toString()} value={tone} current={form.skin_tone} onSelect={(v: number) => setForm({...form, skin_tone: v})} />
            ))}
          </View>

          {/* Styles */}
          <Text style={{ color: '#CDCDE0', marginTop: 20, marginBottom: 8 }}>Style Preference</Text>
          <TextInput 
              value={form.styles} 
              onChangeText={(t) => setForm({...form, styles: t})}
              placeholder="e.g. Streetwear"
              placeholderTextColor="#555"
              style={{ backgroundColor: '#1E1E2D', color: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#232533' }} 
          />

          <TouchableOpacity onPress={submitProfile} style={{ backgroundColor: '#FF9C01', padding: 16, borderRadius: 12, marginTop: 40, alignItems: 'center' }}>
              {loading ? <ActivityIndicator color="#161622"/> : <Text style={{ color: '#161622', fontWeight: 'bold', fontSize: 18 }}>Save & Continue</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ProfileSetup;