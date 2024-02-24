import React, { useEffect, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from "expo-image-picker";
import { Appbar, TextInput, Chip, Menu, SegmentedButtons, Button, Surface, Snackbar, ActivityIndicator } from 'react-native-paper';
import toGeoJSON from '@mapbox/togeojson';
import tokml from 'geojson-to-kml';
import i18n from '../i18n/i18n';
import { createIssue, uploadImgFile, uploadGeoJsonFile } from "../apis/GitHubAPI";
import { readData } from "../apis/StorageAPI";
import Redirector from "../Redirector";

export default function ShareScreen() {
  const [geojsonData, setGeojsonData] = useState(null);
  const [originalFileName, setOriginalFileName] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [imgUri, setImgUri] = useState(null);
  const [githubToken, setGithubToken] = useState(null);
  const [routeData, setRouteData] = React.useState({
    name: '',
    type: 'hiking',
    date: '',
    description: '',
    coverimg: '',
    geojson: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const updateRouteData = (key, value) => {
    setRouteData((prevRouteData) => ({
      ...prevRouteData,
      [key]: value,
    }));
  };

  const [menuVisible, setMenuVisible] = React.useState(false);
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: false,
      });

      if (res.assets && res.assets.length > 0) {
        const fileUri = res.assets[0].uri;
        const fileName = res.assets[0].name;
        setOriginalFileName(fileName.split('.').slice(0, -1).join('.'));
        setFileInfo(`File: ${res.assets[0].name} Size: ${res.assets[0].size/1000} kb`);

        const reader = new FileReader();
        reader.onload = (e) => {
          const fileContent = e.target.result;
          const xmlDoc = new DOMParser().parseFromString(fileContent, 'text/xml');
          let convertedData;
          if (fileName.endsWith('.gpx')) {
            convertedData = toGeoJSON.gpx(xmlDoc);
          } else if (fileName.endsWith('.kml')) {
            convertedData = toGeoJSON.kml(xmlDoc);
          }
          const match = /\d{4}-\d{2}-\d{2}/.exec(JSON.stringify(convertedData));
          if (match != null && match.length > 0) {
            updateRouteData('date', match[0]);
          }
          setGeojsonData(convertedData);
        };
        reader.readAsText(res.assets[0].file);
      } else {
        setFileInfo('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pickImage = async () => { 
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync(); 

    if (status !== "granted") { 
        Alert.alert( 
            "Permission Denied", 
            `Sorry, we need camera  
             roll permission to upload images.` 
        ); 
    } else { 
        const result = await ImagePicker.launchImageLibraryAsync(); 
        if (!result.cancelled) { 
          setImgUri(result.assets[0].uri);
        } 
    } 
  }; 

  const downloadFile = async (data, filename, mimeType) => {
    const blob = new Blob([data], { type: mimeType });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const handleDownload = (fileType) => {
    if (!geojsonData || !originalFileName) return;

    let data;
    let mimeType;
    let fileExtension;

    switch(fileType) {
      case 'geojson':
        data = JSON.stringify(geojsonData);
        mimeType = 'application/json';
        fileExtension = 'geojson';
        break;
      case 'kml':
        data = tokml(geojsonData);
        mimeType = 'application/vnd.google-earth.kml+xml';
        fileExtension = 'kml';
        break;
      default:
        return;
    }

    const filename = `${originalFileName}.${fileExtension}`;
    downloadFile(data, filename, mimeType);
  };

  const handleSubmit = async (imgDataUri, jsonData) => {
    setIsProcessing(true);
    try {
      if (jsonData === null || 
        routeData.date.trim().length === 0 ||
        routeData.name.trim().length === 0 ) {
        throw new Error(`Input data invalid. Geojson: ${jsonData != null} Course date: ${routeData.date} Course name: ${routeData.name})`);
      }

      if (process.env.NODE_ENV === 'production') {
        let imgURL = null;
        if (imgDataUri && imgDataUri.includes(';') && imgDataUri.includes(',')) {
            const parts = imgDataUri.split(';');
            const subparts = parts[1].split(',');
            if (parts.length === 2 && subparts.length === 2) {
                const base64Data = subparts[1];
                imgURL = await uploadImgFile(base64Data);
            }
        }

        const jsonURL = await uploadGeoJsonFile(jsonData);
        setRouteData((prevRouteData) => ({
          ...prevRouteData,
          coverimg: imgURL,
          geojson: jsonURL,
        }));

        await createIssue({ ...routeData, coverimg: imgURL, geojson: jsonURL }, githubToken)
      } else {
        console.log("In development: sleep 5s")
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      onToggleSnackBar();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsProcessing(false);
      // reset input
      setRouteData({
        name: '',
        type: 'hiking',
        date: '',
        description: '',
        coverimg: '',
        geojson: '',
      });
      setGeojsonData(null);
      setOriginalFileName(null);
      setFileInfo(null);
      setImgUri(null);
    }
  }

  const [snackbarVisible, setSnackbarVisible] = React.useState(false);
  const onToggleSnackBar = () => setSnackbarVisible(!snackbarVisible);

  const route = useRoute();
  useEffect(() => {
    const fetchToken = async () => {
      const token = await readData('github_access_token');
      console.log("github access token: " + token);
      if (token) {
        setGithubToken(token);
      }
    };

    fetchToken();
  }, [route]);

  return (
    <View style={styles.container}>
      <Redirector />
      <Appbar.Header elevation={2}>
        <Appbar.Content title={i18n.t('title_share')} />
        <Appbar.Action icon="github" color={githubToken ? "#4CAF50" : ""} />
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={<Appbar.Action icon="menu" onPress={openMenu} />}>
          <Menu.Item onPress={() => handleDownload('geojson')} title={i18n.t('share_download_geojsonfile')} disabled={!geojsonData} />
          <Menu.Item onPress={() => handleDownload('kml')} title={i18n.t('share_download_kmlfile')} disabled={!geojsonData} />
        </Menu>
      </Appbar.Header>
      <ScrollView>
        {isProcessing && <ActivityIndicator style={styles.activityIndicator} size="large" animating={true} color="#0000ff" />}
        <Button style={styles.fileButton} icon="routes" mode="elevated" onPress={pickFile} disabled={isProcessing}>
          {i18n.t('share_upload_file')}
        </Button>
        { fileInfo? (<Chip style={styles.inputWidget} icon="file" compact="true">
          {fileInfo}
          { (geojsonData && !githubToken) && 
            <><br/>You can only covert file with menu.
              <br/>Github Token is required for creating.
              <br/>Go to setting to authrize with your github account first.</>
          }
        </Chip>): <></>}        
        <TextInput style={styles.inputWidget} mode="outlined" disabled={isProcessing}
          label={i18n.t('share_record_date')} value={routeData.date} 
          onChangeText={(value) => updateRouteData('date', value)} />
        <TextInput style={styles.inputWidget} mode="outlined" disabled={isProcessing}
          label={i18n.t('share_course_name')} value={routeData.name}
          onChangeText={(value) => updateRouteData('name', value)} right={<TextInput.Affix text="/50" />} />
        <SegmentedButtons style={styles.inputWidget}
          value={routeData.type}
          onValueChange={(value) => updateRouteData('type', value)}
          buttons={[
            { value: 'hiking', label: i18n.t('hiking'), disabled: isProcessing},
            { value: 'walking', label: i18n.t('walking'), disabled: isProcessing},
            { value: 'cycling', label: i18n.t('cycling'), disabled: isProcessing},
          ]}
        />
        <View style={styles.inputWidget}> 
          <Surface style={styles.surface} elevation={1}>
            <View style={styles.image}> 
              {imgUri ? ( 
                <Image style={styles.image} source={{ uri: imgUri }} /> 
              ) : (<></>)} 
              <Button style={styles.imageButton} icon="camera" onPress={pickImage} disabled={isProcessing}>{i18n.t('share_upload_img')}</Button>
            </View> 
          </Surface>
        </View>
        <View style={styles.inputWidget}>
          <TextInput style={styles.textArea} mode="outlined" disabled={isProcessing}
            label={i18n.t('share_course_desc')} value={routeData.description}
            onChangeText={(value) => updateRouteData('description', value)} multiline />
        </View>
        <Button style={styles.submitButton} icon="routes" mode="elevated"
          onPress={() => handleSubmit(imgUri, geojsonData)} disabled={!geojsonData || !githubToken || !routeData.date || !routeData.name || isProcessing}>
          {i18n.t('share_submit')}
        </Button>
      </ScrollView>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={onToggleSnackBar}>
        { "Route info is submitted. Thank you for sharing. \nYou can view it in exploring screen now. "}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    lineHeight: 200,
    backgroundColor: '#fff',
  },
  header: {
    height: 100,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWidget: {
    marginTop: 3,
    marginBottom: 3,
    marginLeft: 10,
    marginRight: 10,
  },
  textArea: {
    height: 200
  },
  image: { 
    width: 100, 
    height: 100
  },
  fileButton: {
    marginTop: 10,
    marginBottom: 3,
    marginLeft: 10,
    marginRight: 10,
  },
  submitButton: {
    marginTop: 3,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
  },
  imageButton: { 
    width: 100, 
    height: 100, 
    borderRadius: 10,
    position: 'absolute',
    top: 30,
  },
  errorText: { 
    color: "red", 
    marginTop: 16, 
  }, 
  surface: {
    padding: 8,
    height: 100,
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    margin:3
  },
  activityIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});