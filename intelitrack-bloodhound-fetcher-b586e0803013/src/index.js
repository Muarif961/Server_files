require('./config/dotenv');

const bloodhound = require('./constants/bloodhound-api');
const internal = require('./constants/internal-api');
const fetchData = require('./utils/fetch-data');

const logger = require('./utils/logger');
const Consumer = require('./consumer');
const Producer = require('./producer');

// Bloodhound Variables
const apiKey = process.env.API_KEY;
const bloodhoundUrl = process.env.BLOODHOUND_URL;

// Internal Variables
const deviceUrl = process.env.DEVICE_URL;

// Kafka Variables
const topic = process.env.WORKER_TOPIC;
const group = process.env.CONSUMER_GROUP;
const kafkaHost = process.env.KAFKA_URL;

// Producer Topics
const alertTopic = process.env.ALERT_TOPIC;
const trackingTopic = process.env.TRACKING_TOPIC;
const wakeupTopic = process.env.WAKEUP_TOPIC;
const deviceTopic = process.env.DEVICE_TOPIC;
const geofenceTopic = process.env.GEOFENCE_TOPIC;

const consumer = Consumer.create(topic, group, kafkaHost);
const producer = Producer.create(kafkaHost);

// Battery alert threshold (defaults to 10)
const batteryThreshold = process.env.BATTERY_THRESHOLD || 10;

Consumer.run(consumer, async (payload) => {
    // Get all required data
    const {
        deviceId,
        ids,
        tracking,
        gnss,
        lbs,
        battery,
        liveTracking,
        tamper,
        deviceStatus,
        wakeupTimes,
        simData
    } = await fetchAllData(payload.value);

    logger.log(`Generating data for ${deviceId} under account ${ids.accountId}`);

    const location = gnss || lbs;
    const accountId = ids.accountId;
    const groupId = ids.groupId;

    // Send a geofence check
    if(location) {
        const message = {
            deviceId,
            accountId,
            latitude: location.Latitude,
            longitude: location.Longitude,
            dateTime: location.FixTime,
        };

        queuePost(producer, message, geofenceTopic);
    }

    // Live tracking vs Wakeup History
    if (liveTracking && location) {
        // Add a live tracking message to the queue
        const message = {
            deviceId,
            accountId,
            latitude: location.Latitude,
            longitude: location.Longitude,
            altitude: location.Altitude || null,
            speed: location.Speed || null,
            direction: location.Direction || null,
            fixTime: location.FixTime
        };

        // Live Tracking
        queuePost(producer, message, trackingTopic);
    } else if (!liveTracking && (gnss || lbs)) {
        // Add position history to wakeup history queue
        // Set account ID or default to 444 (which means no account assigned yet)
        const message = [
            {
                deviceId,
                accountId,
                groupId,
                gnss,
                lbs
            }
        ];

        // Wake Up / Location History
        queuePost(producer, message, wakeupTopic);
    }

    // Log tamper alert
    if (tamper && location) {
        // Add a tamper message to the queue
        const message = [
            {
                deviceId,
                accountId,
                groupId,
                alertType: 'tamper',
                tamperState: location.TamperState,
                dateTime: location.FixTime,
                latitude: location.Latitude,
                longitude: location.Longitude
            }
        ];

        queuePost(producer, message, alertTopic);
    }

    // TODO: Should threshold be editable? Snoozing alerts for a period of time?
    // Log batter alert (currently logs an alert at 10% battery level)
    if ((battery && 'BatteryLevel' in battery) && battery.BatteryLevel <= batteryThreshold) {
        // Add a tamper message to the queue
        const message = [
            {
                deviceId,
                accountId,
                groupId,
                alertType: 'battery',
                dateTime: location.FixTime,
                batteryLevel: battery.BatteryLevel
            }
        ];

        queuePost(producer, message, alertTopic);
    }

    // Build device data object
    const deviceData = {
        deviceId
    };

    // Battery
    if (battery && 'BatteryLevel' in battery) deviceData.battery = battery.BatteryLevel;

    // Device Status
    if (deviceStatus && 'ServerAddress' in deviceStatus) deviceData.serverAddress = deviceStatus.ServerAddress;
    if (deviceStatus && 'APN' in deviceStatus) deviceData.apn = deviceStatus.APN;
    if (deviceStatus && 'GNSSStatus' in deviceStatus) deviceData.gnssstatus = deviceStatus.GNSSStatus;
    if (deviceStatus && 'RadioStatus' in deviceStatus) deviceData.radioStatus = deviceStatus.RadioStatus;
    if (deviceStatus && 'Model' in deviceStatus) deviceData.model = deviceStatus.Model;
    if (deviceStatus && 'FWVersion' in deviceStatus) deviceData.fwVersion = deviceStatus.FWVersion;
    if (deviceStatus && 'ProductionDate' in deviceStatus) deviceData.productionDate = deviceStatus.ProductionDate;
    if (deviceStatus && 'OperatingMode' in deviceStatus) deviceData.operatingMode = deviceStatus.OperatingMode;

    // SIM Data
    if (simData && 'SIMICCID' in simData) deviceData.simiccid = simData.SIMICCID;
    if (simData && 'SIMMSISDN' in simData) deviceData.simmsisdn = simData.SIMMSISDN;
    if (simData && 'IMEI' in simData) deviceData.imei = simData.IMEI;

    // Tamper State
    if(location && 'TamperState' in location) deviceData.tamperState = location.TamperState;

    const { Result, ...newWakeTimes } = wakeupTimes;

    // Wakeup Times
    if(newWakeTimes && 'WakeupCount' in newWakeTimes) deviceData.wakeupTimes = newWakeTimes;

    console.log('Device Data: ', deviceData);
    // Add device data to device queue (just battery atm)
    if (deviceData) {
        const message = [
            deviceData
        ];

        queuePost(producer, message, deviceTopic);
    }


});

