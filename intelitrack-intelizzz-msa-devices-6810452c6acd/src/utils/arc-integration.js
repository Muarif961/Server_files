const Request = require('request-promise-native');
const logger = require("./logger");
const Bloodhound = require("./bloodhound");
const {pending} = require("../controllers/devices.controller");

// New Integration
const arcIntegrated = process.env.ARC_INTEGRATED && process.env.ARC_INTEGRATED === '1' ? true : false;
const arcIntegrationURL = process.env.ARC_INTEGRATION_URL;
const arcFixedValue = process.env.ARC_REFERENCE_ID;
const arcFrequency = process.env.ARC_FREQUENCY || 3;
const arcHours = process.env.ARC_HOURS || 0.5;
const arcMonitorFrequency = process.env.ARC_MONITOR_FREQUENCY || 30;
const arcMonitorHours = process.env.ARC_MONITOR_HOURS || 12;
const extraTime = 2;

const enableMonitorMode = async (deviceId, _pendingMonitor, _trackingStarted, setPendingMonitor) => {
    try {
        const trackingStartTime = _trackingStarted && new Date();
        const pendingMonitor = _pendingMonitor && new Date(_pendingMonitor);
        const currentTime = new Date();
        logger.info('*** Enabling Monitor Mode ***');
        logger.info('TRACKING START TIME: ', trackingStartTime);
        logger.info('PENDING MONITOR: ', pendingMonitor);
        logger.info('CURRENT TIME: ', currentTime);

        logger.info('IF CONDITION: ', (trackingStartTime && !pendingMonitor));
        logger.info('ELSE IF CONDITION: ', (pendingMonitor && (currentTime >= pendingMonitor)));
        logger.info('IF CONDITION: ', (trackingStartTime && !pendingMonitor));

        if (trackingStartTime && !pendingMonitor) {
            const timeOffset = (arcHours * 60) - (arcFrequency + (extraTime || 0));
            const pendingMonitorTime = new Date(trackingStartTime.getTime() + (timeOffset * 60 * 1000));
            logger.info('FIRST CONDITION TRUE');
            logger.info('TIME OFFSET: ', timeOffset);
            logger.info('PENDING MONITOR MODE: ', pendingMonitorTime);

            if(setPendingMonitor) {
                await setPendingMonitor(deviceId, pendingMonitorTime);
            }
        } else if (pendingMonitor && (currentTime >= pendingMonitor)) {
            logger.info('SECOND CONDITION TRUE');
            try {
                const res = await Bloodhound.setTrackingMode(deviceId, arcMonitorFrequency === 0 ? 0 : arcMonitorFrequency, arcMonitorHours === 0 ? 0 : (arcMonitorHours || 0) * 60);
                logger.info('Setting assess mode response: ', res);
            } catch (e) {
                logger.error('Error setting assess mode: ', e);
            }
            if(setPendingMonitor) {
                await setPendingMonitor(deviceId, null);
            }
        }
        logger.info('******* ****** ********');
        return true;


    } catch (error) {
        logger.error('Error enabling monitor mode: ', error);
        return false;
    }
}

const postData = async (url, params, testString = false) => {
    let postParams = '';
    let paramStarted = false;

    // Build the post parameters string
    params.forEach((param) => {
        postParams += !paramStarted ? '' : '|';
        postParams += `${param.name}=${param.value}`;
        paramStarted = true;
    });

    if(testString) return {statusCode: 200, body: postParams};

    const options = {
        method: 'POST',
        url,
        json: false,
        timeout: 5000,
        resolveWithFullResponse: true,
        body: postParams
    };

    return await Request(options)
        .then((response) => {
            return response;
        })
        .catch((e) => {
            logger.error('postData error');
            logger.error('error: ', e);
            return e.error;
        });
};

const getNextWakeup = (_wakeupTimes) => {
    const now = new Date();
    const wakeupTimes = (_wakeupTimes.length > 0 ? _wakeupTimes.filter(wt => !!wt) : []) || [];
    let closestWakeupTime;

    for (let i = 0; i <= wakeupTimes.length - 1; i++) {
        const wakeupTimeStr = wakeupTimes[i];
        const [hours, minutes] = wakeupTimeStr.split(':');

        const wakeupDate = new Date(now);
        wakeupDate.setUTCHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        if (wakeupDate <= now) {
            wakeupDate.setDate(wakeupDate.getDate() + 1);
        }

        if (!closestWakeupTime || wakeupDate < closestWakeupTime) {
            closestWakeupTime = wakeupDate;
        }
    }

    return closestWakeupTime.toISOString();
}

function degToCompass(num) {
    var val = Math.floor((num / 22.5) + 0.5);
    var arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return arr[(val % 16)];
}

