import React from 'react';
import { View, Text } from 'react-native';
import { Appbar, Card, Title, Paragraph, Avatar, Chip, Searchbar, Button as PaperButton, BottomNavigation } from 'react-native-paper';

export default function RouteDetailScreen() {
  return (
    <View>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => {}} />
        <Appbar.Content title="Title" />
        <Appbar.Action icon="calendar" onPress={() => {}} />
        <Appbar.Action icon="magnify" onPress={() => {}} />
      </Appbar.Header>

      <Text>Route Detail Information</Text>
    </View>
  );
}
