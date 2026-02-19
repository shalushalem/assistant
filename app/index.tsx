import { Redirect, router } from "expo-router";
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalContext } from "../context/GlobalProvider";

export default function App() {
  const { loading, isLogged } = useGlobalContext();

  if (!loading && isLogged) return <Redirect href="/home" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#161622' }}>
      <ScrollView contentContainerStyle={{ height: '100%' }}>
        <View style={{ width: '100%', justifyContent: 'center', alignItems: 'center', height: '100%', paddingHorizontal: 16 }}>
          
          <Text style={{ fontSize: 30, color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
            AHVI
          </Text>
          
          <Text style={{ fontSize: 14, color: '#CDCDE0', marginTop: 20, textAlign: 'center' }}>
            Virtual Try-On & AI Fashion Assistant
          </Text>

          <TouchableOpacity
            onPress={() => router.push('/sign-in')}
            style={{ 
              backgroundColor: '#FF9C01', 
              padding: 16, 
              borderRadius: 8, 
              width: '100%', 
              marginTop: 40,
              alignItems: 'center'
            }}
          >
            <Text style={{ color: '#161622', fontWeight: 'bold', fontSize: 16 }}>
              Continue with Email
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
      
      {loading && (
        <View style={{ position: 'absolute', height: '100%', width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}
    </SafeAreaView>
  );
}