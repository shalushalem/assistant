import { useState } from "react";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { account, databases, appwriteConfig } from "../../lib/appwrite";
import { useGlobalContext } from "../../context/GlobalProvider";
import { Query } from "react-native-appwrite";

const SignIn = () => {
  const { setUser, setIsLogged } = useGlobalContext();
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const submit = async () => {
    if (!form.email || !form.password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setSubmitting(true);

    try {
      try {
        await account.deleteSession('current');
      } catch (e) {
        // Ignore error if no session exists to delete
      }

      await account.createEmailPasswordSession(form.email, form.password);
      const currentAccount = await account.get();

      const currentUser = await databases.listDocuments(
        appwriteConfig.databaseId!,
        appwriteConfig.userCollectionId!,
        [Query.equal("accountId", currentAccount.$id)]
      );

      if (currentUser.documents.length === 0) {
        setUser(currentAccount);
        setIsLogged(true);
        Alert.alert("Profile Incomplete", "Please complete your profile to continue.");
        router.replace("/profile-setup");
      } else {
        const userDoc = currentUser.documents[0];
        setUser(userDoc);
        setIsLogged(true);

        if (!userDoc.gender || !userDoc.body_shape || !userDoc.skin_tone) {
          Alert.alert("Profile Incomplete", "Please complete your profile to continue.");
          router.replace("/profile-setup");
        } else {
          router.replace("/home");
        }
      }
      
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: '#161622', height: '100%' }}>
      <ScrollView>
        <View style={{ width: '100%', justifyContent: 'center', height: '100%', paddingHorizontal: 16, marginVertical: 24 }}>
          
          <Text style={{ fontSize: 24, color: 'white', fontWeight: 'bold', marginTop: 10 }}>
            Log in to AHVI
          </Text>

          <View style={{ marginTop: 28 }}>
            <Text style={{ fontSize: 16, color: '#CDCDE0', fontWeight: '500', marginBottom: 8 }}>Email</Text>
            <View style={{ width: '100%', height: 64, paddingHorizontal: 16, backgroundColor: '#1E1E2D', borderRadius: 16, borderWidth: 1, borderColor: '#232533', flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                    style={{ flex: 1, color: 'white', fontWeight: '600', fontSize: 16 }}
                    value={form.email}
                    placeholder="Enter your email"
                    placeholderTextColor="#7B7B8B"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={(e) => setForm({ ...form, email: e })}
                />
            </View>
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 16, color: '#CDCDE0', fontWeight: '500', marginBottom: 8 }}>Password</Text>
            <View style={{ width: '100%', height: 64, paddingHorizontal: 16, backgroundColor: '#1E1E2D', borderRadius: 16, borderWidth: 1, borderColor: '#232533', flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                    style={{ flex: 1, color: 'white', fontWeight: '600', fontSize: 16 }}
                    value={form.password}
                    placeholder="Enter your password"
                    placeholderTextColor="#7B7B8B"
                    secureTextEntry
                    onChangeText={(e) => setForm({ ...form, password: e })}
                />
            </View>
          </View>

          <TouchableOpacity 
            onPress={submit}
            activeOpacity={0.7}
            style={{ 
              backgroundColor: '#FF9C01', 
              borderRadius: 16, 
              minHeight: 62, 
              justifyContent: 'center', 
              alignItems: 'center', 
              marginTop: 28, 
              opacity: isSubmitting ? 0.5 : 1 
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#161622" />
            ) : (
              <Text style={{ color: '#161622', fontWeight: 'bold', fontSize: 18 }}>
                  Log In
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ justifyContent: 'center', paddingTop: 20, flexDirection: 'row', gap: 8 }}>
            <Text style={{ fontSize: 16, color: '#CDCDE0', fontWeight: '400' }}>
              Don't have an account?
            </Text>
            <Link href="/sign-up" style={{ fontSize: 16, fontWeight: '600', color: '#FF9C01' }}>
              Sign Up
            </Link>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;