const fetchData = require('./fetch-data');
const bloodhound = require('../constants/bloodhound-api');

// Bloodhound Variables
const apiKey = process.env.API_KEY;
const bloodhoundUrl = process.env.BLOODHOUND_URL;

const defaultParams = (deviceId) => ([
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
]);

const getWakeTimes = async (deviceId) => {
    const bloodhoundParams =defaultParams(deviceId);

    const wakeTimes = await fetchData(bloodhound.WAKEUPS.query, bloodhound.WAKEUPS.route, bloodhoundUrl, bloodhoundParams);

    return wakeTimes;
};

const setWakeTimes = async (deviceId, times, days) => {
    // GET config/SetWakeupTimes DeviceID=987654321 APIKey WakeupCount=2 WakeupTime1=15:00 WakeupTime2=21:00 WakeupDays=MTWTFXX
    const filtered = times.filter(time => time !== null);

    const bloodhoundParams =defaultParams(deviceId);

    bloodhoundParams.push({
        type: 'param',
        name: 'WakeupCount',
        value: filtered.length
    });

    filtered.forEach((time, i) => {
        bloodhoundParams.push({
            type: 'param',
            name: 'WakeupTime' + (i + 1),
            value: time
        });
    });

    bloodhoundParams.push({
        type: 'param',
        name: 'WakeupDays',
        value: days
    });

    const updatedWakeTimes = await fetchData(bloodhound.SET_WAKEUPS.query, bloodhound.SET_WAKEUPS.route, bloodhoundUrl, bloodhoundParams);

    return updatedWakeTimes;
};

const setTamper = async (deviceId, tamperState) => {
    const bloodhoundParams =defaultParams(deviceId);

    bloodhoundParams.push({
        type: 'param',
        name: 'TamperState',
        value: tamperState
    });

    const updatedTamperState = await fetchData(bloodhound.SET_TAMPER.query, bloodhound.SET_TAMPER.route, bloodhoundUrl, bloodhoundParams);

    return updatedTamperState;
};

/** GNSS quality and precision

We need to test these settings, but I would start at:

For general / normal wakeups
HDOP 1.00
GNSSQuality 1
GNSSTimeout 60

We frequently get HDOP 1.00 Quality 1 fixes in around 15 seconds, we stop looking once we meet the target, the 60 second
 timeout will usually be hit because the device cannot see the sky. Quality 1 is experimentally “the correct street/block”.

For tracking / locate wakeups
HDOP 1.00
GNSSQuality 2
GNSSTimeout 120 **/
const setGNSSQuality = async (deviceId, gnssQuality, gnssHDOP) => {
    const bloodhoundParams = defaultParams(deviceId);

    bloodhoundParams.push({
        type: 'param',
        name: 'GNSSQuality',
        value: gnssQuality || 1
    });

    bloodhoundParams.push({
        type: 'param',
        name: 'GNSSHDOP',
        value: gnssHDOP || 1.00
    });

    const updatedGNSSQuality = await fetchData(bloodhound.SET_GNSS_QUALITY.query, bloodhound.SET_GNSS_QUALITY.route, bloodhoundUrl, bloodhoundParams);

    return updatedGNSSQuality;
}
const setGNSSTimeout = async (deviceId, gnssTimeout) => {
    const bloodhoundParams = defaultParams(deviceId);

    bloodhoundParams.push({
        type: 'param',
        name: 'GNSSTimeout',
        value: gnssTimeout || 60
    });

    const updatedGNSSTimeout = await fetchData(bloodhound.SET_GNSS_TIMEOUT.query, bloodhound.SET_GNSS_TIMEOUT.route, bloodhoundUrl, bloodhoundParams);

    return updatedGNSSTimeout;
}

/**
 *
 * It is our recommendation that we reduce the Radio Timeout from 120 seconds back to 60 then reanalyse with a view to
 * reducing it further.  This will cut the amount of time devices that cannot get a connection spend trying.
 *
 * We also recommend that we reduce the Message timeout from 60 seconds to 30, again reanalyse with a view to reducing
 * it further.   This will cut the amount of time devices that connect and then have a broken connection spends waiting for the next message.
 *
 */
const setRadioTimeout = async (deviceId, radioTimeout) => {
    const bloodhoundParams = defaultParams(deviceId);

    bloodhoundParams.push({
        type: 'param',
        name: 'RadioTimeout',
        value: radioTimeout || 60
    });

    const updatedRadioTimeout = await fetchData(bloodhound.SET_RADIO_TIMEOUT.query, bloodhound.SET_RADIO_TIMEOUT.route, bloodhoundUrl, bloodhoundParams);

    return updatedRadioTimeout;
};

/**
 *
 * It is our recommendation that we reduce the Radio Timeout from 120 seconds back to 60 then reanalyse with a view to
 * reducing it further.  This will cut the amount of time devices that cannot get a connection spend trying.
 *
 * We also recommend that we reduce the Message timeout from 60 seconds to 30, again reanalyse with a view to reducing
 * it further.   This will cut the amount of time devices that connect and then have a broken connection spends waiting for the next message.
 *
 */
const setMessageTimeout = async (deviceId, messageTimeout) => {
    const bloodhoundParams = defaultParams(deviceId);

    bloodhoundParams.push({
        type: 'param',
        name: 'MessageTimeout',
        value: messageTimeout
    });

    const updatedMessageTimeout = await fetchData(bloodhound.SET_MESSAGE_TIMEOUT.query, bloodhound.SET_MESSAGE_TIMEOUT.route, bloodhoundUrl, bloodhoundParams);

    return updatedMessageTimeout;
};

const setOperatingMode = async (deviceId, operatingMode) => {
    const bloodhoundParams = defaultParams(deviceId);

    bloodhoundParams.push({
        type: 'param',
        name: 'OperatingMode',
        value: operatingMode
    });

    const updatedOperatingMode = await fetchData(bloodhound.SET_OPER_MODE.query, bloodhound.SET_OPER_MODE.route, bloodhoundUrl, bloodhoundParams);

    return updatedOperatingMode;
};

const setTrackingMode = async (deviceId, frequency = 0, trackingTime = 60) => {
    const bloodhoundParams =defaultParams(deviceId);

    bloodhoundParams.push({
        type: 'param',
        name: 'TrackingTime',
        value: trackingTime
    });

    bloodhoundParams.push({
        type: 'param',
        name: 'TrackingFrequency',
        value: frequency
    });

    const updatedTrackingMode = await fetchData(bloodhound.SET_TRACK_MODE.query, bloodhound.SET_TRACK_MODE.route, bloodhoundUrl, bloodhoundParams);

    return updatedTrackingMode;
};

module.exports = {
    getWakeTimes,
    setWakeTimes,
    setTamper,
    setOperatingMode,
    setTrackingMode,
    setGNSSQuality,
    setGNSSTimeout,
    setMessageTimeout,
    setRadioTimeout
};
