import React, { useEffect, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { StyleSheet, View, ScrollView, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Appbar, Text, TextInput, Chip, Menu, SegmentedButtons, Button, Surface, Snackbar, ActivityIndicator, Portal, Dialog, FAB, Modal, Card, HelperText, IconButton } from 'react-native-paper';
import toGeoJSON from '@mapbox/togeojson';
import tokml from 'geojson-to-kml';
import type { FeatureCollection } from 'geojson';
import i18n from '../i18n/i18n';
import { createIssue, uploadImgFile, uploadGeoJsonFile } from "../apis/GitHubAPI";
import { readData } from "../apis/StorageAPI";
import { extractRecordDate, calculateDistance, calculateDuration } from "../apis/GeoDataAPI";
import Redirector from "../Redirector";

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

interface SnackbarState {
  isVisible: boolean;
  message: string;
}

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
        if (typeof DOMParser === 'undefined') {
          console.warn('DOMParser is not available on this platform.');
          return;
        }
        const xmlDoc = new DOMParser().parseFromString(fileContent, 'text/xml');
        let convertedData: FeatureCollection | null = null;
        if (asset.name.endsWith('.gpx')) {
          convertedData = toGeoJSON.gpx(xmlDoc) as FeatureCollection;
        } else if (asset.name.endsWith('.kml')) {
          convertedData = toGeoJSON.kml(xmlDoc) as FeatureCollection;
        }
        handleGeoJson(convertedData);
      };

      if (asset.file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result;
          if (typeof result === 'string') {
            parseFile(result);
          }
        };
        reader.readAsText(asset.file);
      } else {
        const response = await fetch(asset.uri);
        const fileContent = await response.text();
        parseFile(fileContent);
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

  const downloadFile = async (data, filename, mimeType) => {
    if (typeof document === 'undefined') {
      console.warn('File download is only supported on web.');
      return;
    }
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
    if (!routeData.geojsonData || !routeData.originFileName) return;

    let data;
    let mimeType;
    let fileExtension;

    switch(fileType) {
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

    const filename = `${routeData.originFileName}.${fileExtension}`;
    downloadFile(data, filename, mimeType);
  };

  const handleSubmit = async () => {
    setSubmitDialogVisible(false);
    setIsProcessing(true);
    console.log(routeData);
    try {
      if (routeData.geojsonData === null || 
        routeData.date === null ||
        routeData.name === null || routeData.name.trim().length === 0 ) {
        throw new Error(`Input data invalid. Geojson: ${routeData.geojsonData != null} Course date: ${routeData.date} Course name: ${routeData.name})`);
      }

      if (process.env.NODE_ENV === 'production') {
        let imgURL = null;
        if (routeData.imgUri && routeData.imgUri.includes(';') && routeData.imgUri.includes(',')) {
            const parts = routeData.imgUri.split(';');
            const subparts = parts[1].split(',');
            if (parts.length === 2 && subparts.length === 2) {
                const base64Data = subparts[1];
                imgURL = await uploadImgFile(base64Data);
            }
        }

        const jsonURL = await uploadGeoJsonFile(routeData.geojsonData);
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

  return (
    <View style={{flex: 1, backgroundColor: '#fff'}}>
      <Redirector />
      <Appbar.Header>
        <Appbar.Content title={i18n.t('title_share')} />
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={<Appbar.Action icon="file-marker" color={routeData.geojsonData ? "#4CAF50" : ""} onPress={openMenu} />}>
          <Menu.Item onPress={() => handleDownload('geojson')} title={i18n.t('share_download_geojsonfile')} disabled={!routeData.geojsonData} />
          <Menu.Item onPress={() => handleDownload('kml')} title={i18n.t('share_download_kmlfile')} disabled={!routeData.geojsonData} />
        </Menu>
        <Appbar.Action icon="github" color={githubToken ? "#4CAF50" : ""} />
      </Appbar.Header>
      <ScrollView>
        <RouteDashboard date={routeData.date} distance={routeData.distance_km} duration={routeData.duration_hour}/>
        <RouteTypeButtons routeData={routeData} updateRouteData={updateRouteData} />
        <RouteDifficultButtons routeData={routeData} updateRouteData={updateRouteData} />
        <FileInfoBar routeData={routeData} />
        <View style={{flexDirection: 'row', marginHorizontal: 10, marginVertical: 3}}>
          <ImageSelector routeData={routeData} pickImage={pickImage} /> 
          <CourseCard routeData={routeData} githubToken={githubToken} setDashEditModalVisible={setDashEditModalVisible} setDescEditModalVisible={setDescEditModalVisible} />
        </View>
        <ProgressCircle isProcessing={isProcessing} />
        <p/><p/><p/>
      </ScrollView>
      <Snackbar visible={snackbar.isVisible} onDismiss={() => onToggleSnackBar("")}>
        {snackbar.message}
      </Snackbar>
      <DashEditModal isVisible={dashEditModalVisible} setVisible={setDashEditModalVisible} routeData={routeData} updateRouteData={updateRouteData}/>
      <DescEditModal isVisible={descEditModalVisible} setVisible={setDescEditModalVisible} routeData={routeData} updateRouteData={updateRouteData}/>
      <FABButtons routeData={routeData} githubToken={githubToken} pickFile={pickFile}
        setDashEditModalVisible={setDashEditModalVisible} 
        setDescEditModalVisible={setDescEditModalVisible}
        setSubmitDialogVisible={setSubmitDialogVisible}/>
      <SubmitConfirmDialog isVisible={isSubmitDialogVisible} setVisible={setSubmitDialogVisible} handleSubmit={handleSubmit}/>
      <CheckDialog isVisible={isCheckDialogVisible} setVisible={setCheckDialogVisible}/>
    </View>
  );
};

const ProgressCircle = ({isProcessing}) => {
  const styles = StyleSheet.create({
    loadingContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      zIndex: 1000,
    },
  });

  if (isProcessing) {
    return (
      <Portal>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" animating={true} color="#0000ff" />
        </View>
      </Portal>
    );
  }
  return (<></>);
}

const FileInfoBar = ({routeData}) => {
  if (routeData.fileInfo) {
    return (
      <Chip style={{flex: 1, marginHorizontal: 10, marginVertical: 3}} icon="file" compact>
        {routeData.fileInfo}
      </Chip>
    );
  } 
  return (<></>);
}

const CourseCard = ({routeData, githubToken, setDashEditModalVisible, setDescEditModalVisible}) => {
  return(
    <Card style={{flex: 1, marginLeft: 10, marginVertical: 3}}>
      <Card.Title title={routeData.name? routeData.name : i18n.t('share_card_no_title')} 
        right={(props) => (routeData.geojsonData && githubToken) && <IconButton {...props} icon="view-dashboard-edit" onPress={() => setDashEditModalVisible(true)} />}/>
      <Card.Content>
        <Text variant="bodyMedium">{routeData.description? routeData.description : i18n.t('share_card_no_desc')}</Text>
      </Card.Content>
      <Card.Actions>
        {(routeData.geojsonData && githubToken) && <IconButton icon="playlist-edit" onPress={() => setDescEditModalVisible(true)} />}
      </Card.Actions>      
    </Card>
  );
}

const RouteTypeButtons = ({routeData, updateRouteData}) => {
  return (
    <SegmentedButtons style={{marginHorizontal: 10, marginVertical: 3}}
      value={routeData.type}
      onValueChange={(value) => updateRouteData('type', value)}
      buttons={[
        { value: 'hiking', label: i18n.t('hiking')},
        { value: 'walking', label: i18n.t('walking')},
        { value: 'cycling', label: i18n.t('cycling')},
      ]}
    />
  );
};

const RouteDifficultButtons = ({routeData, updateRouteData}) => {
  return (
    <SegmentedButtons style={{marginHorizontal: 10, marginVertical: 3}}
      value={routeData.difficulty}
      onValueChange={(value) => updateRouteData('difficulty', value)}
      buttons={[
        { value: 'easy', label: i18n.t('easy')},
        { value: 'normal', label: i18n.t('normal')},
        { value: 'moderate', label: i18n.t('moderate')},
        { value: 'hard', label: i18n.t('hard')},
      ]}
    />
  );
};

const ImageSelector = ({routeData, pickImage}) => {
  const styles = StyleSheet.create({
    image: { 
      width: 100, 
      height: 100
    },
    imageButton: { 
      width: 100, 
      height: 100, 
      borderRadius: 10,
      position: 'absolute',
      top: 30,
    },
    imageSurface: {
      padding: 8,
      height: 100,
      width: 100,
      alignItems: 'center',
      justifyContent: 'center',
      margin:3
    },
  });

  return (
    <Surface style={styles.imageSurface} elevation={1}>
      <View style={styles.image}> 
        {routeData.imgUri ? ( 
          <Image style={styles.image} source={{ uri: routeData.imgUri }} /> 
        ) : (<></>)} 
        <Button style={styles.imageButton} icon="camera" onPress={pickImage}>{i18n.t('share_upload_img')}</Button>
      </View> 
    </Surface>
  );
};

const FABButtons = ({routeData, githubToken, pickFile, setDashEditModalVisible, setDescEditModalVisible, setSubmitDialogVisible}) => {
  const [state, setState] = React.useState({ open: false });
  const onStateChange = ({ open }) => setState({ open });
  const { open } = state;

  const [buttons, setButtons] = useState([]);
  useEffect(() => {
    if (githubToken) {
      if (routeData.geojsonData) {
        if(routeData.date && routeData.distance_km && routeData.duration_hour && routeData.name && routeData.name.length > 0) {
          setButtons([
            {
              icon: 'view-dashboard-edit',
              // label: i18n.t('share_fab_edit_dashinfo'),
              onPress: () => setDashEditModalVisible(true),
            },
            {
              icon: 'playlist-edit',
              // label: i18n.t('share_fab_edit_desc'),
              onPress: () => setDescEditModalVisible(true),
            },
            {
              icon: 'send',
              // label: i18n.t('share_submit'),
              onPress: () => setSubmitDialogVisible(true),
            },
            {
              icon: 'file-upload',
              // label: i18n.t('share_upload_file'),
              onPress: () => pickFile(),
            },
          ]);
        } else {
          setButtons([
            {
              icon: 'view-dashboard-edit',
              onPress: () => setDashEditModalVisible(true),
            },
            {
              icon: 'playlist-edit',
              onPress: () => setDescEditModalVisible(true),
            },
            {
              icon: 'file-upload',
              onPress: () => pickFile(),
            },
          ]);
        }
      } else {
        setButtons([
          {
            icon: 'file-upload',
            onPress: () => pickFile(),
          },
        ]);
      }
    } else {
      setButtons([
        {
          icon: 'file-upload',
          onPress: () => pickFile(),
        },
      ]);
    }
  }, [routeData]);

  return (
    <Portal>
      <FAB.Group
        open={open}
        visible
        style={{ position: 'absolute', bottom: 50 }}
        icon={open ? 'minus' : 'plus'}
        actions={buttons}
        onStateChange={onStateChange}
        onPress={() => {
          if (open) {
            // do something if the speed dial is open
          }
        }}
      />
    </Portal>
  );
};

const DescEditModal = ({isVisible, setVisible, routeData, updateRouteData}) => {
  const styles = StyleSheet.create({
    textArea: {
      flex: 1,
    },
    containerStyle: {
      marginHorizontal: 24,
      backgroundColor: 'white', 
      padding: 20,
      height: "80%"
    },
    viewContainer: {
      flex: 1,
    }
  });

  return (
    <Portal>
      <Modal visible={isVisible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.containerStyle}>
        <View style={styles.viewContainer}>
            <TextInput mode="outlined"
              multiline={true} 
              numberOfLines={40}
              style={styles.textArea}
              label={i18n.t('share_course_desc')} value={routeData.description}
              onChangeText={(value) => updateRouteData('description', value)} />
        </View>
      </Modal>
    </Portal>
  );
};

const DashEditModal = ({isVisible, setVisible, routeData, updateRouteData}) => {
  const styles = StyleSheet.create({
    containerStyle: {
      backgroundColor: 'white', 
      padding: 20, 
      marginHorizontal: 24
    },
    input: {
      marginTop: 3,
      marginBottom: 3,
      marginLeft: 10,
      marginRight: 10,
    }
  });

  const onChangeNumText=(key, value) => {
    const regex = /^\d*\.?\d{0,1}$/;
    if (regex.test(value) || value === '') {
      updateRouteData(key, value);
    }
  }

  const formatDate = (date) => {
    if(date) {
      let formattedDate = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');
      return formattedDate;
    }
  };

  const [show, setShow] = useState(false);
  const [dateStr, setDateStr] = useState(formatDate(routeData.date));

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

  const hasDateErrors = () => {
    return dateStr != null && dateStr.match(/^\d{4}-\d{2}-\d{2}$/) === null;
  };

  return (
    <Portal>
      <Modal visible={isVisible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.containerStyle}>
        <TextInput style={styles.input} mode="outlined"
          label={i18n.t('share_course_name')} value={routeData.name}
          onChangeText={(value) => updateRouteData('name', value)} right={<TextInput.Affix text="/50" />} />
        <TextInput style={styles.input} mode="outlined"
          label={i18n.t('share_record_date')} value={dateStr} 
          onChangeText={(value) => onTextChange(value)}
          onFocus={() => setShow(true)}
          showSoftInputOnFocus={false} />
        <HelperText type="error" visible={hasDateErrors()}>
          Date is invalid!
        </HelperText>
        {show && (
          <DateTimePicker
            testID="dateTimePicker"
            value={routeData.date ?? new Date()}
            mode="date"
            display="default"
            onChange={onChange}
          />
        )}
        <TextInput style={styles.input} mode="outlined" keyboardType="decimal-pad"
          label={i18n.t('share_course_distance')} value={routeData.distance_km}
          onChangeText={(value) => onChangeNumText('distance_km', value)} />
        <TextInput style={styles.input} mode="outlined" keyboardType="decimal-pad"
          label={i18n.t('share_course_duration')} value={routeData.duration_hour}
          onChangeText={(value) => onChangeNumText('duration_hour', value)} />
      </Modal>
    </Portal>
  );
};

const RouteDashboard = ({date, distance, duration}) => {
  const styles = StyleSheet.create({
    board: {
      marginLeft: 10,
      marginRight: 10,
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: 10},
    surface: {
      backgroundColor: '#fff',
      padding: 8,
      height: 100,
      width: 100,
      marginHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    divider: {
      height: '100%',
      width: 1,
      backgroundColor: '#e0e0e0',
    },
    textStyle: {
      fontWeight: 'bold',
      fontSize: 16,
      textAlign: 'center'
    },
    unitStyle: {
      fontSize: 12,
      color: '#666',
    },
    textBlock: {
      height: 60,
      justifyContent: 'center',
    }
  });

  let year = "";
  let month = "";
  let day = "";
  if (date) {
    year = date.getFullYear();
    month = String(date.getMonth() + 1);
    day = String(date.getDate());
  }

  return (
    <View style={styles.board}>
      <View />
      <Surface elevation={0} style={styles.surface}>
        <Text style={styles.unitStyle}>{i18n.t('share_record_date')}</Text>
        <View style={styles.textBlock}>
          <Text style={styles.textStyle}>{date? `${year}\n${month}/${day}`:"Y-M/D"}</Text>
        </View>
      </Surface>
      <View style={styles.divider} />
      <Surface elevation={0} style={styles.surface}>
        <Text style={styles.unitStyle}>{i18n.t('share_course_distance')}</Text>
        <View style={styles.textBlock}>
        <Text style={styles.textStyle}>{distance? distance: "#.#"} Km</Text>
        </View>
      </Surface>
      <View style={styles.divider} />
      <Surface elevation={0} style={styles.surface}>
        <Text style={styles.unitStyle}>{i18n.t('share_course_duration')}</Text>
        <View style={styles.textBlock}>
        <Text style={styles.textStyle}>{duration? duration: "#.#"} H</Text>
        </View>
      </Surface>
      <View />
    </View>  
  );
}

const SubmitConfirmDialog = ({ isVisible, setVisible, handleSubmit}) => {
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

const CheckDialog = ({ isVisible, setVisible}) => {
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
