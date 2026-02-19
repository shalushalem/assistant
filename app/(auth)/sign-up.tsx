import { useState } from "react";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { ID } from "react-native-appwrite";
import { account } from "../../lib/appwrite"; 
import { useGlobalContext } from "../../context/GlobalProvider";

const SignUp = () => {
  const { setUser, setIsLogged } = useGlobalContext();
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const submit = async () => {
    if (!form.username || !form.email || !form.password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (form.password.length < 8) {
       Alert.alert("Error", "Password must be at least 8 characters");
       return;
    }

    setSubmitting(true);
    
    try {
      // CLEAR GHOST SESSIONS BEFORE SIGNING UP
      try {
        await account.deleteSession('current');
      } catch (e) {
        // ignore
      }
      
      const newAccount = await account.create(
        ID.unique(),
        form.email,
        form.password,
        form.username
      );

      await account.createEmailPasswordSession(form.email, form.password);
      
      setUser(newAccount); 
      setIsLogged(true);

      router.replace("/profile-setup");

    } catch (error: any) {
      console.error("CRITICAL ERROR during Sign Up:", error);
      Alert.alert("Sign Up Failed", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: '#161622', height: '100%' }}>
      <ScrollView>
        <View style={{ width: '100%', justifyContent: 'center', height: '100%', paddingHorizontal: 16, marginVertical: 24 }}>
          <Text style={{ fontSize: 24, color: 'white', fontWeight: 'bold', marginTop: 10 }}>
            Sign up to AHVI
          </Text>

          <View style={{ marginTop: 28 }}>
            <Text style={{ fontSize: 16, color: '#CDCDE0', fontWeight: '500', marginBottom: 8 }}>Username</Text>
            <TextInput
                style={{ backgroundColor: '#1E1E2D', padding: 16, borderRadius: 16, color: 'white', borderWidth: 1, borderColor: '#232533' }}
                value={form.username}
                placeholder="Enter username"
                placeholderTextColor="#7B7B8B"
                onChangeText={(e) => setForm({ ...form, username: e })}
            />
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 16, color: '#CDCDE0', fontWeight: '500', marginBottom: 8 }}>Email</Text>
            <TextInput
                style={{ backgroundColor: '#1E1E2D', padding: 16, borderRadius: 16, color: 'white', borderWidth: 1, borderColor: '#232533' }}
                value={form.email}
                placeholder="Enter email"
                placeholderTextColor="#7B7B8B"
                keyboardType="email-address"
                autoCapitalize="none"
                onChangeText={(e) => setForm({ ...form, email: e })}
            />
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 16, color: '#CDCDE0', fontWeight: '500', marginBottom: 8 }}>Password</Text>
            <TextInput
                style={{ backgroundColor: '#1E1E2D', padding: 16, borderRadius: 16, color: 'white', borderWidth: 1, borderColor: '#232533' }}
                value={form.password}
                placeholder="At least 8 characters"
                placeholderTextColor="#7B7B8B"
                secureTextEntry
                onChangeText={(e) => setForm({ ...form, password: e })}
            />
          </View>

          <TouchableOpacity 
            onPress={submit}
            activeOpacity={0.7}
            style={{ 
                backgroundColor: '#FF9C01', 
                borderRadius: 16, 
                padding: 16, 
                alignItems: 'center', 
                marginTop: 28,
                opacity: isSubmitting ? 0.5 : 1
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
                <ActivityIndicator color="#161622"/> 
            ) : (
                <Text style={{ color: '#161622', fontWeight: 'bold', fontSize: 18 }}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={{ justifyContent: 'center', paddingTop: 20, flexDirection: 'row', gap: 8 }}>
            <Text style={{ color: '#CDCDE0' }}>Have an account already?</Text>
            <Link href="/sign-in" style={{ fontWeight: '600', color: '#FF9C01' }}>Sign In</Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;