import React from 'react';
import { View, Text } from 'react-native';
import { Appbar, Card, Title, Paragraph, Avatar, Chip, Searchbar, Button as PaperButton, BottomNavigation } from 'react-native-paper';
import i18n from '../i18n/i18n';

export default function RouteDetailScreen() {
  return (
    <View>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => {}} />
        <Appbar.Content title={i18n.t('home_detail')} />
        <Appbar.Action icon="calendar" onPress={() => {}} />
        <Appbar.Action icon="magnify" onPress={() => {}} />
      </Appbar.Header>

      <Text>Route Detail Information</Text>
    </View>
  );
}
