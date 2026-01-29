import { ExpoConfig, ConfigContext } from 'expo/config';

// Read from app.json as base
import appJson from './app.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME || '';

  // Start with base config from app.json
  const baseConfig = appJson.expo as ExpoConfig;

  // Filter out plugins that need dynamic configuration
  const basePlugins = (baseConfig.plugins || []).filter(plugin => {
    if (Array.isArray(plugin)) {
      const pluginName = plugin[0];
      return pluginName !== '@react-native-google-signin/google-signin';
    }
    return true;
  });

  // Build dynamic plugins array
  const dynamicPlugins: ExpoConfig['plugins'] = [...basePlugins];

  // Add Google Sign-In with dynamic URL scheme
  if (googleIosUrlScheme) {
    dynamicPlugins.push([
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: googleIosUrlScheme,
      },
    ]);
  } else {
    // Fallback to placeholder for development
    dynamicPlugins.push([
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: 'com.googleusercontent.apps.YOUR_IOS_CLIENT_ID',
      },
    ]);
  }

  return {
    ...baseConfig,
    plugins: dynamicPlugins,
  };
};
