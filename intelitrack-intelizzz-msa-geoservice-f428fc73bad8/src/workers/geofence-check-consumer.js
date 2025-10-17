require('../config/dotenv');
const async = require('async');
const geolib = require('geolib');
const DBConnection = require('../connections/mongoose');
const Geofence = require('../models/geofence.model');
const GeofenceDevice = require('../models/geofence-device.model');

const logger = require('../utils/logger');
const Consumer = require('../consumer');
const Producer = require('../producer');
const queuePost = require('../utils/queue-post');

const topic = process.env.KAFKA_GEOSERVICE_TOPIC;
const group = process.env.KAFKA_GROUP;
const kafkaHost = process.env.KAFKA_URL;
const alertTopic = process.env.KAFKA_ALERT_TOPIC;

const producer = Producer.create(kafkaHost);

logger.info(`Connecting to ${kafkaHost} with topic ${topic} under group ${group}.`);

const os = require('os');
const numCPUs = os.cpus().length;

const cluster = require('cluster');

const logic = async (payload) => {
    logger.info('PAYLOAD ', payload.value);
    // logger.info(`offset: ${payload.offset} : highWaterOffset: ${payload.highWaterOffset}`);

    const data = JSON.parse(payload.value);

    const { latitude, longitude, deviceId, accountId, dateTime } = data;

    const geofenceIds = (await GeofenceDevice.find({ deviceId, accountId }).select('geofenceId -_id') || []).map(id => id.geofenceId);

    const geofences = await Geofence.find({ _id: { $in: geofenceIds }, accountId });

    if(geofences && geofences.length > 0) {
        geofences.forEach(fence => {
            let res;

            if(fence.type === 'circle') {
                res = geolib.isPointWithinRadius({ latitude, longitude }, fence.detail.center, fence.detail.radius);
            }

            if(fence.type === 'polygon' || fence.type === 'rectangle') {
                res = geolib.isPointInPolygon({ latitude, longitude }, fence.detail.path);
            }

            let geofenced = ((fence.inside && res) || (!fence.inside && !res)) ? true : false;

            if(geofenced) {
                const message = [
                    {
                        deviceId,
                        accountId,
                        latitude,
                        longitude,
                        alertType: 'geofence',
                        dateTime,
                        detail: { geofenceName: fence.name }
                    }
                ];

                queuePost(producer, message, alertTopic);
            }
        })
    }
};

// TODO: See if we can use node clustering with kafka
// if (cluster.isMaster) {
//     console.log(`This machine has ${numCPUs} CPUs.`);
//     for (let i = 0; i < numCPUs; i++) {
//         cluster.fork();
//     }
//
//     cluster.on("online", (worker) => {
//         console.log(`Worker ${worker.process.pid} is online`);
//     });
//
//     cluster.on("exit", (worker, code, signal) => {
//         console.log(`Worker ${worker.process.pid} died with code: ${code} and signal: ${signal}`);
//         console.log("Starting a new worker...");
//         cluster.fork();
//     });
//
// } else {
const consumer = Consumer.create(topic, group, kafkaHost);
Consumer.run(consumer, logic);
// }

// const getDatedRecord = async (deviceId, fixTime) => {
//     return await Tracking.find({ deviceId, fixTime }, async (error, result) => {
//         if(error) logger.error(error);
//         return result;
//     });
// };

process.once('SIGINT', function () {
    async.each([consumer], function (consumer, callback) {
        consumer.close(true, callback);
    });
});
