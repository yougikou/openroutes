import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Appbar, TextInput, Chip, Menu, Text, SegmentedButtons, Button, PaperProvider } from 'react-native-paper';
import toGeoJSON from '@mapbox/togeojson';
import tokml from 'geojson-to-kml';
import i18n from '../components/i18n/i18n';

export default function ShareScreen() {
  const [geojsonData, setGeojsonData] = useState(null);
  const [originalFileName, setOriginalFileName] = useState(null);
  const [fileInfo, setFileInfo] = useState('');

  const [routeType, setRouteType] = React.useState('hiking');
  const [routeDate, setRouteDate] = React.useState('');
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
            setRouteDate(match[0]);
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

  return (
    <PaperProvider>
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.Content title={ i18n.t('title_share') } />
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={<Appbar.Action icon="menu" onPress={openMenu} />}>
            <Menu.Item onPress={() => handleDownload('geojson')} title={ i18n.t('share_download_geojsonfile') } disabled={!geojsonData} />
            <Menu.Item onPress={() => handleDownload('kml')} title={ i18n.t('share_download_kmlfile') } disabled={!geojsonData} />
          </Menu>
        </Appbar.Header>
        <View>
          <Button style={styles.inputWidget} icon="routes" mode="elevated" onPress={pickFile}>
            { i18n.t('share_upload_file') }
          </Button>
          <Chip style={styles.inputWidget} icon="file" compact="true">{ fileInfo }</Chip>
          <TextInput style={styles.inputWidget} mode="outlined" label="Record Date" value={routeDate} editable={routeDate.length === 0}/>
          <TextInput style={styles.inputWidget} mode="outlined" label="Course Name" right={<TextInput.Affix text="/50" />} />
          <View style={styles.inputWidget}>
            <TextInput style={styles.textArea} mode="outlined" label="Course Description" multiline />
          </View>
          <SegmentedButtons style={styles.inputWidget}
              value={routeType}
              onValueChange={setRouteType}
              buttons={[
                { value: 'hiking', label: 'Hiking'},
                { value: 'walking', label: 'Walking'},
                { value: 'cycling', label: 'Cycling'},
              ]}
            />
        </View>
      </View>
    </PaperProvider>
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
    margin: '3px'
  },
  textArea: {
    height: 300
  },
});