/**
 * Fetch all data from the various endpoints and return as one object
 * @param deviceId
 * @returns {Promise<{tamper: boolean, operatingMode: boolean, gnss: *, lbs: *, battery: *, tracking: *}>}
 */
const fetchAllData = async (deviceId) => {
    const bloodhoundParams = [
        {
            type: 'param',
            name: 'DeviceID',
            value: deviceId
        },
        {
            type: 'param',
            name: 'APIKey',
            value: apiKey
        }
    ];

    const internalDeviceParams = [
        {
            type: 'path',
            route: deviceId
        }
    ];

    // Get the account ID for internal use
    const accountId = await fetchData(internal.ACCOUNT.query, internal.ACCOUNT.route, deviceUrl, internalDeviceParams);
    logger.info(accountId);

    // Get live tracking state
    const tracking = await fetchData(bloodhound.TRACK.query, bloodhound.TRACK.route, bloodhoundUrl, bloodhoundParams);

    // Get current position
    const gnss = await fetchData(bloodhound.GNSS.query, bloodhound.GNSS.route, bloodhoundUrl, bloodhoundParams);

    const lbs = await fetchData(bloodhound.LBS.query, bloodhound.LBS.route, bloodhoundUrl, bloodhoundParams);

    // Get battery state
    const battery = await fetchData(bloodhound.BATTERY.query, bloodhound.BATTERY.route, bloodhoundUrl, bloodhoundParams);

    // Get device status data
    const deviceStatus = await fetchData(bloodhound.STATUS.query, bloodhound.STATUS.route, bloodhoundUrl, bloodhoundParams);

    // Get device status data
    const wakeupTimes = await fetchData(bloodhound.WAKEUP.query, bloodhound.WAKEUP.route, bloodhoundUrl, bloodhoundParams);

    // Get sim Data
    const simData = await fetchData(bloodhound.SIM.query, bloodhound.SIM.route, bloodhoundUrl, bloodhoundParams);

    // Are we in live tracking mode?
    const liveTracking = tracking.OperatingMode === 'Tracking' && (gnss.Result === 'Success' || lbs.Result === 'Success');

    // Has the device been tampered with?
    const tamper = (gnss.TamperState === 'Tamper' || lbs.TamperState === 'Tamper');

    console.log('BLOODHOUND OBJECT: ', bloodhound);
    console.log('deviceStatus: ', deviceStatus);
    console.log('simData: ', simData);

    // If the accountId doesn't exist, set it to 444 which is the ID for any accounts that are not yet assigned
    return {
        deviceId,
        ids: successChecker(accountId, 'status', 'success') && accountId.accountId ? accountId : { ...accountId, accountId: 444},
        tracking: successChecker(tracking, 'Result', 'Success'),
        gnss: successChecker(gnss, 'Result', 'Success'),
        lbs: successChecker(lbs, 'Result', 'Success'),
        battery: successChecker(battery, 'Result', 'Success'),
        deviceStatus: successChecker(deviceStatus, 'Result', 'Success'),
        wakeupTimes: successChecker(wakeupTimes, 'Result', 'Success'),
        simData: successChecker(simData, 'Result', 'Success'),
        liveTracking,
        tamper
    };
};

/**
 * Queue Post to Kafka
 * @param producer
 * @param message
 * @param topic
 */
const queuePost = (producer, message, topic) => {
    const serialised = JSON.stringify(message);

    logger.info('serialised output : ', topic, ' - ', serialised);

    const payload = [
        {
            topic,
            messages: [serialised]
        }
    ];

    return producer.send(payload, (err, data) => {
        if (err) {
            logger.error(err);
            logger.error(`[kafka-producer -> ${topic}]: broker update failed`);
            return err;
        } else {
            logger.info(`[kafka-producer -> ${topic}]: broker update success`);
            logger.info(data);
            return data;
        }
    });
};


/**
 * SuccessChecker function that returns an object if a property and value condition are satisfied
 * @param object
 * @param property
 * @param value
 * @returns {null}
 */
const successChecker = (object, property, value) => {
    return object[property] === value ? object : null;
};

