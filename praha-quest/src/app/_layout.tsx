import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
import { Fraunces_400Regular_Italic } from '@expo-google-fonts/fraunces/400Regular_Italic';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Fraunces_800ExtraBold } from '@expo-google-fonts/fraunces/800ExtraBold';
import { useFonts } from 'expo-font';
import { Tabs } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { LevelUpOverlay } from '@/components/level-up-overlay';
import { t } from '@/i18n';
import { startFeedback } from '@/services/feedback';
import { GameSensors } from '@/services/game-sensors';
import { color, font } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
startFeedback();

const GLYPH = { index: '⬡', sbirka: '❖', hrdina: '♛' } as const;

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_700Bold,
    Fraunces_400Regular_Italic,
    Fraunces_600SemiBold,
    Fraunces_800ExtraBold,
  });
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);
  if (!loaded && !error) return null;

  return (
    <View style={styles.page}>
      <View style={styles.frame}>
        <StatusBar style="light" />
        <GameSensors />
        <Tabs
          screenOptions={({ route }) => ({
            headerShown: false,
            sceneStyle: { backgroundColor: color.night },
            tabBarStyle: styles.bar,
            tabBarActiveTintColor: color.gilt,
            tabBarInactiveTintColor: color.parchmentDim,
            tabBarLabelStyle: styles.label,
            tabBarIcon: ({ color: tint }) => (
              <Text style={[styles.icon, { color: tint }]}>{GLYPH[route.name as keyof typeof GLYPH] ?? '•'}</Text>
            ),
          })}
        >
          <Tabs.Screen name="index" options={{ title: t.tabs.map }} />
          <Tabs.Screen name="sbirka" options={{ title: t.tabs.collection }} />
          <Tabs.Screen name="hrdina" options={{ title: t.tabs.profile }} />
        </Tabs>
        <LevelUpOverlay />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // On a wide browser window the game keeps its phone proportions, centred.
  page: { flex: 1, backgroundColor: Platform.OS === 'web' ? '#08121A' : color.night, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 480 : undefined, backgroundColor: color.night, overflow: 'hidden' },
  bar: { backgroundColor: color.night, borderTopColor: color.slateHigh, borderTopWidth: StyleSheet.hairlineWidth },
  label: { fontFamily: font.bodyMedium, fontSize: 12 },
  icon: { fontSize: 20, lineHeight: 24 },
});
