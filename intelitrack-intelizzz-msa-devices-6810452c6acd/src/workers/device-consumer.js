require('../config/dotenv');
const DBconnection = require('../connections/mongoose');
const Device = require('../models/device.model');
const Locator = require('../models/locator.model');
const ObjectId = require('mongoose').Types.ObjectId;
const postData = require('../utils/arc-integration');

const Group = require('../models/group.model');
const StockData = require('../models/stock-data.model');

const logger = require('../utils/logger');
const Consumer = require('../consumer');
const integrate = require("../utils/integrations");
const arcIntegration = require("../utils/arc-integration");
const {pending} = require("../controllers/devices.controller");

const Bloodhound = require('../utils/bloodhound');
const { getAccountInstallerTimes } = require("../utils/timezone-helper");

// Kafka Variables
const topic = process.env.KAFKA_TOPIC;
const group = process.env.KAFKA_GROUP;
const kafkaHost = process.env.KAFKA_URL;

const hdopGeneral = process.env.GNSS_HDOP_GENERAL || {};
const hdopTracking = process.env.GNSS_HDOP_TRACKING || {};
const RadioTimeout = process.env.RADIO_TIMEOUT || 60;
const MessageTimeout = process.env.MESSAGE_TIMEOUT || 30;

// TODO: Hard coded!
const MAX_WAKEUPS_LENGTH = 4;

logger.info(`Connecting to ${kafkaHost} with topic ${topic} under group ${group}.`);

const consumer = Consumer.create(topic, group, kafkaHost);
Consumer.run(consumer, async (payload) => {
    logger.info('Device Consumer Process Started');

    const data = JSON.parse(payload.value);

    if(data && data.type === 'processInstall') {
        logger.info('Device Consumer - Processing Install');
        await processInstall(data);
    }

    if(data && data.type === 'alert' && data.pushData.alertType !== 'firstwakeup') {
        logger.info('Device Consumer - Processing Device Alert');
        await deviceAlertPath(data);
    }

    if(data && data[0] && data[0].type === 'device') {
        logger.info('Device Consumer - Processing Wake Up');
        await deviceWakeupPath(data[0]);
    }

    const integrationData = data && data[0] && data[0].integrationData ? data[0].integrationData : data && data.integrationData;
    const groups = integrationData && integrationData.integrations && integrationData.integrations[0] && integrationData.integrations[0].groups;
    const groupId = integrationData && integrationData.mappedObject && integrationData.mappedObject.GroupID;

    const groupMatch = (groupId, groupsToMatch) => {
        if(!groupId) return true;
        return !groupsToMatch.includes(groupId);
    }

    const ignoreIntegration = groups ? groupMatch(groupId, groups) : false;

    // logger.info('Device Consumer - Ignore Integration: ', ignoreIntegration);

    if(integrationData && !ignoreIntegration) {
        try {
            //console.log('Sending Integration Data')
            // logger.info('Device Consumer - Processing Webhook Integration: ');
            await integrate(integrationData);
        } catch(e) {
            logger.error('Device Consumer - Processing Webhook Integration - Error: ', e);
        }
    }
});

