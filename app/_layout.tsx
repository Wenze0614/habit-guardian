import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { initDb } from '@/db/db';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { StyleSheet, Text } from 'react-native';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast, { BaseToast } from 'react-native-toast-message';


export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const startedAt = Date.now();
      initDb();

      // Keep the branded loading screen visible long enough to feel intentional.
      const minimumDisplayMs = 1000;
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, minimumDisplayMs - elapsed);

      //intentionl delay
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      if (isMounted) {
        setIsReady(true);
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
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

  if (!isReady) {
    return (
      <GestureHandlerRootView style={styles.loadingContainer}>
        {/* <View style={styles.loadingOrb} /> */}
        <Text style={styles.loadingTitle}>Habit & Reward</Text>
        <Text style={styles.loadingSubtitle}>Build momentum. Earn the stars.</Text>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="addHabitModal"
            options={{
              presentation: 'modal',
              title: "Add Item",
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ui.background,
    padding: Spacing.xl,
  },
  loadingOrb: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: Colors.ui.accent,
    shadowColor: Colors.ui.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
    marginBottom: Spacing.lg,
  },
  loadingTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: Colors.ui.textPrimary,
  },
  loadingSubtitle: {
    marginTop: Spacing.sm,
    fontSize: 14,
    color: Colors.ui.textSecondary,
  },
});
