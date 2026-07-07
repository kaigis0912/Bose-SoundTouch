import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StatusBar, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  VolumeManager,
  useVolumeListener,
} from 'react-native-volume-manager';

// ── Configuration ──────────────────────────────────────────
// Change this to your Raspberry Pi's address
const PI_URL = 'http://192.168.0.179:8000/app';

export default function App() {
  const webViewRef = useRef(null);

  // Listen for hardware volume button presses
  useVolumeListener(({ volume }) => {
    // Forward volume change to the WebView's JavaScript
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        (function() {
          // Dispatch a custom event that our ReTouch app listens for
          window.dispatchEvent(new CustomEvent('nativeVolumeChange', { 
            detail: { direction: 'set' } 
          }));
        })();
        true;
      `);
    }
  });

  // Handle Android back button → go back in WebView history
  useEffect(() => {
    const onBackPress = () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true; // prevent app from closing
      }
      return false;
    };
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, []);

  // Inject JavaScript to intercept volume key events inside the WebView
  const injectedJS = `
    (function() {
      // Listen for native volume changes forwarded from React Native
      window.addEventListener('nativeVolumeChange', function(e) {
        // Find the volume API call — we trigger +5 or -5 based on last direction
        // Since we can't determine direction from the event alone,
        // we use a keydown simulation approach instead
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'VolumeUp', bubbles: true }));
      });

      // Prevent the WebView from scrolling when not needed
      document.body.style.overscrollBehavior = 'none';
    })();
    true;
  `;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <WebView
        ref={webViewRef}
        source={{ uri: PI_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsBackForwardNavigationGestures={true}
        startInLoadingState={true}
        injectedJavaScript={injectedJS}
        // Allow mixed content (HTTP Pi on HTTPS context)
        mixedContentMode="always"
        // Allow file access
        allowFileAccess={true}
        // User agent to identify as ReTouch App
        userAgent="ReTouch-Android/1.0"
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
});
