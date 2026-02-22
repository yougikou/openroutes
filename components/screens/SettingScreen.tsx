import React, { useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, ScrollView, ActivityIndicator, Linking, Platform } from 'react-native';
import { Appbar, List, useTheme, Surface, Text, Button, Divider, Avatar, Banner, Portal, Dialog, Paragraph } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import i18n from '../i18n/i18n';
import { readData, deleteData } from '../apis/StorageAPI';
import { exchangeToken } from '../apis/GitHubAPI';
import Redirector from '../Redirector';
import { useLanguage } from '../i18n/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n/supportedLanguages';

const GITHUB_CLIENT_ID = 'cd019fec05aa5b74ad81';

const SettingScreen = (): React.ReactElement => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const contentMaxWidth = isDesktop ? 800 : '100%';
  const router = useRouter();
  const { code } = useLocalSearchParams();

  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDisclaimerVisible, setIsDisclaimerVisible] = useState(false);

  const handleConnect = () => {
    // Self-contained Auth Flow:
    // Open GitHub Authorize URL. We omit redirect_uri to let GitHub use the default registered callback,
    // which should be this Settings page (as per user instructions).
    // This avoids mismatch errors with the Worker which does not send redirect_uri during exchange.
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=identity%20public_repo`;
    if (Platform.OS === 'web') {
      window.location.href = authUrl;
    } else {
      Linking.openURL(authUrl);
    }
  };

  const handleDisconnect = async () => {
     await deleteData('github_access_token');
     setGithubToken(null);
  };

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check if we already have a token
      const token = await readData('github_access_token');
      if (token) {
        setGithubToken(token);
        // If we have a token but URL still has code, clean it up
        if (code) {
             router.setParams({ code: undefined });
        }
        return;
      }

      // 2. If no token, check if we have a code in URL to exchange
      if (code && typeof code === 'string' && !isExchanging) {
        setIsExchanging(true);
        setErrorMsg(null);
        try {
          await exchangeToken(code);
          const newToken = await readData('github_access_token');
          if (newToken) {
            setGithubToken(newToken);
          } else {
             setErrorMsg('Failed to retrieve token.');
          }
        } catch (e: any) {
          console.error(e);
          setErrorMsg(e.message || 'Failed to connect to GitHub.');
        } finally {
          setIsExchanging(false);
          // 3. Clean URL (remove ?code=...)
          router.setParams({ code: undefined });
        }
      }
    };

    checkAuth();
  }, [code]);

  // Adjust container padding based on screen size
  const containerPadding = isDesktop ? 24 : 16;
  const { locale, changeLanguage } = useLanguage();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Redirector />

      {/* Header */}
      <Surface style={[styles.headerContainer, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <View style={[styles.headerContent, { maxWidth: contentMaxWidth }]}>
          <Appbar.Header style={{ backgroundColor: 'transparent', elevation: 0 }}>
            <Appbar.Content title={i18n.t('title_setting')} />
            <Appbar.Action icon="github" color={githubToken ? theme.colors.primary : theme.colors.outline} />
          </Appbar.Header>
        </View>
      </Surface>

      <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: contentMaxWidth, padding: containerPadding }}>

          {/* Error Banner */}
          <Banner
            visible={!!errorMsg}
            actions={[
              {
                label: 'Dismiss',
                onPress: () => setErrorMsg(null),
              },
            ]}
            icon={({size}) => (
              <Avatar.Icon size={size} icon="alert-circle" style={{backgroundColor: theme.colors.errorContainer}} color={theme.colors.error} />
            )}
          >
            {errorMsg}
          </Banner>

          {/* Account Settings Section */}
          <View style={styles.sectionTitleContainer}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
              {i18n.t('setting_account')}
            </Text>
          </View>

          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            {isExchanging ? (
               <View style={styles.loadingState}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={{ marginTop: 16 }}>{i18n.t('setting_connecting')}</Text>
               </View>
            ) : githubToken ? (
              <View style={styles.connectedState}>
                <Avatar.Icon size={48} icon="check-bold" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.onPrimaryContainer} />
                <TitleSection title={i18n.t('setting_connected_title')} subtitle={i18n.t('setting_connected_desc')} />
                <Button mode="outlined" textColor={theme.colors.error} onPress={handleDisconnect}>
                  {i18n.t('setting_disconnect')}
                </Button>
              </View>
            ) : (
              <List.Item
                title={i18n.t('setting_github_oauth')}
                description={i18n.t('setting_connect_desc')}
                left={(props) => <List.Icon {...props} icon="github" color={theme.colors.onSurface} />}
                right={(props) => <Button mode="contained" compact style={{ alignSelf: 'center', marginLeft: 8 }} onPress={handleConnect}>{i18n.t('setting_connect_btn')}</Button>}
                style={{ paddingVertical: 12 }}
                titleStyle={{ fontWeight: 'bold' }}
              />
            )}
          </Surface>

          {/* Language Settings Section */}
          <View style={[styles.sectionTitleContainer, { marginTop: 24 }]}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
              {i18n.t('setting_language')}
            </Text>
          </View>
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <List.Accordion
              title={SUPPORTED_LANGUAGES.find((l) => l.code === locale)?.label || i18n.t('setting_select_language')}
              left={(props) => <List.Icon {...props} icon="translate" />}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <List.Item
                  key={lang.code}
                  title={lang.label}
                  right={(props) => (lang.code === locale ? <List.Icon {...props} icon="check" /> : null)}
                  onPress={() => changeLanguage(lang.code)}
                />
              ))}
            </List.Accordion>
          </Surface>

          {/* Disclaimer Section */}
          <View style={[styles.sectionTitleContainer, { marginTop: 24 }]}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
              {i18n.t('disclaimer_title')}
            </Text>
          </View>
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface, padding: 16 }]} elevation={1}>
             <Text variant="bodyMedium" style={{ marginBottom: 8 }}>{i18n.t('disclaimer_summary')}</Text>
             <Button mode="text" onPress={() => setIsDisclaimerVisible(true)} style={{ alignSelf: 'flex-start', marginLeft: -8 }}>
               {i18n.t('disclaimer_detail_btn')}
             </Button>
          </Surface>

          {/* App Info Section (Example) */}
          <View style={[styles.sectionTitleContainer, { marginTop: 24 }]}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
              {i18n.t('setting_about')}
            </Text>
          </View>
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <List.Item
              title={i18n.t('setting_version')}
              description="1.0.0 (Beta)"
              left={(props) => <List.Icon {...props} icon="information-outline" />}
            />
            <Divider />
            <List.Item
              title={i18n.t('setting_opensource')}
              description={i18n.t('setting_visit_repo')}
              left={(props) => <List.Icon {...props} icon="code-tags" />}
              onPress={() => Linking.openURL('https://github.com/yougikou/openroutes')}
            />
          </Surface>

        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={isDisclaimerVisible} onDismiss={() => setIsDisclaimerVisible(false)} style={{ maxHeight: '80%' }}>
          <Dialog.Title>{i18n.t('disclaimer_title')}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 0 }}>
              <Paragraph>
                {i18n.t('disclaimer_full_text')}
              </Paragraph>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setIsDisclaimerVisible(false)}>{i18n.t('confirm')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const TitleSection = ({ title, subtitle }: {title: string, subtitle: string}) => (
  <View style={{ flex: 1, marginLeft: 16 }}>
    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{title}</Text>
    <Text variant="bodyMedium" style={{ opacity: 0.7 }}>{subtitle}</Text>
  </View>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    zIndex: 1,
  },
  headerContent: {
    width: '100%',
    alignSelf: 'center',
  },
  sectionTitleContainer: {
    marginBottom: 12,
    paddingHorizontal: 4
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  connectedState: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  }
});

export default SettingScreen;
