import React, { useState, useEffect, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import { StyleSheet, View, ScrollView,Pressable } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from '@react-navigation/native';
import { Appbar, Card, Avatar, Chip, Searchbar, Button as PaperButton } from 'react-native-paper';
import i18n from '../i18n/i18n';
import { fetchIssues } from '../apis/GitHubAPI';
import { readData } from "../apis/StorageAPI";
import Redirector from "../Redirector";

export default function HomeScreen() {
  const [githubToken, setGithubToken] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [issues, setIssues] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const filters = {
    state: 'all',
  };
  const perPage = 4;

  const handleSearch = () => {
  };

  const handleToDetail = () => {
  };

  const list = useRef(null);

  const renderItem = ({ item }) => {
    return (
      <Pressable onPress={() => {}}>
        <Card style={styles.card}  mode="elevated" key={item.id} elevation={2}>
          <Card.Cover source={{ uri: item.coverimg.uri }} />
          <Card.Title title={item.number + ")" + item.title} left={() => <Avatar.Image size={32} source={{ uri: item.avatar }} />} />
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
    const resetAndLoad = async () => {
      setCurrentPage(1);
      setIssues([]);
      await loadIssues();
    };

    resetAndLoad();
  }, []);

  const loadIssues = async () => {
    try {
      const token = await readData('github_access_token');
      console.log("github access token: " + token);
      if (token) {
        setGithubToken(token);
      }

      const issuesData = await fetchIssues(currentPage, perPage, filters, token);
      console.log(issuesData);
      if (issuesData && issuesData.length > 0) {
        setIssues(prevIssues => [...prevIssues, ...issuesData]);
        setCurrentPage(prevPage => prevPage + 1);
      }
    } catch (error) {
      console.error("Error fetching issues:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Redirector />
      <Appbar.Header elevation={2}>
        <Appbar.Content title={ i18n.t('title_explore') } />
        <Appbar.Action icon="github" color={githubToken ? "#4CAF50" : ""} />
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
          onEndReached={loadIssues}
          onEndReachedThreshold={0.1}
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
