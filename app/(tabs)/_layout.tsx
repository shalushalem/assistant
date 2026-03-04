import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons'; // Built-in Expo icons

const { width, height } = Dimensions.get('window');

// Custom Top Bar Component
const CustomHeader = () => (
  <SafeAreaView style={{ zIndex: 10 }}>
    <View style={styles.topbar}>
      <Text style={styles.logo}>AHVI</Text>
      <View style={styles.topbarRight}>
        {/* Language Switcher */}
        <TouchableOpacity style={styles.langBtn}>
          <Text style={styles.langText}>🇬🇧 EN</Text>
        </TouchableOpacity>
        
        {/* Profile Avatar */}
        <TouchableOpacity style={styles.userBlock}>
          <View style={styles.avatar}>
            <Feather name="user" size={16} color="rgba(0,0,0,0.6)" />
          </View>
          <Text style={styles.userMsg}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  </SafeAreaView>
);

// Custom Bottom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.bottomNavContainer}>
      <BlurView intensity={40} tint="light" style={styles.bottomNav}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.title || route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Map route names to Feather icons
          let iconName: any = 'circle';
          if (route.name === 'chat') iconName = 'message-square';
          if (route.name === 'wardrobe') iconName = 'briefcase';
          if (route.name === 'create') iconName = 'grid'; // representing boards
          if (route.name === 'home') iconName = 'compass'; // representing explore

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tab}
            >
              {isFocused && <View style={styles.activeTabIndicator} />}
              <Feather 
                name={iconName} 
                size={22} 
                color={isFocused ? '#000000' : 'rgba(50, 30, 60, 0.45)'} 
                style={{ marginBottom: 4 }}
              />
              <Text style={[styles.tabText, isFocused && styles.tabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
};

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      {/* Background Gradients and Orbs */}
      <LinearGradient
        colors={['#f8eef5', '#f2e8f8', '#eaeaf8', '#e8eef8']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      <View style={[styles.orb, styles.orb3]} />

      {/* Main App Container (The "Phone" box in your CSS) */}
      <View style={styles.appWrapper}>
        <CustomHeader />
        
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false, // We use our CustomHeader instead
            sceneStyle: { backgroundColor: 'transparent' }, // Important so background shows through
          }}
        >
          <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
          <Tabs.Screen name="wardrobe" options={{ title: 'Wardrobe' }} />
          <Tabs.Screen name="create" options={{ title: 'Boards' }} />
          <Tabs.Screen name="home" options={{ title: 'Explore' }} />
          {/* Hide profile from bottom tabs since it's in the top bar */}
          <Tabs.Screen name="profile" options={{ href: null }} /> 
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Ambient Orbs
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.5,
  },
  orb1: {
    width: 420, height: 420,
    backgroundColor: '#f8ddd0',
    top: -120, left: -120,
  },
  orb2: {
    width: 380, height: 380,
    backgroundColor: '#dcc8f5',
    bottom: -120, right: -120,
  },
  orb3: {
    width: 280, height: 280,
    backgroundColor: '#f0d0e8',
    top: '25%', left: '35%',
  },
  appWrapper: {
    flex: 1,
    backgroundColor: 'rgba(253, 238, 232, 0.4)', // Soft tint over the main background
  },
  // Top Bar Styles
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 14,
  },
  logo: {
    fontFamily: 'PlayfairDisplay-Bold', // Ensure you load this font in App.tsx/_layout.tsx!
    fontSize: 32,
    color: '#000',
    fontWeight: '700',
  },
  topbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  langText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  userBlock: {
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMsg: {
    fontSize: 9,
    fontWeight: '600',
    color: '#000',
    marginTop: 3,
  },
  // Bottom Nav Styles
  bottomNavContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 245, 253, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    overflow: 'hidden', // Required for BlurView to clip to borderRadius
  },
  tab: {
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 10,
  },
  activeTabIndicator: {
    position: 'absolute',
    top: -12,
    width: 18,
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  tabText: {
    fontSize: 10.5,
    fontWeight: '500',
    color: 'rgba(50, 30, 60, 0.5)',
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
});