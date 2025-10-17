const Producer = require('../producer');

const KAFKA_REPORT_TOPIC = process.env.KAFKA_REPORT_TOPIC;
const KAFKA_URL = process.env.KAFKA_URL;

const producer = Producer.create(KAFKA_URL);

const queue = async (message) => {
    const serialised = JSON.stringify(message);

    logger.info('serialised output : ', KAFKA_REPORT_TOPIC, ' - ', serialised);

    const payload = [
        {
            topic: KAFKA_REPORT_TOPIC,
            messages: [serialised]
        }
    ];

    return producer.send(payload, (err, data) => {
        if (err) {
            logger.error(err);
            logger.error(`[kafka-producer -> ${KAFKA_REPORT_TOPIC}]: broker update failed`);
            return err;
        } else {
            logger.info(`[kafka-producer -> ${KAFKA_REPORT_TOPIC}]: broker update success`);
            logger.info(data);
            return data;
        }
    });
};

module.exports = queue;