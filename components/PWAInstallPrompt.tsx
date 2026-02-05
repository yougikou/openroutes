import React, { useEffect, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Button, Surface, Text, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from './i18n/LanguageContext';
import i18n from './i18n/i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [shouldShow, setShouldShow] = useState(false);
  const { locale } = useLanguage();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let mounted = true;

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      if (mounted) {
        setDeferredPrompt(e);
      }
    };

    // Attach listener immediately to avoid race conditions
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);

    // Check storage asynchronously
    const checkDismissed = async () => {
      try {
        const dismissed = await AsyncStorage.getItem('pwa_prompt_dismissed');
        if (mounted && dismissed !== 'true') {
           setShouldShow(true);
        }
      } catch (e) {
        console.error('Failed to check pwa dismissed state', e);
      }
    };

    checkDismissed();

    return () => {
      mounted = false;
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShouldShow(false);
    } else {
      console.log('User dismissed the install prompt');
      setShouldShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = async () => {
    setShouldShow(false);
    try {
      await AsyncStorage.setItem('pwa_prompt_dismissed', 'true');
    } catch (e) {
      console.error('Failed to save pwa dismissed state', e);
    }
  };

  if (!deferredPrompt || !shouldShow) return null;

  return (
    <Surface
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceVariant,
          paddingBottom: Math.max(insets.bottom, 16)
        }
      ]}
      elevation={4}
    >
      <View style={styles.content}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>{i18n.t('pwa_install_title')}</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{i18n.t('pwa_install_desc')}</Text>
      </View>
      <View style={styles.actions}>
        <Button onPress={handleDismiss} textColor={theme.colors.secondary}>
          {i18n.t('pwa_dismiss_btn')}
        </Button>
        <Button mode="contained" onPress={handleInstall} style={{ marginLeft: 8 }}>
          {i18n.t('pwa_install_btn')}
        </Button>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    zIndex: 10000,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    flex: 1,
    paddingRight: 16,
    minWidth: 200,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
});
