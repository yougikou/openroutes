import React, { useState } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import toGeoJSON from '@mapbox/togeojson';
import tokml from 'geojson-to-kml';
import i18n from '../components/i18n/i18n';

export default function Upload() {
  const [geojsonData, setGeojsonData] = useState(null);
  const [originalFileName, setOriginalFileName] = useState(null);
  const [fileInfo, setFileInfo] = useState('');
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    fileInfo: {
      margin: 10,
      fontSize: 16,
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
        setFileInfo(`文件名: ${res.assets[0].name}\n大小: ${res.assets[0].size} bytes`);

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
    <View style={styles.container}>
        <Button title={ i18n.t('upload_upload_file') } onPress={pickFile} />
        <Text style={styles.fileInfo}>{fileInfo}</Text>
        <Button title={ i18n.t('upload_download_geojsonfile') }  onPress={() => handleDownload('geojson')} disabled={!geojsonData} />
        <Button title={ i18n.t('upload_download_kmlfile') }  onPress={() => handleDownload('kml')} disabled={!geojsonData} />
    </View>
  );
};
