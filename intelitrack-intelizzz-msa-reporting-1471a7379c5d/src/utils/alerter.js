const Producer = require('../producer');

const KAFKA_TOPIC = process.env.KAFKA_ALERTER_TOPIC;
const KAFKA_URL = process.env.KAFKA_URL;

const producer = Producer.create(KAFKA_URL);

const sendAlert = async (type, message) => {
    const serialised = JSON.stringify({ type, message });

    logger.info('serialised output : ', KAFKA_TOPIC, ' - ', serialised);

    const payload = [
        {
            topic: KAFKA_TOPIC,
            messages: [serialised]
        }
    ];

    return producer.send(payload, (err, data) => {
        if (err) {
            logger.error(err);
            logger.error(`[kafka-producer -> ${KAFKA_TOPIC}]: broker update failed`);
            return err;
        } else {
            logger.info(`[kafka-producer -> ${KAFKA_TOPIC}]: broker update success`);
            logger.info(data);
            return data;
        }
    });
};

module.exports = { sendAlert };