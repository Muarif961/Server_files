require('../config/dotenv');
const async = require('async');

const logger = require('../utils/logger');
const Consumer = require('../consumer');
const sendEmail = require('../utils/emailer');

// Kafka Variables
const topic = process.env.KAFKA_ALERTER_TOPIC;
const group = process.env.KAFKA_ALERTER_GROUP;
const kafkaHost = process.env.KAFKA_URL;

logger.info(`Connecting to ${kafkaHost} with topic ${topic} under group ${group}.`);

const consumer = Consumer.create(topic, group, kafkaHost);

Consumer.run(consumer, async (payload) => {
    // console.log('ALERTER Consumer running and received payload: ', payload.value);
    const data = JSON.parse(payload.value);

    if(data.type === 'email') {
        sendEmail(data.message);
    }

});

process.once('SIGINT', function () {
    async.each([consumer], function (consumer, callback) {
        consumer.close(true, callback);
    });
});