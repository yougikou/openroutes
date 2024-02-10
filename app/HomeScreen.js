import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, Image, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Appbar, Card, Title, Paragraph, Avatar, Chip, Searchbar, Button as PaperButton, BottomNavigation } from 'react-native-paper';

const data = [
  {
    id: 1,
    name: '登山线路一',
    description: '这是一条难度较高的登山线路，适合经验丰富的登山爱好者。',
    image: 'https://picsum.photos/200/300',
    difficulty: '困难',
    distance: '10公里',
    duration: '5小时',
  },
  {
    id: 2,
    name: '骑行线路二',
    description: '这是一条风景优美的骑行线路，适合喜欢骑行观光的爱好者。',
    image: 'https://picsum.photos/200/300',
    difficulty: '中等',
    distance: '20公里',
    duration: '3小时',
  },
  {
    id: 3,
    name: '远足线路三',
    description: '这是一条轻松的远足线路，适合家庭出游。',
    image: 'https://picsum.photos/200/300',
    difficulty: '简单',
    distance: '5公里',
    duration: '2小时',
  },
];

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation();

  const handleSearch = () => {
    // 搜索逻辑
  };

  const handleToDetail = () => {
    navigation.navigate('Detail');
  };

  const handleToShare = () => {
    navigation.navigate('Share');
  };

  const handleToSettings = () => {
    navigation.navigate('Settings');
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Explore Routes" />
        <Appbar.Action icon="calendar" onPress={() => {}} />
        <Appbar.Action icon="magnify" onPress={() => {}} />
      </Appbar.Header>
      <View>
        <Searchbar style={styles.searchbar}
          placeholder="Search"
          onChangeText={setSearchQuery}
          value={searchQuery}
        />
      </View>
      <ScrollView>
        {
          // 线路卡片列表
          data.map(item => (
            <Card style={styles.card}  mode="elevated" key={item.id}>
              <Card.Cover source={{ uri: item.image }} />
              <Card.Title title={item.name} left={() => <Avatar.Image size={32} source={{ uri: item.avatar }} />} />
              <Card.Content>
                <Paragraph>{item.description}</Paragraph>
                <Chip style={styles.chip} icon="map-marker">距离：{item.distance}</Chip>
                <Chip style={styles.chip} icon="clock">时长：{item.duration}</Chip>
              </Card.Content>
              <Card.Actions>
                <PaperButton onPress={handleToDetail}>详细</PaperButton>
              </Card.Actions>
            </Card>
          ))
        }
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 100,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 20,
  },
  searchbar: {
    margin: 10,
  },
  searchbarText: {
    fontSize: 16,
  },
  card: {
    margin: 4
  },
  chip: {
    margin: 3
  },
});
