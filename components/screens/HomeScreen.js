import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView,Pressable } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from '@react-navigation/native';
import { Appbar, Card, Avatar, Chip, Searchbar, Button as PaperButton } from 'react-native-paper';
import i18n from '../i18n/i18n';
import { fetchIssues } from '../apis/GitHubAPI';
import Redirector from "../Redirector";

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [issues, setIssues] = useState([]);
  const page = 1;
  const filters = {
    state: 'all',
  };

  const handleSearch = () => {
  };

  const handleToDetail = () => {
  };

  const list = useRef(null);

  const renderItem = ({ item }) => {
    return (
      <Pressable onPress={() => {}}>
        <Card style={styles.card}  mode="elevated" key={item.id} elevation={2}>
          <Card.Cover source={{ uri: item.attach_files.find(file => file.type === 'img').uri }} />
          <Card.Title title={item.title} left={() => <Avatar.Image size={32} source={{ uri: item.avatar }} />} />
          <Card.Content>
            <View style={styles.row}>
              <Chip style={styles.chip} icon="map-marker-distance">{item.distance}{i18n.t('home_unit_km')}</Chip>
              <Chip style={styles.chip} icon="clock">{item.duration}</Chip>
              {item.labels.map(label => (<Chip key={label.name} style={styles.chip}>{i18n.t(label.name, { defaultValue: label.name })}</Chip>))}
            </View>
          </Card.Content>
          <Card.Actions>
            <PaperButton onPress={handleToDetail}>{ i18n.t('home_detail') }</PaperButton>
          </Card.Actions>
        </Card>
      </Pressable>
    );
  };

  useEffect(() => {
    const perPage = 10;

    const loadIssues = async () => {
      try {
        const issuesData = await fetchIssues(page, perPage, filters);
        console.log(issuesData);
        setIssues(issuesData);
      } catch (error) {
        console.error("Error fetching issues:", error);
      }
    };
  
    loadIssues();
  }, []);

  return (
    <View style={styles.container}>
      <Redirector />
      <Appbar.Header elevation={2}>
        <Appbar.Content title={ i18n.t('title_explore') } />
        <Appbar.Action icon="github" />
      </Appbar.Header>
      <View>
        <Searchbar style={styles.searchbar} mode='bar' elevation={2}
          placeholder={ i18n.t('home_search') }
          onChangeText={setSearchQuery}
          value={searchQuery}
        />
      </View>
      <ScrollView>
        <FlashList
          ref={list}
          keyExtractor={(item) => (item.id)}
          renderItem={renderItem}
          estimatedItemSize={100}
          data={issues}
        />
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
    marginTop: 10,
    marginBottom: 5,
    marginLeft: 10,
    marginRight: 10,
  },
  searchbarText: {
    fontSize: 16,
  },
  card: {
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 10,
    marginRight: 10,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  chip: {
    margin: 3
  },
});