const convertDeviceId = (inputString) => {
    if(!inputString) return;

    const prefix = "894620380";
    const parts = inputString.split(/[-\s]/);

    return prefix + parts.join('');
}
const processInstall = async (data) => {
    const accountId = data.accountId;
    const row = data.row;

    if(!row || !accountId) {
        logger.error('Device Consumer - Process Install - Missing Data: ', data);
    }

    try {
        const equipmentTrimID = ((row['Equipment'] || row['EQ']) || '').slice(0, -1);
        const equipmentTrimIDFull = (row['Equipment'] || row['EQ']);
        const mco = row['MCO'] + ' MCO';
        const deviceId = convertDeviceId(row['Dvc ID'] || row['ID']);

        // db.units.update({_id: "8946203807600537783"}, { $set: { accountId: "63334fb2a31c74001164de4c", installed: true, installationDate: new Date(), name: "BP1002L", groupId: "64f1cf3addf2d253206f73d2", vin: "3GCNAAED6RG287731", vehicleData: { year: "2024", model: "Silverado 1500 - 2WD LONG BED", EquipmentTrimID: "BP1945", Model: "Silverado 1500 - 2WD LONG BED", VIN: "3GCNAAED6RG287731", ManufactureYear: "2024", City: "TEMPE", State: "AZ", Make: "CHEV", ModelType: "CC10903", MCOID: "922", MCO: "922 MCO"}, dateAssigned: new Date()}})

        // const stockData = await StockData.findOne({ EquipmentTrimID: equipmentTrimID });
        const stockData = await StockData.findOne({$or: [{EquipmentTrimID: equipmentTrimID}, {EquipmentTrimID: equipmentTrimIDFull}]});
        const groupData = await Group.findOne({name: mco});

        const groupInsert = {};
        const mainInsert = {
            pendingOperatingMode: 'Normal',
            pendingTamperState: 'On',
            installed: true,
            installationDate: new Date(),
            name: equipmentTrimIDFull,
        }

        if(groupData) {
            groupInsert.groupId = groupData._id.toLocaleString();
        }

        const vehicleDetailsInsert = {};

        if (stockData) {
            vehicleDetailsInsert.vin = stockData.VIN;
            vehicleDetailsInsert.vehicleData = stockData;
        }

        const deviceData = await Device.findOneAndUpdate({ _id: deviceId, accountId: accountId}, {$set: {...mainInsert, ...groupInsert, ...vehicleDetailsInsert}}, {new: false, setDefaultsOnInsert: true});

        if(!deviceData) {
            logger.error('(processInstall) - Processing Install - Device ID not found: ', deviceId);
        }

        // Set device to Normal operating mode
        if(deviceData) {
            await Bloodhound.setOperatingMode(deviceId, 'Normal');

            await Bloodhound.setGNSSQuality(deviceId, hdopGeneral.GNSSQuality, hdopGeneral.GNSSHDOP);

            await Bloodhound.setGNSSTimeout(deviceId, hdopGeneral.GNSSTimeout);

            // Set tamper alerts to on
            await Bloodhound.setTamper(deviceId, 'On');

            // Check for account installer times and timezone in the row data
            let updateTimes = null;
            if (row.timezone || row.Timezone) {
                const timezone = row.timezone || row.Timezone;
                updateTimes = await getAccountInstallerTimes(accountId, timezone);
            }

            // Set wake times if installer times were found
            if (updateTimes) {
                const finalUpdateTimes = [...updateTimes.slice(0, MAX_WAKEUPS_LENGTH)];
                while (finalUpdateTimes.length < MAX_WAKEUPS_LENGTH) {
                    finalUpdateTimes.push(null);
                }
                await Bloodhound.setWakeTimes(deviceId, finalUpdateTimes, 'MTWTFSS');
                
                // Set pendingWakeTimes in the database
                await Device.findOneAndUpdate(
                    { _id: deviceId, accountId },
                    { $set: { pendingWakeupTimes: finalUpdateTimes } },
                    { new: true, useFindAndModify: false }
                );
            }
        }

    } catch (error) {
        logger.error('(processInstall) - Processing Install - Error adding record:', error);
    }
}

const deviceAlertPath = async (data) => {
    // logger.info('WORKER: Alert: ', data);

    const options = { upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: false };

    const alertData ={
        alert: data.alertId,
        alertDate: data.pushData.dateTime
    };

    const res = await Device.findOneAndUpdate({ _id: data.pushData.deviceId }, alertData, options);

    if(!res) {
        logger.error('(deviceAlertPath) - Device Consumer - Alert Not Logged Error: ', data.pushData.deviceId, alertData);
    }
};

const setPendingMonitor = async (deviceId, pendingMonitor) => {
    await Locator.findOneAndUpdate({_id: deviceId}, { $set: { pendingMonitor: pendingMonitor, initialMode: null }})
}

const deviceWakeupPath = async (data) => {
    //logger.info('(deviceWakeupPath) - Device Consumer - Device ID: ', data && data.deviceId);

    const options = { upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: false };

    const currentDeviceData = await Device.findOne({ _id: data.deviceId });

    const pendingOperatingMode = currentDeviceData && currentDeviceData.pendingOperatingMode;
    const operatingMode = currentDeviceData && currentDeviceData.operatingMode;
    const hdopEnabled = currentDeviceData && currentDeviceData.hdopProcessEnabled;
    const gnssQuality = currentDeviceData && currentDeviceData.gnssQuality;
    const gnssHDOP = currentDeviceData && currentDeviceData.gnssHDOP;
    const gnssTimeout = currentDeviceData && currentDeviceData.gnssTimeout;
    const messageTimeout = currentDeviceData && currentDeviceData.messageTimeout;
    const radioTimeout = currentDeviceData && currentDeviceData.radioTimeout;


    const deviceTimeouts = currentDeviceData && !!(currentDeviceData.radioTimeout || currentDeviceData.messageTimeout);

    const gnssQualitySettings = {
        gnssQuality: operatingMode === 'Tracking' ? (hdopTracking.GNSSQuality || 2) : (hdopGeneral.GNSSQuality || 1),
        gnssHDOP: operatingMode === 'Tracking' ? (hdopTracking.GNSSHDOP || 1.0) : (hdopGeneral.GNSSHDOP || 1.0),
        gnssTimeout: operatingMode === 'Tracking' ? (hdopTracking.GNSSTimeout || 120) : (hdopGeneral.GNSSTimeout || 60)
    }

    if(!hdopEnabled && !pendingOperatingMode) {
        await Bloodhound.setGNSSQuality(data.deviceId, gnssQualitySettings.gnssQuality, gnssQualitySettings.gnssHDOP);
        await Bloodhound.setGNSSTimeout(data.deviceId, gnssQualitySettings.gnssTimeout);
        gnssQualitySettings.hdopProcessEnabled = true;
    }

    if(hdopEnabled && operatingMode === 'normal' &&
        (gnssQuality !== gnssQualitySettings.gnssQuality ||
            gnssHDOP !== gnssQualitySettings.gnssHDOP ||
            gnssTimeout !== gnssQualitySettings.gnssTimeout)) {
        await Bloodhound.setGNSSQuality(data.deviceId, gnssQualitySettings.gnssQuality, gnssQualitySettings.gnssHDOP);
        await Bloodhound.setGNSSTimeout(data.deviceId, gnssQualitySettings.gnssTimeout);
        gnssQualitySettings.hdopProcessEnabled = true;
    }

    const extraData = gnssQualitySettings.hdopProcessEnabled ? { ...gnssQualitySettings } : {};

    if((!messageTimeout || !radioTimeout) ||
        ((messageTimeout && messageTimeout !== MessageTimeout) || (radioTimeout && radioTimeout !== RadioTimeout))) {
        await Bloodhound.setMessageTimeout(data.deviceId, MessageTimeout);
        await Bloodhound.setRadioTimeout(data.deviceId, RadioTimeout);
        extraData.messageTimeout = MessageTimeout;
        extraData.radioTimeout = RadioTimeout;
    }

    // Get only expected values from device data
    const deviceData = buildDeviceData(data, currentDeviceData);

    await Device.findOneAndUpdate({ _id: data.deviceId }, {...deviceData, ...extraData}, options);

    // Check if device is in Locator and send an alert if it has entered tracking mode
    const _deviceInLocator = await Locator.findOne({ _id: data.deviceId });
    const deviceInLocator = _deviceInLocator ? {..._deviceInLocator, setPendingMonitor: setPendingMonitor } : null;

    const arcSuccess = await arcIntegration.performArcIntegration(data, deviceInLocator, currentDeviceData);

    if(arcSuccess) logger.info('(deviceWakeupPath) - ARC integration Success: ', arcSuccess);
}

