const kafka = require('kafka-node');

const create = (topics, groupId, kafkaHost) => {
    logger.info('Creating consumer ...');
    const Consumer = kafka.ConsumerGroup;

    const options = {
        kafkaHost,
        groupId,
        sessionTimeout: 10000,
        protocol: ['roundrobin'],
        fromOffset: 'latest',
        commitOffsetsOnFirstJoin: true,
        outOfRangeOffset: 'earliest',

    };

    return new Consumer(options, topics)
};

const run = async (consumer, logic) => {
    consumer.on('message', logic);

    consumer.on('error', function(err) {
        logger.error('kafka->', err);
    });

    consumer.on('offsetOutOfRange', function(err) {
        logger.error('error', err);
    });
};

module.exports = { create, run };
