require('../config/dotenv');
const logger = require('../utils/logger');

const kafka = require('kafka-node');

const kafkaHost = process.env.KAFKA_URL;
const kafkaTopic = process.env.KAFKA_TOPIC;
const groupId = process.env.KAFKA_GROUP;

let cnt = 0;

try {
    const options = {
        kafkaHost,
        groupId,
        sessionTimeout: 15000,
        protocol: ['roundrobin'],
        fromOffset: 'latest',
        commitOffsetsOnFirstJoin: true,
        outOfRangeOffset: 'earliest',
    };

    const consumerGroup = new kafka.ConsumerGroup(options, [kafkaTopic]);

    consumerGroup.on('message',function(message) {
        cnt++;
        logger.info(
            `${this.client.clientId} read msg Topic=${message.topic} Partition=${message.partition} Offset=${message.offset}`
        );
    });
    consumerGroup.on('error', function(err) {
        logger.error('error', err);
    });
    // consumerGroup.on('offsetOutOfRange', function(err) {
    //     logger.error('error', err);
    // });

    console.log('Running kafka consumer ... ', kafkaTopic, kafkaHost, groupId);

}
catch(e) {
    logger.error('error', e);
}
