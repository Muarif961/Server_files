require('../config/dotenv');
const async = require('async');
const Request = require('request-promise-native');
const DBConnection = require('../connections/mongoose');
const AlertHistory = require('../models/alert.model');

const logger = require('../utils/logger');
const Consumer = require('../consumer');

// Kafka Variables
const topic = process.env.KAFKA_TOPIC;
const group = process.env.KAFKA_GROUP;
const kafkaHost = process.env.KAFKA_URL;
const apiKey = process.env.GOOGLE_API_KEY;

logger.info(`Connecting to ${kafkaHost} with topic ${topic} under group ${group}.`);

const consumer = Consumer.create(topic, group, kafkaHost);

Consumer.run(consumer, async (payload) => {
    // console.log('Consumer running and received payload: ', payload);
    const data = JSON.parse(payload.value)[0];

    const foundDate = await getDatedRecord(data.deviceId, new Date(data.dateTime));

    // If no records exist for this tamper alert, then log it
    if(foundDate && foundDate.length === 0) {
        const location = data.alertType === 'tamper' ? await getLocation(data.latitude, data.longitude) : null;

        const alertHistoryObject = {
            deviceId: data.deviceId,
            accountId: data.accountId,
            groupId: data.groupId,
            type: data.alertType,
            tamperState: data.tamperState,
            batteryLevel: data.batteryLevel,
            dateTime: data.dateTime,
            latitude: data.latitude,
            longitude: data.longitude,
            location
        };

        // logger.info(`Tamper Object: ${JSON.stringify(tamperHistoryObject)}`);

        // TODO: Add to database
        AlertHistory.create(alertHistoryObject, (error, data) => {
            if (error) logger.error('Alert History Consumer Error => ', error);

            logger.info(data);
        });
    }
});

const getLocation = async (latitude, longitude) => {
    if(!latitude || !longitude) return '';

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;

    const options = {
        method: 'GET',
        url,
        json: true,
        timeout: 5000
    };

    return await Request(options)
        .then((response) => {
            let location = '';

            if(response.status === 'OK' && response.results.length > 0) {
                location = response.results[0].formatted_address ? response.results[0].formatted_address : '';
            }

            return location;
        })
        .catch((e) => {
            logger.error(e.error);
            return '';
        });
};

const getDatedRecord = async (deviceId, dateTime) => {
    return await AlertHistory.find({ deviceId, dateTime }, async (error, result) => {
        if(error) logger.error(error);
        return result;
    });
};

process.once('SIGINT', function () {
    async.each([consumer], function (consumer, callback) {
        consumer.close(true, callback);
    });
});