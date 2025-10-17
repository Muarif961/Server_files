require('../config/dotenv');
const async = require('async');
const DBConnection = require('../connections/mongoose');
const Tracking = require('../models/tracking.model');

const logger = require('../utils/logger');
const Consumer = require('../consumer');

const topic = process.env.KAFKA_TOPIC;
const group = process.env.KAFKA_GROUP;
const kafkaHost = process.env.KAFKA_URL;

logger.info(`Connecting to ${kafkaHost} with topic ${topic} under group ${group}.`);

const os = require('os');
const numCPUs = os.cpus().length;

const cluster = require('cluster');

const logic = async (payload) => {
    logger.info('PAYLOAD ', payload.value);
    // logger.info(`offset: ${payload.offset} : highWaterOffset: ${payload.highWaterOffset}`);

    const data = JSON.parse(payload.value);

    const foundData = []; //await getDatedRecord(data.deviceId, new Date(data.fixTime));

    const startTime = await getStartTime(data.deviceId);
    logger.info('Start Time: ', startTime);

    if(foundData && foundData.length === 0) {
        const options = { upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: false, overwrite: true };

        const locationMethod = data.gnss && data.gnss.GNSSValid > 0 ? 'gnss' : 'lbs';

        const trackingObject = {
            accountId: data.accountId,
            groupId: data.groupId,
            date: data[locationMethod].FixTime,
            startTime: data.startTime ? data.startTime : startTime,
            locationMethod,
            address: data.address,
            gnss: {},
            lbs: {},
        };

        if(data.gnss) {
            trackingObject.gnss = {
                latitude: data.gnss.Latitude,
                longitude: data.gnss.Longitude,
                altitude: data.gnss.Altitude,
                speed: data.gnss.Speed,
                direction: data.gnss.Direction,
                GNSSStatus: data.gnss.GNSSStatus,
                GNSSValid: data.gnss.GNSSValid,
                fixTime: data.gnss.FixTime
            }
        }

        if(data.lbs) {
            trackingObject.lbs = {
                latitude: data.lbs.Latitude,
                longitude: data.lbs.Longitude,
                signalStrength: data.lbs.SignalStrength,
                fixTime: data.lbs.FixTime
            }
        }

        const trackingRes = await Tracking.findOneAndUpdate({ _id: data.deviceId }, trackingObject, options);

        if(!trackingRes) {
            logger.error('Live Tracking Consumer Error');
            logger.info(`Logged data for device ${data.deviceId}`);
        }
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

const getDatedRecord = async (deviceId, fixTime) => {
    return await Tracking.find({ deviceId, fixTime }, async (error, result) => {
        if(error) logger.error(error);
        return result;
    });
};

const getStartTime = async (deviceId) => {
    const doc = await Tracking.findOne({ _id: deviceId });
    return doc && doc.startTime ? doc.startTime : null;
};

process.once('SIGINT', function () {
    async.each([consumer], function (consumer, callback) {
        consumer.close(true, callback);
    });
});
