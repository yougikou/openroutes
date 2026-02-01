import React, { useEffect, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { StyleSheet, View, ScrollView, Alert, Platform, Pressable, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Appbar, Text, TextInput, Chip, Menu, SegmentedButtons, Button, Surface, Snackbar, ActivityIndicator, Portal, Dialog, FAB, Modal, Card, HelperText, IconButton, useTheme, Divider } from 'react-native-paper';
import toGeoJSON from '@mapbox/togeojson';
import tokml from 'geojson-to-kml';
import type { FeatureCollection } from 'geojson';
import i18n from '../i18n/i18n';
import { createIssue, uploadImgFile, uploadGeoJsonFile } from "../apis/GitHubAPI";
import { readData } from "../apis/StorageAPI";
import { extractRecordDate, calculateDistance, calculateDuration } from "../apis/GeoDataAPI";
import Redirector from "../Redirector";
import { DOMParser } from '@xmldom/xmldom';
import { downloadFile } from '../../utils/FileHelper';

// ... RouteData type definitions
type RouteData = {
  name: string | null;
  type: 'hiking' | 'walking' | 'cycling';
  difficulty: 'easy' | 'normal' | 'moderate' | 'hard';
  date: Date | null;
  distance_km: number | string | null;
  duration_hour: number | string | null;
  description: string | null;
  fileInfo: string | null;
  originFileName: string | null;
  geojsonData: FeatureCollection | null;
  coverimg: string | null;
  imgUri: string | null;
  geojson: string | null;
};

const initialRouteData: RouteData = {
  name: null,
  type: 'hiking',
  difficulty: 'easy',
  date: null,
  distance_km: null,
  duration_hour: null,
  description: null,
  fileInfo: null,
  originFileName: null,
  geojsonData: null,
  coverimg: null,
  imgUri: null,
  geojson: null,
};

export default function ShareScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const contentMaxWidth = isDesktop ? 1000 : 800; // Slightly tighter for form content

  const [routeData, setRouteData] = React.useState<RouteData>(initialRouteData);
  const [githubToken, setGithubToken] = useState<string | null>(null);

  const [isSubmitDialogVisible, setSubmitDialogVisible] = useState(false);
  const [isCheckDialogVisible, setCheckDialogVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [dashEditModalVisible, setDashEditModalVisible] = useState(false);
  const [descEditModalVisible, setDescEditModalVisible] = useState(false);


  const updateRouteData = <K extends keyof RouteData>(key: K, value: RouteData[K]) => {
    setRouteData((prevRouteData) => ({
      ...prevRouteData,
      [key]: value,
    }));
  };

  const [menuVisible, setMenuVisible] = useState(false);
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const pickFile = async (): Promise<void> => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: false,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        updateRouteData('fileInfo', null);
        return;
      }

      const [asset] = res.assets;

      if (!asset.name.endsWith('.gpx') && !asset.name.endsWith('.kml')) {
        setCheckDialogVisible(true);
        return;
      }

      const baseName = asset.name.split('.').slice(0, -1).join('.');
      updateRouteData('originFileName', baseName);
      updateRouteData('name', baseName);
      const sizeKb = asset.size ? asset.size / 1000 : 0;
      updateRouteData('fileInfo', 'File: ' + asset.name + ' Size: ' + sizeKb + ' kb');

      const handleGeoJson = (convertedData: FeatureCollection | null) => {
        if (!convertedData) {
          return;
        }
        const recordDate = extractRecordDate(convertedData);
        updateRouteData('date', recordDate ?? null);

        const distance = calculateDistance(convertedData);
        updateRouteData('distance_km', distance > 0 ? distance : null);

        const duration = calculateDuration(convertedData);
        updateRouteData('duration_hour', duration > 0 ? duration : null);

        updateRouteData('geojsonData', convertedData);
      };

      const parseFile = (fileContent: string) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(fileContent, 'text/xml');
        let convertedData: FeatureCollection | null = null;
        if (asset.name.endsWith('.gpx')) {
          convertedData = toGeoJSON.gpx(xmlDoc) as FeatureCollection;
        } else if (asset.name.endsWith('.kml')) {
          convertedData = toGeoJSON.kml(xmlDoc) as FeatureCollection;
        }
        handleGeoJson(convertedData);
      };

      if (Platform.OS === 'web' && asset.file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result;
          if (typeof result === 'string') {
            parseFile(result);
          }
        };
        reader.readAsText(asset.file);
      } else {
        // Native or URI available
        try {
          const response = await fetch(asset.uri);
          const fileContent = await response.text();
          parseFile(fileContent);
        } catch (e) {
          console.error("Failed to read file", e);
          onToggleSnackBar("Error reading file");
        }
      }

      if (githubToken === null) {
        onToggleSnackBar(i18n.t('share_file_info_warn'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Sorry, we need camera roll permission to upload images.',
      );
    } else {
      const result = await ImagePicker.launchImageLibraryAsync();
      if (!result.canceled && result.assets && result.assets.length > 0) {
        updateRouteData('imgUri', result.assets[0].uri);
      }
    }
  };

  const handleDownload = async (fileType) => {
    if (!routeData.geojsonData || !routeData.originFileName) return;

    let data;
    let mimeType;
    let fileExtension;

    switch (fileType) {
      case 'geojson':
        data = JSON.stringify(routeData.geojsonData);
        mimeType = 'application/json';
        fileExtension = 'geojson';
        break;
      case 'kml':
        data = tokml(routeData.geojsonData);
        mimeType = 'application/vnd.google-earth.kml+xml';
        fileExtension = 'kml';
        break;
      default:
        return;
    }

    const filename = `${routeData.originFileName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${fileExtension}`;
    await downloadFile(data, filename, mimeType);
  };

  const handleSubmit = async () => {
    setSubmitDialogVisible(false);
    setIsProcessing(true);
    console.log(routeData);
    try {
      if (routeData.geojsonData === null ||
        routeData.date === null ||
        routeData.name === null || routeData.name.trim().length === 0) {
        throw new Error(`Input data invalid. Geojson: ${routeData.geojsonData != null} Course date: ${routeData.date} Course name: ${routeData.name})`);
      }

      if (!githubToken) {
        throw new Error("GitHub token is missing");
      }

      const timestamp = new Date().getTime();
      const sanitizedName = (routeData.originFileName || routeData.name || 'route').replace(/[^a-z0-9]/gi, '_').toLowerCase();

      let imgURL = null;
      if (routeData.imgUri && routeData.imgUri.includes(';') && routeData.imgUri.includes(',')) {
        const parts = routeData.imgUri.split(';');
        const subparts = parts[1].split(',');
        if (parts.length === 2 && subparts.length === 2) {
          const base64Data = subparts[1];
          imgURL = await uploadImgFile(base64Data);
        }
      }

      const jsonFileName = `${sanitizedName}_${timestamp}.geojson`;
      const jsonURL = await uploadGeoJsonFile(routeData.geojsonData, githubToken, jsonFileName);

      setRouteData((prevRouteData) => ({
        ...prevRouteData,
        coverimg: imgURL,
        geojson: jsonURL,
      }));

      await createIssue({ ...routeData, coverimg: imgURL, geojson: jsonURL }, githubToken);

      onToggleSnackBar(i18n.t('share_submit_confirmed'));
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsProcessing(false);
      // reset input
      setRouteData({
        name: '',
        type: 'hiking',
        difficulty: 'easy',
        date: null,
        distance_km: null,
        duration_hour: null,
        description: '',
        fileInfo: null,
        originFileName: null,
        geojsonData: null,
        coverimg: '',
        imgUri: null,
        geojson: '',
      });
    }
  }

  const [snackbar, setSnackbar] = useState({
    isVisible: false,
    message: '',
  });

  const onToggleSnackBar = (message) => setSnackbar({
    isVisible: !snackbar.isVisible,
    message: message
  });

  const route = useRoute();
  useEffect(() => {
    const fetchToken = async () => {
      const token = await readData('github_access_token');
      if (token) {
        setGithubToken(token);
      }
    };

    fetchToken();
  }, [route]);

  // Adjust FAB position for desktop/web safety
  const fabStyle = {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0, // In safe area
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Redirector />
      {/* Responsive Header */}
      <Surface style={[styles.headerContainer, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <View style={[styles.headerContent, { maxWidth: contentMaxWidth }]}>
          <Appbar.Header style={{ backgroundColor: 'transparent', elevation: 0 }}>
            <Appbar.Content title={i18n.t('title_share')} />
            {routeData.geojsonData && (
              <Menu
                visible={menuVisible}
                onDismiss={closeMenu}
                anchor={<Appbar.Action icon="file-download-outline" onPress={openMenu} />}>
                <Menu.Item onPress={() => handleDownload('geojson')} title={i18n.t('share_download_geojsonfile')} />
                <Menu.Item onPress={() => handleDownload('kml')} title={i18n.t('share_download_kmlfile')} />
              </Menu>
            )}
            <Appbar.Action icon="github" color={githubToken ? theme.colors.primary : theme.colors.outline} />
          </Appbar.Header>
        </View>
      </Surface>

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 100 }}>
        <View style={{ width: '100%', maxWidth: contentMaxWidth, padding: 16 }}>

          {/* SECTION 1: UPLOAD */}
          <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={[styles.sectionHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>1. {i18n.t('share_upload_file') || 'Upload & Media'}</Text>
            </View>

            <View style={styles.uploadRow}>
              <Pressable onPress={pickFile} style={styles.uploadButton}>
                <View style={[styles.uploadPlaceholder, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}>
                  {routeData.fileInfo ? (
                    <View style={{ alignItems: 'center' }}>
                      <IconButton icon="file-check" size={40} iconColor={theme.colors.primary} />
                      <Text variant="bodyMedium" numberOfLines={1} style={{ fontWeight: 'bold', marginTop: 4 }}>{routeData.originFileName}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>GPX/KML Ready</Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <IconButton icon="file-upload-outline" size={40} iconColor={theme.colors.outline} />
                      <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>{i18n.t('share_upload_file')}</Text>
                    </View>
                  )}
                </View>
              </Pressable>

              <Pressable onPress={pickImage} style={styles.uploadButton}>
                <View style={[styles.uploadPlaceholder, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}>
                  {routeData.imgUri ? (
                    <Image source={{ uri: routeData.imgUri }} style={styles.previewImage} contentFit="cover" />
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <IconButton icon="image-plus" size={40} iconColor={theme.colors.outline} />
                      <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>{i18n.t('share_upload_img')}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </View>
          </Surface>


          {/* SECTION 2: STATS */}
          <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={[styles.sectionHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>2. {i18n.t('share_course_desc') || 'Details'}</Text>
                <Button mode="text" compact onPress={() => setDashEditModalVisible(true)} disabled={!routeData.geojsonData}>
                  Edit
                </Button>
              </View>
            </View>

            <View style={{ padding: 16 }}>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16 }}>
                {routeData.name || i18n.t('share_card_no_title')}
              </Text>
              <RouteDashboard date={routeData.date} distance={routeData.distance_km} duration={routeData.duration_hour} theme={theme} />
            </View>
          </Surface>

          {/* SECTION 3: CATEGORY & TITLE */}
          <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={[styles.sectionHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>3. {i18n.t('share_course_name') || 'Classification'}</Text>
            </View>
            <View style={{ padding: 16 }}>
              <Text variant="labelMedium" style={{ marginBottom: 8, color: theme.colors.secondary }}>Type</Text>
              <RouteTypeButtons routeData={routeData} updateRouteData={updateRouteData} />

              <Text variant="labelMedium" style={{ marginBottom: 8, marginTop: 16, color: theme.colors.secondary }}>Difficulty</Text>
              <RouteDifficultButtons routeData={routeData} updateRouteData={updateRouteData} />
            </View>
          </Surface>

          {/* SECTION 4: DESCRIPTION */}
          <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={[styles.sectionHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>4. {i18n.t('share_detailed_info') || 'Detailed Info'}</Text>
                <IconButton icon="pencil-outline" size={20} onPress={() => setDescEditModalVisible(true)} />
              </View>
            </View>
            <View style={{ padding: 16 }}>
              <Pressable onPress={() => setDescEditModalVisible(true)} style={{ minHeight: 80, paddingVertical: 8 }}>
                {routeData.description ? (
                  <Text variant="bodyLarge">{routeData.description}</Text>
                ) : (
                  <Text variant="bodyLarge" style={{ color: theme.colors.outline, fontStyle: 'italic' }}>{i18n.t('share_card_no_desc') || "Tap to add description..."}</Text>
                )}
              </Pressable>
            </View>
          </Surface>

        </View>
      </ScrollView>

      <ProgressCircle isProcessing={isProcessing} />

      <Snackbar visible={snackbar.isVisible} onDismiss={() => onToggleSnackBar("")}>
        {snackbar.message}
      </Snackbar>

      <DashEditModal isVisible={dashEditModalVisible} setVisible={setDashEditModalVisible} routeData={routeData} updateRouteData={updateRouteData} />
      <DescEditModal isVisible={descEditModalVisible} setVisible={setDescEditModalVisible} routeData={routeData} updateRouteData={updateRouteData} />

      {/* Responsive FAB Container */}
      {(routeData.geojsonData && githubToken && routeData.name) ? (
        <View pointerEvents="box-none" style={[styles.fabContainer, { maxWidth: contentMaxWidth }]}>
          <FAB
            icon="send"
            label={i18n.t('share_submit') || "Submit"}
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            color={theme.colors.onPrimary}
            onPress={() => setSubmitDialogVisible(true)}
          />
        </View>
      ) : null}

      <SubmitConfirmDialog isVisible={isSubmitDialogVisible} setVisible={setSubmitDialogVisible} handleSubmit={handleSubmit} />
      <CheckDialog isVisible={isCheckDialogVisible} setVisible={setCheckDialogVisible} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    zIndex: 1,
    // Web shadow hack if needed, but Surface handles elevation
  },
  headerContent: {
    width: '100%',
    alignSelf: 'center',
  },
  sectionCard: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  uploadRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  uploadButton: {
    flex: 1,
    aspectRatio: 1.5,
  },
  uploadPlaceholder: {
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    alignSelf: 'center',
    width: '100%',
    height: 100, // Touch area
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 24,
  },
  fab: {
    borderRadius: 28,
  }
});

const ProgressCircle = ({ isProcessing }) => {
  if (isProcessing) {
    return (
      <Portal>
        <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', zIndex: 1000 }}>
          <ActivityIndicator size="large" animating={true} />
        </View>
      </Portal>
    );
  }
  return (<></>);
}


const RouteTypeButtons = ({ routeData, updateRouteData }) => {
  return (
    <SegmentedButtons
      value={routeData.type}
      onValueChange={(value) => updateRouteData('type', value)}
      buttons={[
        { value: 'hiking', label: i18n.t('hiking') },
        { value: 'walking', label: i18n.t('walking') },
        { value: 'cycling', label: i18n.t('cycling') },
      ]}
    />
  );
};

const RouteDifficultButtons = ({ routeData, updateRouteData }) => {
  // Only show icons or shorter labels on small screens if needed, but standard text is usually fine
  return (
    <SegmentedButtons
      value={routeData.difficulty}
      onValueChange={(value) => updateRouteData('difficulty', value)}
      buttons={[
        { value: 'easy', label: i18n.t('easy') },
        { value: 'normal', label: i18n.t('normal') },
        { value: 'moderate', label: i18n.t('moderate') },
        { value: 'hard', label: i18n.t('hard') },
      ]}
    />
  );
};


const DescEditModal = ({ isVisible, setVisible, routeData, updateRouteData }) => {
  const styles = StyleSheet.create({
    containerStyle: {
      alignSelf: 'center',
      width: '90%',
      maxWidth: 600,
      backgroundColor: 'white',
      padding: 24,
      borderRadius: 16,
      height: '60%'
    },
  });

  return (
    <Portal>
      <Modal visible={isVisible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.containerStyle}>
        <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: 'bold' }}>{i18n.t('share_course_desc')}</Text>
        <TextInput mode="outlined"
          multiline={true}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          placeholder="Describe the route..."
          value={routeData.description}
          onChangeText={(value) => updateRouteData('description', value)} />
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
          <Button onPress={() => setVisible(false)}>Done</Button>
        </View>
      </Modal>
    </Portal>
  );
};

const DashEditModal = ({ isVisible, setVisible, routeData, updateRouteData }) => {
  const styles = StyleSheet.create({
    containerStyle: {
      alignSelf: 'center',
      width: '90%',
      maxWidth: 500,
      backgroundColor: 'white',
      padding: 24,
      borderRadius: 16
    },
    input: {
      marginBottom: 16,
    }
  });

  const onChangeNumText = (key, value) => {
    const regex = /^\d*\.?\d{0,1}$/;
    if (regex.test(value) || value === '') {
      updateRouteData(key, value);
    }
  }

  const formatDate = (date) => {
    if (date) {
      let formattedDate = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');
      return formattedDate;
    }
    return '';
  };

  const [show, setShow] = useState(false);
  const [dateStr, setDateStr] = useState(formatDate(routeData.date));

  useEffect(() => {
    setDateStr(formatDate(routeData.date));
  }, [routeData.date]);

  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate || routeData.date || new Date();
    setShow(false);
    updateRouteData('date', currentDate);
  };

  const onTextChange = (value) => {
    setDateStr(value);
    if (value != null && value.match(/^\d{4}-\d{2}-\d{2}$/) != null) {
      updateRouteData('date', new Date(value));
    }
  };

  return (
    <Portal>
      <Modal visible={isVisible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.containerStyle}>
        <Text variant="headlineSmall" style={{ marginBottom: 20, fontWeight: 'bold' }}>Edit Details</Text>

        <TextInput style={styles.input} mode="outlined"
          label={i18n.t('share_course_name')} value={routeData.name}
          onChangeText={(value) => updateRouteData('name', value)} right={<TextInput.Affix text="/50" />} />

        <Pressable onPress={() => setShow(true)}>
          <View pointerEvents="none">
            <TextInput style={styles.input} mode="outlined"
              label={i18n.t('share_record_date')} value={dateStr}
              onChangeText={(value) => onTextChange(value)}
              right={<TextInput.Icon icon="calendar" />}
            />
          </View>
        </Pressable>

        {show && (
          <DateTimePicker
            testID="dateTimePicker"
            value={routeData.date ?? new Date()}
            mode="date"
            display="default"
            onChange={onChange}
          />
        )}

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <TextInput style={styles.input} mode="outlined" keyboardType="decimal-pad"
              label={i18n.t('share_course_distance')} value={routeData.distance_km ? String(routeData.distance_km) : ''}
              onChangeText={(value) => onChangeNumText('distance_km', value)}
              right={<TextInput.Affix text="km" />}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput style={styles.input} mode="outlined" keyboardType="decimal-pad"
              label={i18n.t('share_course_duration')} value={routeData.duration_hour ? String(routeData.duration_hour) : ''}
              onChangeText={(value) => onChangeNumText('duration_hour', value)}
              right={<TextInput.Affix text="h" />}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button mode="contained" onPress={() => setVisible(false)}>Save Changes</Button>
        </View>
      </Modal>
    </Portal>
  );
};

const RouteDashboard = ({ date, distance, duration, theme }) => {
  const styles = StyleSheet.create({
    board: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 12,
      padding: 16,
    },
    item: {
      alignItems: 'center',
      flex: 1,
    },
    divider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.outlineVariant,
    },
    textStyle: {
      fontWeight: 'bold',
      fontSize: 20,
      color: theme.colors.onSurfaceVariant,
      marginTop: 4
    },
    unitStyle: {
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.7
    },
  });

  let dateDisplay = "---";
  if (date) {
    const month = String(date.getMonth() + 1);
    const day = String(date.getDate());
    dateDisplay = `${month}/${day}`;
  }

  return (
    <View style={styles.board}>
      <View style={styles.item}>
        <Text style={styles.unitStyle}>{i18n.t('share_record_date')}</Text>
        <Text style={styles.textStyle}>{dateDisplay}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={styles.unitStyle}>{i18n.t('share_course_distance')}</Text>
        <Text style={styles.textStyle}>{distance ? distance : "-"} <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>km</Text></Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={styles.unitStyle}>{i18n.t('share_course_duration')}</Text>
        <Text style={styles.textStyle}>{duration ? duration : "-"} <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>h</Text></Text>
      </View>
    </View>
  );
}

const SubmitConfirmDialog = ({ isVisible, setVisible, handleSubmit }) => {
  return (
    <Portal>
      <Dialog visible={isVisible} onDismiss={() => setVisible(false)}>
        <Dialog.Title>{i18n.t('share_submit_dialog_title')}</Dialog.Title>
        <Dialog.Content>
          <Text>{i18n.t('share_submit_dialog_message')}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setVisible(false)}>{i18n.t('cancel')}</Button>
          <Button onPress={() => handleSubmit()}>{i18n.t('confirm')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const CheckDialog = ({ isVisible, setVisible }) => {
  return (
    <Portal>
      <Dialog visible={isVisible} onDismiss={() => setVisible(false)}>
        <Dialog.Title>{i18n.t('share_filecheck_dialog_title')}</Dialog.Title>
        <Dialog.Content>
          <Text>{i18n.t('share_filecheck_dialog_message')}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setVisible(false)}>{i18n.t('confirm')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