const buildDeviceData = (data, currentData) => {
    const built = {};

    if(data.battery) built.battery = data.battery;
    if(data.serverAddress) built.serverAddress = data.serverAddress;
    if(data.apn) built.apn = data.apn;
    if(data.gnssstatus) built.gnssstatus = data.gnssstatus;
    if(data.radioStatus) built.radioStatus = data.radioStatus;
    if(data.model) built.model = data.model;
    if(data.fwVersion) built.fwVersion = data.fwVersion;
    if(data.productionDate) built.productionDate = data.productionDate;
    if(data.operatingMode){
        built.pendingOperatingMode = null;
        built.pendingFrequency = null;
        built.operatingMode = currentData && currentData.pendingOperatingMode ? currentData.pendingOperatingMode : data.operatingMode;
        built.frequency = currentData && currentData.pendingFrequency ? currentData.pendingFrequency : data.frequency;
    }

    if(data.trackingStartTime) {
        built.trackingStartTime = data.trackingStartTime;
    } else if(data.operatingMode && data.operatingMode !== 'Tracking') {
        built.trackingStartTime = null;
    }

    if(data.tamperState) {
        built.pendingTamperState = null;
        built.tamperState = currentData && currentData.pendingTamperState ? currentData.pendingTamperState : data.tamperState;
    }
    if(data.pendingWakeupTimes) {
        built.pendingWakeupTimes = null;
        built.tamperState = currentData && currentData.pendingTamperState ? currentData.pendingTamperState : data.tamperState;
    }

    // Clear any pending stuff
    built.pendingWakeupDays = null;
    built.pendingWakeupTimes = null;
    built.configure = false;
    built.retryDate = null;

    if(data.wakeupTimes && data.wakeupTimes.WakeupCount > 0) {
        const updatedTimes = [];

        for(let i=0; i < MAX_WAKEUPS_LENGTH; i++) {
            updatedTimes.push(data.wakeupTimes['WakeupTime' + (i + 1)] || null);
        }

        built.wakeupTimes = currentData && currentData.pendingWakeupTimes ? currentData.pendingWakeupTimes : updatedTimes;
    }
    if(data.wakeupTimes && data.wakeupTimes.WakeupDays) {
        built.wakeupDays = currentData && currentData.pendingWakeupDays ? currentData.pendingWakeupDays : data.wakeupTimes.WakeupDays;
    }

    if(data.lastWakeupTime) built.lastWakeupTime = data.lastWakeupTime;

    if(data.timezone) built.lastTimezone = data.timezone;

    if(data.wakeupCount) built.wakeupCount = data.wakeupCount;

    if(data.lowThresholdAlert) built.lowThresholdAlert = data.lowThresholdAlert;
    if(data.endOfLifeAlert) built.endOfLifeAlert = data.endOfLifeAlert;

    if(data.setHibernate === false) built.setHibernate = false;
    if(data.setHibernate === true) built.setHibernate = true;

    if(data.notActivated === false) built.notActivated = false;
    if(data.notActivated === true) built.notActivated = true;

    return built;
};
