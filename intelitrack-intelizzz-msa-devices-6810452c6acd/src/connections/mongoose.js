const Mongoose = require('mongoose');
const logger = require('../utils/logger');

const MONGO_HOST = process.env.MONGO_HOST;
const MONGO_PORT = process.env.MONGO_PORT;
const MONGO_DB = process.env.MONGO_DB;
const MONGO_ATLAS = process.env.MONGO_ATLAS;

const MONGO_CONNECTION_TIMEOUT = process.env.MONGO_CONNECTION_TIMEOUT || 60000;

const user = process.env.MONGO_USER;
const pass = process.env.MONGO_PASS;

const connectionString = MONGO_ATLAS
    ? `mongodb+srv://${user}:${pass}@${MONGO_HOST}/${MONGO_DB}?retryWrites=true&w=majority`
    : `mongodb://${user}:${pass}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`;

const printedConnectionString = MONGO_ATLAS
    ? `mongodb+srv://****:****@${MONGO_HOST}/${MONGO_DB}?retryWrites=true&w=majority`
    : `mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`;

const mongoOptions = {
    maxPoolSize: 50,
    minPoolSize: 5,
    connectTimeoutMS: 60000,
    socketTimeoutMS: 45000,
};

const connectToMongo = () => {
    return Mongoose.connect(connectionString, mongoOptions)
        .then(() => {
            logger.info(`Mongo connection established at: ${printedConnectionString}`);
        })
        .catch((error) => {
            logger.error(`Mongo connection error: ${error}`);
            logger.info(`Retrying connection in ${MONGO_CONNECTION_TIMEOUT / 1000} seconds...`);
            setTimeout(() => {
                connectToMongo();
            }, MONGO_CONNECTION_TIMEOUT);
        });
};

// Log connection setup and attempt to connect
logger.info(`Setting up Mongo Connection at: ${printedConnectionString}`);

module.exports = connectToMongo();
