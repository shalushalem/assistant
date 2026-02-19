import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { account } from '../../lib/appwrite';
import { useGlobalContext } from '../../context/GlobalProvider';
import { Ionicons } from '@expo/vector-icons';

const Profile = () => {
  const { user, setUser, setIsLogged } = useGlobalContext();

  const logout = async () => {
    try {
        await account.deleteSession('current');
        setUser(null);
        setIsLogged(false);
        router.replace('/sign-in');
    } catch (error) {
        Alert.alert("Error", "Failed to logout");
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: '#161622', height: '100%' }}>
      <View style={{ width: '100%', justifyContent: 'center', alignItems: 'center', marginTop: 60, paddingHorizontal: 16 }}>
        
        {/* Avatar */}
        <View style={{ width: 86, height: 86, borderColor: '#FF9C01', borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}>
            <Image 
                source={{ uri: user?.avatar }}
                style={{ width: '90%', height: '90%', borderRadius: 8 }}
                resizeMode='cover'
            />
        </View>

        {/* Info */}
        <View style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
                {user?.username}
            </Text>
            <Text style={{ color: '#CDCDE0', fontSize: 14 }}>
                {user?.email}
            </Text>
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', marginTop: 30, gap: 40 }}>
            <View style={{ alignItems: 'center' }}>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: '600' }}>0</Text>
                <Text style={{ color: '#CDCDE0', fontSize: 12 }}>Outfits</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: '600' }}>0</Text>
                <Text style={{ color: '#CDCDE0', fontSize: 12 }}>Saved</Text>
            </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
            onPress={logout}
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 50, backgroundColor: '#1E1E2D', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, borderWidth: 1, borderColor: '#232533' }}
        >
            <Ionicons name="log-out-outline" size={24} color="#FF5A5F" />
            <Text style={{ color: '#FF5A5F', fontWeight: '600', marginLeft: 10 }}>
                Log Out
            </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

export default Profile;