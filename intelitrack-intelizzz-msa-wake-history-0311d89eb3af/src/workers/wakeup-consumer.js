require('../config/dotenv');
const async = require('async');
const DBConnection = require('../connections/mongoose');
const WakeHistory = require('../models/wakehistory.model');

const logger = require('../utils/logger');
const Consumer = require('../consumer');

// Kafka Variables
const topic = process.env.KAFKA_TOPIC;
const group = process.env.KAFKA_GROUP;
const kafkaHost = process.env.KAFKA_URL;

logger.info(`Connecting to ${kafkaHost} with topic ${topic} under group ${group}.`);

const consumer = Consumer.create(topic, group, kafkaHost);
Consumer.run(consumer, async (payload) => {
    const locationMethods = [];
    const data = JSON.parse(payload.value)[0];

    logger.info('PAYLOAD ', payload.value);
    logger.info(`offset: ${payload.offset} : highWaterOffset: ${payload.highWaterOffset}`);

    let gnssDate = data.gnss && data.gnss.FixTime ? new Date(data.gnss.FixTime) : null;
    let lbsDateAbs = data.lbs && data.lbs.FixTime ? new Date(data.lbs.FixTime) : null;

    // TODO: Find a better way of dealing with this:
    // Currently, both GPS and LBS data is provided, even if GPS was not available and LBS was. It will provide the LAST GPS data and datetime. Doing a simple time comparison
    // does not work because the LBS fixtime is a few seconds more recent than a GPS fixtime. Removing 60 seconds from the LBS data gives a 1 minute leeway if the GPS data is available
    // This might need to be fine tuned or a new way of working it out as it could provide inconsistent / incorrect results in some cases
    let lbsDate = lbsDateAbs ? new Date(lbsDateAbs - 60000) : null;

    if((gnssDate && lbsDate) && gnssDate >= lbsDate) locationMethods.push('gnss');
    if((gnssDate && lbsDate) && lbsDate >= gnssDate) locationMethods.push('lbs');

    // If we have GNSS, use that, otherwise, if no GNSS and we have LBS, use that, otherwise do nothing
    // if(data.gnss && data.gnss.Latitude !== null) locationMethods.push('gnss');
    // if(data.lbs && data.lbs.Latitude !== null) locationMethods.push('lbs');


    const foundDate = locationMethods.length > 0 ? await getDatedRecord(data.deviceId, new Date(data[locationMethods[0]].FixTime)) : null;

    if(locationMethods.length > 0 && foundDate && foundDate.length === 0) {
        const wakeHistoryObject = {
            deviceId: data.deviceId,
            accountId: data.accountId,
            groupId: data.groupId,
            date: data[locationMethods[0]].FixTime,
            tamperState: data[locationMethods[0]].TamperState,
            locationMethod: locationMethods[0],
            gnss: {},
            lbs: {},
        };

        if(data.gnss) {
            wakeHistoryObject.gnss = {
                latitude: data.gnss.Latitude,
                longitude: data.gnss.Longitude,
                altitude: data.gnss.Altitude,
                speed: data.gnss.Speed,
                direction: data.gnss.Direction,
                GNSSStatus: data.gnss.GNSSStatus,
                fixTime: data.gnss.FixTime
            }
        }

        if(data.lbs) {
            wakeHistoryObject.lbs = {
                latitude: data.lbs.Latitude,
                longitude: data.lbs.Longitude,
                signalStrength: data.lbs.SignalStrength,
                fixTime: data.lbs.FixTime
            }
        }

        logger.info('WAKE UP OBJECT => ', wakeHistoryObject);

        WakeHistory.create(wakeHistoryObject, (error, data) => {
            if(error) logger.error('Wake History Consumer Error => ', error);

            logger.info(data);
        });
    }

});

const getDatedRecord = async (deviceId, date) => {
    return await WakeHistory.find({ deviceId, date }, async (error, result) => {
        if(error) logger.error(error);
        return result;
    });
};

process.once('SIGINT', function () {
    async.each([consumer], function (consumer, callback) {
        consumer.close(true, callback);
    });
});