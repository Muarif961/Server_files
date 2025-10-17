/**
 * Queue Post to Kafka
 * @param producer
 * @param message
 * @param topic
 */
const queuePost = (producer, message, topic) => {
    const serialised = JSON.stringify(message);

    logger.info('serialised output : ', topic, ' - ', serialised);

    const payload = [
        {
            topic,
            messages: [serialised]
        }
    ];

    return producer.send(payload, (err, data) => {
        if (err) {
            logger.error(err);
            logger.error(`[kafka-producer -> ${topic}]: broker update failed`);
            return err;
        } else {
            logger.info(`[kafka-producer -> ${topic}]: broker update success`);
            logger.info(data);
            return data;
        }
    });
};

module.exports = queuePost;