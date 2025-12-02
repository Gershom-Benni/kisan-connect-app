// app/_layout.tsx
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import React, { useEffect } from "react";
import { useColorScheme } from "@/hooks/use-color-scheme";
import useAuthStore from "@/store/authStore";
SplashScreen.preventAutoHideAsync();

function InitialLoadGate() {
  const { user, isHydrated, hydrate } = useAuthStore();
  const colorScheme = useColorScheme();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated) {
      SplashScreen.hideAsync();
    }
  }, [isHydrated]);

  if (!isHydrated) {
    return null;
  }

  if (!user) {
    return (
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen
            name="(auth)/welcome"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="(auth)/login" options={{ title: "Login" }} />
          <Stack.Screen name="(auth)/signup" options={{ title: "Sign Up" }} />

          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false }}
            redirect
          />
          <Stack.Screen
            name="equipment/[id]"
            options={{ title: "Equipment Details" }}
            redirect
          />
          <Stack.Screen
            name="rent/summary"
            options={{ title: "Rent Summary" }}
            redirect
          />
          <Stack.Screen
            name="rent/details/[id]"
            options={{ title: "Order Details" }}
            redirect
          />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
            redirect
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="equipment/[id]"
          options={{ title: "Equipment Details" }}
        />
        <Stack.Screen name="rent/summary" options={{ title: "Rent Summary" }} />
        <Stack.Screen
          name="rent/details/[id]"
          options={{ title: "Order Details" }}
        />
        <Stack.Screen
          name="(auth)/welcome"
          options={{ headerShown: false }}
          redirect
        />
        <Stack.Screen
          name="(auth)/login"
          options={{ title: "Login" }}
          redirect
        />
        <Stack.Screen
          name="(auth)/signup"
          options={{ title: "Sign Up" }}
          redirect
        />

        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return <InitialLoadGate />;
}
