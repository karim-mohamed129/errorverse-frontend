import { useEffect } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFonts } from "expo-font";

const PRECONNECT_URLS = [
  "https://dreamhrms.com",
  "https://pub-6e858d0030694c939e41b0ddc46a9998.r2.dev",
];

function addPreconnectLinks() {
  if (typeof document === "undefined") return;

  PRECONNECT_URLS.forEach((href) => {
    if (document.querySelector(`link[data-error505-preconnect="${href}"]`)) return;

    const dnsPrefetch = document.createElement("link");
    dnsPrefetch.rel = "dns-prefetch";
    dnsPrefetch.href = href;
    dnsPrefetch.setAttribute("data-error505-preconnect", href);
    document.head.appendChild(dnsPrefetch);

    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = href;
    preconnect.crossOrigin = "anonymous";
    preconnect.setAttribute("data-error505-preconnect", href);
    document.head.appendChild(preconnect);
  });
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    Neotoxic: require("../assets/fonts/Neotoxic-Regular.ttf"),
    NeoSansArabicLight: require("../assets/fonts/NeoSansArabicLight.ttf"),
  });

  // Do not block the first paint while custom fonts are loading.
  // The app renders immediately, then swaps to the project fonts when ready.
  void fontsLoaded;

  useEffect(() => {
    addPreconnectLinks();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen
          name="modal"
          options={{
            presentation: "modal",
          }}
        />
        <Stack.Screen name="(tabs)" />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
