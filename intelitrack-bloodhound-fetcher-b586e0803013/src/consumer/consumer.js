const kafka = require('kafka-node');

const create = (topics, group, kafkaHost) => {
    const Consumer = kafka.ConsumerGroup;

    const options = {
        kafkaHost,
        group,
        sessionTimeout: 10000,
        protocol: ['roundrobin'],
        fromOffset: 'latest',
        commitOffsetsOnFirstJoin: true,
        outOfRangeOffset: 'earliest',
    };

    return new Consumer(options, topics)
};

const run = (consumer, logic) => {
  consumer.on('message', logic);

  consumer.on('error', function(err) {
    logger.error('kafka->', err);
  });

  consumer.on('offsetOutOfRange', function(err) {
    logger.error('error', err);
  });
};

module.exports = { create, run };
