import React, { useEffect, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import { View, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Appbar, List, useTheme, Surface, Text, Button, Divider, Avatar } from 'react-native-paper';
import i18n from '../i18n/i18n';
import { readData } from '../apis/StorageAPI';
import Redirector from '../Redirector';

const GITHUB_CLIENT_ID = 'cd019fec05aa5b74ad81';
const redirectUri = AuthSession.makeRedirectUri({
  path: 'openroutes/githubauth',
});

const SettingScreen = (): React.ReactElement => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const contentMaxWidth = isDesktop ? 800 : '100%';

  const [githubToken, setGithubToken] = useState<string | null>(null);

  const [, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GITHUB_CLIENT_ID,
      scopes: ['identity', 'public_repo'],
      redirectUri,
    },
    { authorizationEndpoint: 'https://github.com/login/oauth/authorize' },
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params ?? {};
      console.log('Received GitHub auth code', code);
    }
  }, [response]);

  const route = useRoute();
  useEffect(() => {
    const fetchToken = async () => {
      const token = await readData('github_access_token');
      if (token) {
        setGithubToken(token);
      }
    };
    fetchToken();
  }, [route]);

  // Adjust container padding based on screen size
  const containerPadding = isDesktop ? 24 : 16;

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

          {/* Account Settings Section */}
          <View style={styles.sectionTitleContainer}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
              {i18n.t('setting_account')}
            </Text>
          </View>

          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            {githubToken ? (
              <View style={styles.connectedState}>
                <Avatar.Icon size={48} icon="check-bold" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.onPrimaryContainer} />
                <TitleSection title="GitHub Connected" subtitle="Your account is linked and ready to sync routes." />
                <Button mode="outlined" textColor={theme.colors.error} onPress={() => { /* Logout Logic if needed */ }}>
                  Disconnect (TODO)
                </Button>
              </View>
            ) : (
              <List.Item
                title={i18n.t('setting_github_oauth')}
                description="Connect to GitHub to backup and share your routes."
                left={(props) => <List.Icon {...props} icon="github" color={theme.colors.onSurface} />}
                right={(props) => <Button mode="contained" compact style={{ alignSelf: 'center', marginLeft: 8 }} onPress={() => void promptAsync()}>Connect</Button>}
                style={{ paddingVertical: 12 }}
                titleStyle={{ fontWeight: 'bold' }}
              />
            )}
          </Surface>

          {/* App Info Section (Example) */}
          <View style={[styles.sectionTitleContainer, { marginTop: 24 }]}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
              About
            </Text>
          </View>
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <List.Item
              title="Version"
              description="1.0.0 (Beta)"
              left={(props) => <List.Icon {...props} icon="information-outline" />}
            />
            <Divider />
            <List.Item
              title="Open Source"
              description="Visit our repository"
              left={(props) => <List.Icon {...props} icon="code-tags" />}
              onPress={() => { /* Link to repo */ }}
            />
          </Surface>

        </View>
      </ScrollView>
    </View>
  );
};

const TitleSection = ({ title, subtitle }) => (
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
  }
});

export default SettingScreen;
