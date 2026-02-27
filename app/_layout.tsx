import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { initDb } from '@/db/db';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect } from 'react';

import { Colors, Radii } from '@/constants/theme';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast, { BaseToast } from 'react-native-toast-message';


export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useEffect(() => {
    initDb();
  }, []);

  const toastConfig = {
    success: (props: any) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: Colors.ui.accent,
          backgroundColor: Colors.ui.surfaceSoft,
          borderRadius: Radii.md,
        }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        text1Style={{
          fontSize: 16,
          fontWeight: '700',
          color: Colors.yellow[100], // yellow title
        }}
        text2Style={{
          fontSize: 14,
          color: Colors.yellow[100], // light grey text
        }}
      />
    ),
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="addHabitModal"
            options={{
              presentation: 'modal',
              title: "Add Habit",
              contentStyle: { backgroundColor: Colors.ui.background },
              headerStyle: { backgroundColor: Colors.ui.surface },
              headerTintColor: Colors.ui.accent,
              headerTitleStyle: { color: Colors.ui.accent, fontWeight: "700" },
            }} />
          <Stack.Screen name="habitModal"
            options={{
              presentation: 'modal',
              title: "Habit Details",
              headerStyle: { backgroundColor: Colors.ui.surface },
              headerTintColor: Colors.ui.accent,
              headerTitleStyle: { color: Colors.ui.accent, fontWeight: "700" },
            }} />
          {/* <Stack.Screen name="redeemModal" options={{ presentation: 'modal', title: "Redeem Reward", headerStyle: { backgroundColor: "#fff" }, headerTintColor: "#000", contentStyle: { backgroundColor: "#fff" } }} /> */}
        </Stack>
        <StatusBar style="auto" />
        <Toast config={toastConfig} />
      </ThemeProvider>
    </GestureHandlerRootView>

  );
}
