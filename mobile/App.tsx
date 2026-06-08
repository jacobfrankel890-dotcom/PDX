import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { APP_NAME, APP_URL } from "./config";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  const onLoadEnd = useCallback(async () => {
    setLoading(false);
    await SplashScreen.hideAsync();
  }, []);

  const onNavigationStateChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  }, []);

  if (!APP_URL) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.errorContainer}>
          <Text style={styles.errorTitle}>{APP_NAME}</Text>
          <Text style={styles.errorText}>
            App URL not configured.{"\n\n"}
            Set EXPO_PUBLIC_APP_URL to your deployed Vercel URL before building.
          </Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <ExpoStatusBar style="light" />
        {Platform.OS === "android" && (
          <StatusBar backgroundColor="#1e3a5f" barStyle="light-content" />
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: APP_URL }}
          style={styles.webview}
          onLoadEnd={onLoadEnd}
          onNavigationStateChange={onNavigationStateChange}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          domStorageEnabled
          javaScriptEnabled
          allowsBackForwardNavigationGestures={canGoBack}
          allowsInlineMediaPlayback
          mediaCapturePermissionGrantType="grant"
          startInLoadingState
          originWhitelist={["https://*", "http://*"]}
          onError={() => setLoading(false)}
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#1e3a5f" />
              <Text style={styles.loadingText}>Loading {APP_NAME}…</Text>
            </View>
          )}
        />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1e3a5f" />
            <Text style={styles.loadingText}>Loading {APP_NAME}…</Text>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e3a5f",
  },
  webview: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#1e3a5f",
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e3a5f",
    marginBottom: 16,
  },
  errorText: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
  },
});