const performArcIntegration = async (data, deviceInLocator, currentDeviceData, testOnly = false) => {
    if(!deviceInLocator || !arcIntegrated) {
        return null;
    }
    const {longitude, latitude, speed, direction, deviceId, tamperState, locationMethod} = data;
    const dateTime = data.lastWakeupTime;
    const {pendingOperatingMode, operatingMode, battery, wakeupTimes, frequency, pendingFrequency, plate, vehicleData, lastWakeupTime, trackingStartTime} = currentDeviceData;
    const trackingFrequency =  pendingOperatingMode === 'Tracking' || operatingMode === 'Tracking' ? pendingFrequency ? pendingFrequency : frequency : null;
    const trackingStartedTime = pendingOperatingMode === 'Tracking' || operatingMode === 'Tracking' ? trackingStartTime : null;
    const nextWakeupTime = getNextWakeup(wakeupTimes);

    // logger.info('*** Performing ARC Integration Test ***')
    // logger.info('DEVICEID: ', deviceId);
    // logger.info('ARCINTEGRATED: ', arcIntegrated);
    // logger.info('DEVICEINLOCATOR: ', deviceInLocator && deviceInLocator._doc);
    // logger.info('PENDINGOPMODE: ', pendingOperatingMode);
    // logger.info('OPMODE: ', operatingMode);
    // logger.info('*** ARC Integration Test END ***')

    const {crimeReference, userLocation, pocName, pocEmail, pocTelephone, accountEmail, initialMode, pendingMonitor, setPendingMonitor} = (deviceInLocator || {});

    if(pendingMonitor) {
        const monitorSuccess = await enableMonitorMode(deviceId,
            pendingMonitor,
            initialMode,
            setPendingMonitor);
    }

    if(
        arcIntegrated
        && deviceInLocator
        && (pendingOperatingMode === 'Tracking' || operatingMode === 'Normal')
    ) {
        try {
            logger.info('Integrating with ARC...')
            const monitorSuccess = await enableMonitorMode(deviceId,
                pendingMonitor,
                initialMode,
                setPendingMonitor);

            logger.info("Monitor enabled / disabled: ", monitorSuccess);

            const arcPayload = [
                { name: 'DeviceAddress',    value: arcFixedValue || 1 },
                { name: 'EventType',        value: 'VehicleTracking' },
                { name: 'Event',            value: pendingOperatingMode === 'Tracking' ? 'TrackingStarted' : 'PositionReport' }
            ];

            if(longitude) arcPayload.push({ name: 'Long', value: longitude });
            if(latitude) arcPayload.push({ name: 'Lat', value: latitude });

            let text = '';
            text+= 'DeviceId: ' + (deviceId || '0');
            text += ' & Crime Reference: ' + (crimeReference || '0');

            if(dateTime) text += ' & Current Wakeup Time: ' + dateTime;
            if(lastWakeupTime) text += ' & Previous Wakeup Time: ' + lastWakeupTime;
            if(nextWakeupTime) text += ' & Next Wakeup Time: ' + nextWakeupTime;
            if(trackingStartedTime) text += ' & Tracking Started Time: ' + trackingStartedTime;
            if(locationMethod) text += ' & Location Method: ' + locationMethod;

            if(tamperState === 'Tamper') text += ' & Tamper State: Tampered';

            if(speed !== undefined && speed !== null) text += ' & Speed: ' + speed;
            if((speed && speed > 0) && direction) text += ' & Direction: ' + degToCompass(direction);

            if(battery) text += ' & Battery: ' + battery;
            if(trackingFrequency) text += ' & Tracking Frequency: ' + trackingFrequency;

            if(plate) text += ' & Plate: ' + plate.toUpperCase();

            if(vehicleData) {
                const {manufacturer, make, model, colour, engine, trim, transmission, year} = vehicleData;

                if(manufacturer) text += ' & Manufacturer: ' + manufacturer;
                if(make) text += ' & Make: ' + make;
                if(model) text += ' & Model: ' + model;
                if(colour) text += ' & Colour: ' + colour;
                if(engine) text += ' & Engine: ' + engine;
                if(trim) text += ' & Trim: ' + trim;
                if(transmission) text += ' & Transmission: ' + transmission;
                if(year) text += ' & Year: ' + year;
            }

            if(userLocation) text += ' & User Location: ' + userLocation;

            // Add POC Name, POC Email, POC Telephone, and Account Email
            if (pocName) text += ' & POC Name: ' + pocName;
            if (pocEmail) text += ' & POC Email: ' + pocEmail;
            if (pocTelephone) text += ' & POC Telephone: ' + pocTelephone;
            if (accountEmail) text += ' & Account Email: ' + accountEmail;

            arcPayload.push({ name: 'Text', value: text });

            logger.info("Arc Integration URL: ", arcIntegrationURL);
            logger.info("Arc Integration Data: ", arcPayload);

            // Send to the integration URL if set
            if(arcIntegrationURL) {
                const response = (await postData(arcIntegrationURL, arcPayload, testOnly)) || {};
                if (response.statusCode === 200) {
                    logger.info('Success sending ARC payload.');
                    if(testOnly) return response.body;
                    return true;
                } else {
                    logger.info('Error sending ARC payload: ', response.statusCode, response.body);
                    return false;
                }
            }

        } catch (e) {
            // LOG ERROR AND CONTINUE
            logger.error('ARC Alert Error: ', e);
            return e
        }
    }

    return null;
}


module.exports = { performArcIntegration, enableMonitorMode };
