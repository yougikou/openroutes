import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Appbar,
  Button,
  Dialog,
  HelperText,
  List,
  Portal,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import i18n from '../i18n/i18n';
import { fetchAuthenticatedUser } from '../apis/GitHubAPI';
import Redirector from '../Redirector';
import { useGithubAuth } from '../contexts/GithubAuthContext';

export default function SettingScreen() {
  const {
    user,
    token,
    isAuthenticated,
    shouldPersistToken,
    hasLoaded,
    signIn,
    signOut,
    setPersistencePreference,
  } = useGithubAuth();

  const [rememberSelection, setRememberSelection] = useState(shouldPersistToken);
  const [isTokenDialogVisible, setTokenDialogVisible] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState(null);
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);

  useEffect(() => {
    setRememberSelection(shouldPersistToken);
  }, [shouldPersistToken]);

  const handleRememberToggle = async () => {
    const nextValue = !rememberSelection;
    setRememberSelection(nextValue);
    await setPersistencePreference(nextValue);
  };

  const openTokenDialog = () => {
    if (isSubmittingToken) {
      return;
    }
    setTokenInput('');
    setTokenError(null);
    setTokenDialogVisible(true);
  };

  const closeTokenDialog = () => {
    if (isSubmittingToken) {
      return;
    }
    setTokenDialogVisible(false);
  };

  const handleTokenSubmit = useCallback(async () => {
    const trimmedToken = tokenInput.trim();
    if (!trimmedToken) {
      setTokenError(i18n.t('setting_github_token_error_empty'));
      return;
    }

    setIsSubmittingToken(true);
    setTokenError(null);
    try {
      const profile = await fetchAuthenticatedUser(trimmedToken);
      await signIn({
        token: trimmedToken,
        user: profile,
        rememberToken: rememberSelection,
      });
      setTokenDialogVisible(false);
      setTokenInput('');
    } catch (error) {
      console.error('Failed to verify GitHub token:', error);
      setTokenError(i18n.t('setting_github_token_error_invalid'));
    } finally {
      setIsSubmittingToken(false);
    }
  }, [tokenInput, signIn, rememberSelection]);

  const handleSignOut = async () => {
    await signOut();
  };

  const githubStatusDescription = isAuthenticated
    ? i18n.t('setting_github_status_signed_in', { login: user?.login ?? 'unknown', id: user?.id ?? '-' })
    : i18n.t('setting_github_status_signed_out');

  const routeUsageDescription = isAuthenticated
    ? i18n.t('setting_github_usage_authenticated', { login: user?.login ?? 'unknown', id: user?.id ?? '-' })
    : i18n.t('setting_github_usage_signed_out');

  const tokenStorageDescription = token
    ? i18n.t('setting_github_access_token_desc_signed_in', { login: user?.login ?? 'unknown' })
    : i18n.t('setting_github_access_token_desc_signed_out');

  return (
    <View style={styles.container}>
      <Redirector />
      <Appbar.Header elevation={2}>
        <Appbar.Content title={i18n.t('title_setting')} />
        <Appbar.Action icon="github" color={isAuthenticated ? '#4CAF50' : '#000000'} />
      </Appbar.Header>
      <List.Section>
        <List.Subheader>{i18n.t('setting_account')}</List.Subheader>
        <List.Item
          left={(props) => <List.Icon {...props} icon="github" />}
          title={i18n.t('setting_github_token_action_title')}
          description={i18n.t('setting_github_token_action_desc')}
          descriptionNumberOfLines={3}
          onPress={openTokenDialog}
        />
        <List.Item
          left={(props) => <List.Icon {...props} icon="information" />}
          title={i18n.t('setting_github_token_status_title')}
          description={githubStatusDescription}
          descriptionNumberOfLines={3}
        />
        <List.Item
          left={(props) => <List.Icon {...props} icon="map-search" />}
          title={i18n.t('setting_github_usage_title')}
          description={routeUsageDescription}
          descriptionNumberOfLines={3}
        />
        <List.Item
          left={(props) => <List.Icon {...props} icon="key-variant" />}
          title={i18n.t('setting_github_access_token_title')}
          description={tokenStorageDescription}
          descriptionNumberOfLines={3}
        />
        <List.Item
          left={(props) => <List.Icon {...props} icon="content-save" />}
          title={i18n.t('setting_github_remember_token')}
          description={i18n.t('setting_github_remember_token_desc')}
          right={() => (
            <Switch
              value={rememberSelection}
              onValueChange={handleRememberToggle}
              disabled={!hasLoaded}
            />
          )}
        />
        <List.Item
          left={(props) => <List.Icon {...props} icon="logout" />}
          title={i18n.t('setting_github_sign_out')}
          onPress={handleSignOut}
          disabled={!hasLoaded || !isAuthenticated}
        />
      </List.Section>

      <Portal>
        <Dialog visible={isTokenDialogVisible} onDismiss={closeTokenDialog}>
          <Dialog.Title>{i18n.t('setting_github_token_dialog_title')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogDescription}>
              {i18n.t('setting_github_token_dialog_desc')}
            </Text>
            <TextInput
              mode="outlined"
              secureTextEntry
              label={i18n.t('setting_github_token_dialog_input_label')}
              value={tokenInput}
              onChangeText={setTokenInput}
              autoCapitalize="none"
              autoCorrect={false}
              disabled={isSubmittingToken}
            />
            <HelperText type="info">
              {i18n.t('setting_github_token_dialog_input_helper')}
            </HelperText>
            {tokenError && (
              <HelperText type="error">
                {tokenError}
              </HelperText>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeTokenDialog} disabled={isSubmittingToken}>
              {i18n.t('setting_github_token_dialog_cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleTokenSubmit}
              loading={isSubmittingToken}
              disabled={isSubmittingToken}
            >
              {i18n.t('setting_github_token_dialog_submit')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  dialogDescription: {
    marginBottom: 12,
  },
});
