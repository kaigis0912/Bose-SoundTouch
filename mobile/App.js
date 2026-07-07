import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StatusBar, View, StyleSheet, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { VolumeManager } from 'react-native-volume-manager';

// ── Configuration ──────────────────────────────────────────
// Change this to your Raspberry Pi's address
const PI_URL = 'http://192.168.0.179:8000/app';

export default function App() {
  const webViewRef = useRef(null);
  const lastVol = useRef(null);

  // Listen for hardware volume button presses
  useEffect(() => {
    // Hide the native OS volume UI so we don't show the phone's volume bar
    VolumeManager.showNativeVolumeUI({ enabled: false });

    const volumeListener = VolumeManager.addVolumeListener((result) => {
      const newVol = result.volume;
      let direction = null;
      
      if (lastVol.current !== null) {
        if (newVol > lastVol.current) {
          direction = 'up';
        } else if (newVol < lastVol.current) {
          direction = 'down';
        }
      }
      lastVol.current = newVol;

      if (direction && webViewRef.current) {
        const keyName = direction === 'up' ? 'VolumeUp' : 'VolumeDown';
        webViewRef.current.injectJavaScript(`
          (function() {
            window.dispatchEvent(new CustomEvent('nativeVolumeChange', { 
              detail: { key: '${keyName}' } 
            }));
          })();
          true;
        `);
      }

      // Hacky workaround: reset volume back away from extremes to keep receiving updates
      if (newVol >= 1.0) {
        VolumeManager.setVolume(0.95, { showUI: false });
        lastVol.current = 0.95;
      } else if (newVol <= 0.0) {
        VolumeManager.setVolume(0.05, { showUI: false });
        lastVol.current = 0.05;
      }
    });

    return () => {
      volumeListener.remove();
      VolumeManager.showNativeVolumeUI({ enabled: true });
    };
  }, []);

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
        const key = e.detail.key; // 'VolumeUp' or 'VolumeDown'
        document.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true }));
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
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={(request) => {
          // Intercept intent:// or spotify:// URLs and pass them to the OS
          if (request.url.startsWith('intent://') || request.url.startsWith('spotify:')) {
            Linking.openURL(request.url).catch((err) => {
              console.warn('Could not open external URL', request.url, err);
            });
            return false; // Prevent WebView from trying to load it
          }
          return true;
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
