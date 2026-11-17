import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
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

const GLYPH: Record<string, string> = { index: '⌖', ukoly: '✓', sbirka: '❖', zebricek: '♜', hrdina: '♛' };

export default function RootLayout() {
  const [loaded, error] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_700Bold,
  });
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);
  if (!loaded && !error) return null;

  return (
    <View style={styles.page}>
      <View style={styles.frame}>
        <StatusBar style="dark" />
        <GameSensors />
        <Tabs
          screenOptions={({ route }) => ({
            headerShown: false,
            sceneStyle: { backgroundColor: color.plaster },
            tabBarStyle: styles.bar,
            tabBarActiveTintColor: color.signRed,
            tabBarInactiveTintColor: color.inkMute,
            tabBarLabelStyle: styles.label,
            tabBarIcon: ({ color: tint }) => <Text style={[styles.icon, { color: tint }]}>{GLYPH[route.name] ?? '•'}</Text>,
          })}
        >
          <Tabs.Screen name="index" options={{ title: t.tabs.map }} />
          <Tabs.Screen name="ukoly" options={{ title: t.tabs.quests }} />
          <Tabs.Screen name="sbirka" options={{ title: t.tabs.collection }} />
          <Tabs.Screen name="zebricek" options={{ title: t.tabs.leaderboard }} />
          <Tabs.Screen name="hrdina" options={{ title: t.tabs.profile }} />
        </Tabs>
        <LevelUpOverlay />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // On a wide browser window the game keeps its phone proportions, centred.
  page: { flex: 1, backgroundColor: Platform.OS === 'web' ? '#2A2622' : color.plaster, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 480 : undefined, backgroundColor: color.plaster, overflow: 'hidden' },
  bar: { backgroundColor: color.enamel, borderTopColor: color.signRed, borderTopWidth: 3, ...(Platform.OS === 'web' ? { height: 64 } : {}) },
  label: { fontFamily: font.sign, fontSize: 13, lineHeight: 16, letterSpacing: 0.4, marginBottom: 2 },
  icon: { fontSize: 19, lineHeight: 22 },
});
