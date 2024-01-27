import React, { useState } from 'react';
import { StyleSheet, View, Button, Platform, Share } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import toGeoJSON from '@mapbox/togeojson';
import tokml from 'geojson-to-kml';

export default function Upload() {
  const [geojsonData, setGeojsonData] = useState(null);
  const [originalFileName, setOriginalFileName] = useState(null);
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
  });

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
          setGeojsonData(convertedData);
        };
        reader.readAsText(res.assets[0].file);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const downloadFile = async (data, filename, mimeType) => {
    if (Platform.OS === 'web') {
      const blob = new Blob([data], { type: mimeType });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    } else {
      try {
        const fileUri = FileSystem.documentDirectory + filename;
        const { uri: downloadedUri } = await FileSystem.writeAsStringAsync(fileUri, data, { encoding: FileSystem.EncodingType.UTF8 });
        await Share.share({ url: downloadedUri });
      } catch (error) {
        console.error('下载文件出错:', error);
      }
    }
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
    <View style={styles.container}>
        <Button title="上传 GPX/KML 文件" onPress={pickFile} />
        <Button title="下载 GEOJSON 文件" onPress={() => handleDownload('geojson')} disabled={!geojsonData} />
        <Button title="下载 KML 文件" onPress={() => handleDownload('kml')} disabled={!geojsonData} />
    </View>
  );
};
