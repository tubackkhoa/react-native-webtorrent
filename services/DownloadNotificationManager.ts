import { humanFileSize, openVideoIntent } from '../HelperFunctions';
import notifee, { AndroidColor, EventType } from '@notifee/react-native';
import { logger } from './Logger';

export interface EpisodeDownloadProgress {
    episodeNumber: string;
    showName: string;
    totalSize: number;
    downloaded: number;
    notificationId: string;
    notificationSortValue: string;
    currentSpeed: number; // Bytes per second
}

class DownloadNotificationManger {
    private downloads: EpisodeDownloadProgress[] = [];
    private notificationIndex = 0;
    private foregroundNotificationId = '';
    private groupId = 'group-id';
    private summaryNotificationId = 'summary-notification-id';
    constructor() {
        notifee.registerForegroundService((notification) => {
            return new Promise(() => {
                console.log('notification callback');
            });
        });
        notifee.onBackgroundEvent(async ({ type, detail }) => {
            if (
                type === EventType.PRESS &&
                detail.notification?.data?.filePath
            ) {
                await openVideoIntent(detail.notification.data.filePath);
            }
        });
        notifee.onForegroundEvent(({ type, detail }) => {
            if (
                type === EventType.PRESS &&
                detail.notification?.data?.filePath
            ) {
                openVideoIntent(detail.notification.data.filePath);
            }
        });
    }

    public getInprogressDownloads() {
        const totalDownloaded = this.downloads.reduce(
            (previousValue, currentValue) =>
                previousValue + currentValue.downloaded,
            0,
        );
        const totalToDownloaded = this.downloads.reduce(
            (previousValue, currentValue) =>
                previousValue + currentValue.totalSize,
            0,
        );
        const totalSpeed = this.downloads.reduce(
            (previousValue, currentValue) =>
                previousValue + currentValue.currentSpeed,
            0,
        );
        return {
            totalDownloaded,
            totalToDownloaded,
            totalSpeed,
            currentDownloadCount: this.downloads.length,
        };
    }

    public async addDownload(
        showName: string,
        episodeNumber: string,
        totalSize: number,
    ) {
        try {
            console.log('Showing notification for', showName, episodeNumber);
            const channelId = await notifee.createChannel({
                id: 'Downloadnotifications',
                name: 'Episode download notifications',
            });
            const foreGroundServiceChannelId = await notifee.createChannel({
                id: 'ForeGroundNotification',
                name: 'Downloads in progress notification',
            });
            console.log('Created or acquired a channel for notification');
            const notificationSortValue = (this.notificationIndex++).toString();
            const notificationId = await notifee.displayNotification({
                id: showName + episodeNumber,
                title: `${showName} ep: ${episodeNumber}`,
                android: {
                    channelId,
                    onlyAlertOnce: true,
                    ongoing: true,
                    colorized: true,
                    autoCancel: false,
                    smallIcon: 'subsplease_notification_icon',
                    progress: {
                        max: totalSize,
                        current: 0,
                    },
                    sortKey: notificationSortValue,
                    groupId: this.groupId,
                },
            });
            this.downloads.push({
                showName,
                episodeNumber,
                totalSize,
                downloaded: 0,
                notificationId,
                notificationSortValue,
                currentSpeed: 0,
            });
            if (this.downloads.length === 1) {
                console.log('Showing foreground notification');
                await notifee.displayNotification({
                    title: 'Episode downloads in progress',
                    body: 'test body',
                    android: {
                        channelId: foreGroundServiceChannelId,
                        asForegroundService: true,
                        color: AndroidColor.RED,
                        colorized: true,
                    },
                });
            }
        } catch (ex) {
            logger.error(
                'Failed to create notification for',
                showName,
                episodeNumber,
                'error:',
                JSON.stringify(ex),
            );
        }
    }

    public async onDataDownloaded(
        showName: string,
        episodeNumber: string,
        totalDownloaded: number,
        currentSpeed: number,
    ) {
        const downloadingEpisode = this.downloads.find(
            (download) =>
                download.showName === showName &&
                download.episodeNumber === episodeNumber,
        );
        if (!downloadingEpisode) {
            // Might not've been added yet.
            return;
        }
        downloadingEpisode.downloaded = totalDownloaded;
        downloadingEpisode.currentSpeed = currentSpeed;

        const channelId = await notifee.createChannel({
            id: 'Downloadnotifications',
            name: 'Episode download notifications',
        });
        await notifee.displayNotification({
            id: showName + episodeNumber,
            title: `${showName} ep: ${episodeNumber}`,
            body: `${Math.round(
                (downloadingEpisode.downloaded / downloadingEpisode.totalSize) *
                    100,
            )}% - ${humanFileSize(
                downloadingEpisode.downloaded,
            )} / ${humanFileSize(
                downloadingEpisode.totalSize,
            )}. ${humanFileSize(currentSpeed)}/s`,
            android: {
                channelId,
                onlyAlertOnce: true,
                ongoing: true,
                colorized: true,
                autoCancel: false,
                smallIcon: 'subsplease_notification_icon',
                progress: {
                    max: downloadingEpisode.totalSize,
                    current: downloadingEpisode.downloaded,
                },
                sortKey: downloadingEpisode.notificationSortValue,
                groupId: this.groupId,
            },
        });
        await this.updateSummaryNotification(channelId);
    }

    public async completeDownload(
        showName: string,
        episodeNumber: string,
        destinationFileLocation: string,
    ) {
        console.log(
            'Sending completed notification for',
            showName,
            episodeNumber,
        );
        this.downloads = this.downloads.filter((download) => {
            if (download.showName === showName) {
                return download.episodeNumber !== episodeNumber;
            }
            return true;
        });
        // Show complete notification
        const channelId = await notifee.createChannel({
            id: 'Downloadnotifications',
            name: 'Episode download notifications',
        });
        await notifee.displayNotification({
            id: showName + episodeNumber,
            title: `${showName} ep: ${episodeNumber}`,
            body: 'Download complete',
            data: {
                filePath: destinationFileLocation,
            },
            android: {
                smallIcon: 'subsplease_notification_complete_icon',
                channelId,
                groupId: this.groupId,
            },
        });
        await this.updateSummaryNotification(channelId);
        if (this.getInprogressDownloads().currentDownloadCount === 0) {
            console.log('Stopping foreground service');
            await notifee.cancelNotification(this.foregroundNotificationId);
            await notifee.stopForegroundService();
            console.log('Stopped foreground service');
        }
    }

    private async updateSummaryNotification(channelId: string) {
        // Summary notification
        const inProgressDownloads = this.getInprogressDownloads();
        const subtitle =
            inProgressDownloads.currentDownloadCount === 0
                ? 'All downloads complete'
                : `${humanFileSize(
                      inProgressDownloads.totalSpeed,
                  )}/S - ${humanFileSize(
                      inProgressDownloads.totalDownloaded,
                  )}/${humanFileSize(inProgressDownloads.totalToDownloaded)}`;
        await notifee.displayNotification({
            id: this.summaryNotificationId,
            title: `YoRHa downloads - ${
                inProgressDownloads.currentDownloadCount
            } downloads - ${Math.round(
                (inProgressDownloads.totalDownloaded /
                    inProgressDownloads.totalToDownloaded) *
                    100,
            )}`,
            subtitle: subtitle, // speed and size here
            android: {
                channelId,
                smallIcon: 'subsplease_notification_icon',
                groupSummary: true,
                groupId: this.groupId,
            },
        });
    }
}

const downloadNotificationManger = new DownloadNotificationManger();
export { downloadNotificationManger };
