import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { ReadableStream } from 'web-streams-polyfill';
import { Stack } from "expo-router";
import GlobalProvider from "../context/GlobalProvider";

// Polyfill for ReadableStream if it's missing in the environment
if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = ReadableStream;
}

const RootLayout = () => {
  return (
    <GlobalProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
        <Stack.Screen name="style-board" options={{ headerShown: false }} />
        <Stack.Screen name="save-style-card" options={{ headerShown: false }} />
      </Stack>
    </GlobalProvider>
  );
};

export default RootLayout;