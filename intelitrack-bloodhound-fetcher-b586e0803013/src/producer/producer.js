const kafka = require('kafka-node');

const create = (kafkaHost) => {
    const HighLevelProducer = kafka.HighLevelProducer;

    const options = {
        kafkaHost
    };

    const client = new kafka.KafkaClient(options);

    const producer = new HighLevelProducer(client);

    producer.on('error', (error) => {
        logger.error(`kafka-producer->`, error)
    });

    return producer;
};



module.exports = { create };