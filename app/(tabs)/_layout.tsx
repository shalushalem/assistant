import { Tabs, Redirect } from 'expo-router';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalContext } from '../../context/GlobalProvider';

const TabIcon = ({ icon, color, name, focused }: any) => {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={{ 
          color: color, 
          fontSize: 10, 
          fontWeight: focused ? '600' : '400' 
      }}>
        {name}
      </Text>
    </View>
  );
};

const TabsLayout = () => {
  const { loading, isLogged } = useGlobalContext();

  if (!loading && !isLogged) return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#FF9C01',
        tabBarInactiveTintColor: '#CDCDE0',
        tabBarStyle: {
          backgroundColor: '#161622',
          borderTopWidth: 1,
          borderTopColor: '#232533',
          height: 84,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={focused ? "home" : "home-outline"} color={color} name="Home" focused={focused} />
          ),
        }}
      />

      {/* --- NEW WARDROBE TAB --- */}
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: 'Wardrobe',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={focused ? "shirt" : "shirt-outline"} color={color} name="Wardrobe" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: 'Try-On',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={focused ? "camera" : "camera-outline"} color={color} name="Try-On" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={focused ? "person" : "person-outline"} color={color} name="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;