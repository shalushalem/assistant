import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Create = () => {
  return (
    <SafeAreaView style={{ backgroundColor: '#161622', height: '100%' }}>
      <View style={{ height: '100%', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        
        <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>
            AI Virtual Try-On
        </Text>
        
        <Text style={{ color: '#CDCDE0', textAlign: 'center', marginBottom: 30 }}>
            Upload a photo of yourself and a clothing item to see how it looks.
        </Text>

        <TouchableOpacity 
            style={{ backgroundColor: '#FF9C01', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 10 }}
            onPress={() => console.log("Open Camera/Gallery")}
        >
            <Text style={{ color: '#161622', fontWeight: 'bold', fontSize: 16 }}>
                Upload Photo
            </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

export default Create;