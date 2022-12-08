import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import {
    Button,
    Text,
    Title,
    TouchableRipple,
    useTheme,
} from 'react-native-paper';
import { readTextFile } from '../HelperFunctions';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
    Appearance,
    Linking,
} from 'react-native';
import { Appbar } from 'react-native-paper';
import { ImportExportListItem } from './settingsPageComponents/ExportImportSettings';
import { SavedShowLocationSettings } from './settingsPageComponents/SavedShowLocationSettings';
import { SettingsDivider } from './settingsPageComponents/SettingsDivider';
import { FileLogger } from 'react-native-file-logger';
// import crashlytics from '@react-native-firebase/crashlytics';
// import { firebase } from '@react-native-firebase/analytics';
import { StorageKeys } from '../enums/enum';
import { getVersion } from 'react-native-device-info';
import { CheckBoxSettingsBox } from './settingsPageComponents/CheckBoxSettingBox';
import { TextSettingsBox } from './settingsPageComponents/TextSettingsBox';
import { Storage } from '../services/Storage';
import { useNavigation } from '@react-navigation/native';

export const SettingsTab = () => {
    const { colors } = useTheme();
    const navigation = useNavigation<any>();
    const [logViewOpen, setLogViewOpen] = React.useState(false);
    const [logText, setLogText] = React.useState('');
    const [logFileName, setFileName] = React.useState('');
    const { height } = useWindowDimensions();
    const [analyticsEnabled, setAnalyticsEnabled] = React.useState(false);
    const [useAutoGenerateFolderNames, setUseAutoGenerateFolderNames] =
        React.useState(false);
    const [autoGenerateFolderName, setAutoGenerateFolderName] =
        React.useState('');
    const [useInbuildTorrentClient, setUseInbuildTorrentClient] =
        React.useState(true);
    const [cacheLength, setCacheLength] = React.useState(100);
    const [crashReportingEnabled, setCrashReportingEnabled] = React.useState(
        // crashlytics().isCrashlyticsCollectionEnabled,
        false,
    );

    const backgroundStyle = {
        backgroundColor:
            Appearance.getColorScheme() === 'light'
                ? colors.subsPleaseLight2
                : colors.subsPleaseDark2,
    };

    const textStyle = {
        color:
            Appearance.getColorScheme() === 'light'
                ? colors.subsPleaseDark3
                : colors.subsPleaseLight1,
    };

    React.useEffect(() => {
        Storage.getItem(StorageKeys.AnalyticsEnabled, true).then((enabled) => {
            setAnalyticsEnabled(enabled);
            // firebase.analytics().setAnalyticsCollectionEnabled(enabled);
        });
        Storage.getItem(StorageKeys.UseInbuiltTorrentClient, true).then(
            (enabled) => {
                setUseInbuildTorrentClient(enabled);
            },
        );
        Storage.getItem(StorageKeys.UseAutoGeneratedFolderNames, true).then(
            (enabled) => {
                setUseAutoGenerateFolderNames(enabled);
            },
        );
        Storage.getItem(StorageKeys.AutoGeneratedFolderName, '').then(
            (value) => {
                setAutoGenerateFolderName(value);
            },
        );
        Storage.getItem(StorageKeys.ReleaseShowCacheLength, 100).then(
            (length) => {
                setCacheLength(length);
            },
        );
    }, []);

    const displayLogs = async () => {
        const latestLogPath = (await FileLogger.getLogFilePaths())[0];
        setFileName(latestLogPath);
        if (latestLogPath) {
            const latestLogText = await readTextFile(latestLogPath);
            setLogText(latestLogText);
            setLogViewOpen(true);
        }
    };

    const toggleAnalytics = async (newValue: boolean) => {
        setAnalyticsEnabled(newValue);
        try {
            if (!newValue) {
                console.log('Disabling analytics..');
                // await firebase.analytics().logEvent('opt_out_analytics');
            } else {
                console.log('Enabling analytics..');
            }
        } catch (ex) {
            console.error('Failed to change analytics state', ex);
        }
        // await firebase.analytics().setAnalyticsCollectionEnabled(newValue);
        await Storage.setItem(StorageKeys.AnalyticsEnabled, newValue);
    };

    const toggleCrashlytics = async (newValue: boolean) => {
        // await crashlytics()
        //     .setCrashlyticsCollectionEnabled(newValue)
        //     .then(() =>
        //         setCrashReportingEnabled(
        //             crashlytics().isCrashlyticsCollectionEnabled,
        //         ),
        //     );
    };

    const styles = StyleSheet.create({
        centeredView: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 22,
            maxHeight: '100%',
            overflow: 'scroll',
        },
        touchableStyle: {
            height: 60,
            backgroundColor:
                Appearance.getColorScheme() === 'light'
                    ? colors.subsPleaseLight3
                    : colors.subsPleaseDark1,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: 20,
            borderRadius: 0,
            marginBottom: 3,
        },
        button: {
            borderRadius: 20,
            padding: 10,
            elevation: 2,
        },
        buttonOpen: {
            backgroundColor: '#F194FF',
        },
        buttonClose: {
            backgroundColor: '#2196F3',
        },
        modalText: {
            marginBottom: 20,
            fontSize: 12,
        },
    });

    return (
        <>
            <Appbar.Header
                statusBarHeight={1}
                style={{ backgroundColor: colors.tertiary }}
            >
                <Appbar.Content color={'white'} title="Settings" />
            </Appbar.Header>
            <ScrollView style={backgroundStyle}>
                <SavedShowLocationSettings />
                <SettingsDivider />
                <CheckBoxSettingsBox
                    value={useInbuildTorrentClient}
                    text="Use in-app torrent client"
                    onChange={(newValue) => {
                        setUseInbuildTorrentClient(newValue);
                        Storage.setItem(
                            StorageKeys.UseInbuiltTorrentClient,
                            newValue,
                        );
                    }}
                />
                <TextSettingsBox
                    value={cacheLength}
                    text="Release list cache count"
                    modalText="Number of release show items to cache (-1 for unlimited)"
                    keyboardType="numeric"
                    onChange={(newValue) => {
                        newValue = newValue === '' ? '0' : newValue;
                        const number = parseInt(newValue, 10);
                        setCacheLength(number);
                        Storage.setItem(
                            StorageKeys.ReleaseShowCacheLength,
                            number,
                        );
                    }}
                />
                <CheckBoxSettingsBox
                    value={useAutoGenerateFolderNames}
                    text="Auto generated folder names"
                    onChange={(newValue) => {
                        setUseAutoGenerateFolderNames(newValue);
                        Storage.setItem(
                            StorageKeys.UseAutoGeneratedFolderNames,
                            newValue,
                        );
                    }}
                />
                <TextSettingsBox
                    value={autoGenerateFolderName}
                    text="Base folder"
                    modalText="Folder where auto generated folder names will be created"
                    folderPicker
                    onChange={(newValue) => {
                        setAutoGenerateFolderName(newValue);
                        Storage.setItem(
                            StorageKeys.AutoGeneratedFolderName,
                            newValue,
                        );
                    }}
                />
                <SettingsDivider />
                <ImportExportListItem type="Import" />
                <ImportExportListItem type="Export" />
                <SettingsDivider />
                <TouchableRipple
                    onPress={() => {
                        Alert.alert(
                            'Are you sure you want to clear all data?',
                            'This action cannot be undone.',
                            [
                                {
                                    text: 'Cancel',
                                    style: 'cancel',
                                },
                                {
                                    text: 'OK',
                                    onPress: async () => {
                                        console.log('Going to clear all data');
                                        await AsyncStorage.clear();
                                    },
                                },
                            ],
                        );
                    }}
                    style={styles.touchableStyle}
                >
                    <View>
                        <Title style={textStyle}>Clear all data</Title>
                    </View>
                </TouchableRipple>
                <TouchableRipple
                    onPress={() => Storage.clearCache()}
                    style={styles.touchableStyle}
                >
                    <View>
                        <Title style={textStyle}>Clear cache</Title>
                    </View>
                </TouchableRipple>
                <SettingsDivider />
                <CheckBoxSettingsBox
                    value={analyticsEnabled}
                    text="App analytics"
                    onChange={(newValue) => {
                        toggleAnalytics(newValue);
                    }}
                />
                <CheckBoxSettingsBox
                    value={crashReportingEnabled}
                    text="Crash reporting"
                    onChange={(newValue) => {
                        toggleCrashlytics(newValue);
                    }}
                />
                <TouchableRipple
                    onPress={() => displayLogs()}
                    style={styles.touchableStyle}
                >
                    <View>
                        <Title style={textStyle}>View logs</Title>
                    </View>
                </TouchableRipple>
                <TouchableRipple
                    onPress={() =>
                        FileLogger.sendLogFilesByEmail({
                            subject: 'SubsPlease logs',
                        })
                    }
                    style={styles.touchableStyle}
                >
                    <View>
                        <Title style={textStyle}>Send logs</Title>
                    </View>
                </TouchableRipple>
                <SettingsDivider />
                <TouchableRipple
                    onPress={() =>
                        Linking.openURL(
                            'https://github.com/Leapward-Koex/SubsPleaseApp/releases',
                        )
                    }
                    style={styles.touchableStyle}
                >
                    <View>
                        <Title style={textStyle}>SubsPlease App Github</Title>
                    </View>
                </TouchableRipple>
                <View style={Object.assign({ padding: 20 }, textStyle)}>
                    <Text>Version {getVersion()}</Text>
                </View>
            </ScrollView>
            <Modal
                animationType="fade"
                transparent={false}
                visible={logViewOpen}
                onRequestClose={() => {
                    setLogViewOpen(!logViewOpen);
                }}
            >
                <View style={styles.centeredView}>
                    <Text>{logFileName}</Text>
                    <ScrollView>
                        <Text style={styles.modalText}>{logText}</Text>
                    </ScrollView>
                    <Button
                        style={{ marginTop: 15 }}
                        mode="contained"
                        onPress={() => setLogViewOpen(!logViewOpen)}
                    >
                        Close
                    </Button>
                </View>
            </Modal>
        </>
    );
};