import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { resetDb } from '@/db/db';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from 'react-native-toast-message';


export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useEffect(() => {
    resetDb(); // For development purposes only: reset DB on app start
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="addHabitModal"
            options={{
              presentation: 'modal',
              title: "Add Habit",
              contentStyle: { backgroundColor: "#fff" },
              headerStyle: { backgroundColor: Colors.grey[500] },
              headerTintColor: Colors.yellow[100], // back arrow + title color
              headerTitleStyle: { color: Colors.yellow[100] },
            }} />
          <Stack.Screen name="habitModal" options={{ presentation: 'modal', title: "Habit Details", headerStyle: { backgroundColor: "#fff" }, headerTintColor: "#000", contentStyle: { backgroundColor: "#fff" } }} />
          {/* <Stack.Screen name="redeemModal" options={{ presentation: 'modal', title: "Redeem Reward", headerStyle: { backgroundColor: "#fff" }, headerTintColor: "#000", contentStyle: { backgroundColor: "#fff" } }} /> */}
        </Stack>
        <StatusBar style="auto" />
        <Toast />
      </ThemeProvider>
    </GestureHandlerRootView>

  );
}
