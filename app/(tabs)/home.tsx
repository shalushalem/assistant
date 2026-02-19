import { View, Text, FlatList, Image, RefreshControl, SafeAreaView } from 'react-native';
import { useState } from 'react';
import { useGlobalContext } from '../../context/GlobalProvider';

const Home = () => {
  const { user } = useGlobalContext();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // simpler refresh logic for now
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <SafeAreaView style={{ backgroundColor: '#161622', height: '100%' }}>
      <FlatList
        data={[]} // We will populate this with outfit posts later
        keyExtractor={(item: any) => item.$id}
        renderItem={({ item }) => (
          <Text style={{ color: 'white' }}>{item.id}</Text>
        )}
        ListHeaderComponent={() => (
          <View style={{ marginVertical: 24, paddingHorizontal: 16, gap: 20 }}>
            
            {/* Header Section */}
            <View style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexDirection: 'row', marginBottom: 24 }}>
              <View>
                <Text style={{ fontSize: 14, color: '#CDCDE0', fontWeight: '500' }}>
                  Welcome Back,
                </Text>
                <Text style={{ fontSize: 24, color: 'white', fontWeight: '600' }}>
                  {user?.username || 'Fashionista'}
                </Text>
              </View>
              
              <View style={{ marginTop: 6 }}>
                <Image 
                    source={{ uri: user?.avatar }}
                    style={{ width: 40, height: 40, borderRadius: 8 }}
                    resizeMode='contain'
                />
              </View>
            </View>

            {/* Placeholder for Search or Featured Content */}
            <View style={{ width: '100%', height: 150, backgroundColor: '#232533', borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#CDCDE0' }}>Featured Styles Coming Soon</Text>
            </View>

            <View style={{ marginTop: 20 }}>
                <Text style={{ color: '#CDCDE0', fontSize: 18, fontWeight: '600' }}>
                    Latest Outfits
                </Text>
                {/* This is where the feed will go */}
            </View>
            
          </View>
        )}
        ListEmptyComponent={() => (
           <View style={{ alignItems: 'center', justifyContent: 'center', padding: 20 }}>
               <Text style={{ color: '#CDCDE0', textAlign: 'center' }}>
                   No outfits found. Go to "Try-On" to create one!
               </Text>
           </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </SafeAreaView>
  );
};

export default Home;