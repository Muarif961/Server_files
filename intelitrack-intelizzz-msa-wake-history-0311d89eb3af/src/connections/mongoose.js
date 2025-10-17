const Mongoose = require('mongoose');
const logger = require('../utils/logger');

const MONGO_HOST = process.env.MONGO_HOST;
const MONGO_PORT = process.env.MONGO_PORT;
const MONGO_DB = process.env.MONGO_DB;

const user = process.env.MONGO_USER;
const pass = process.env.MONGO_PASS;

const connectionString = `mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`;

const mongoOptions = {
    useNewUrlParser: true
};

if(user && pass) {
    mongoOptions.user = user;
    mongoOptions.pass = pass;

}

logger.info(`Setting up Mongo Connection at: mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`);

module.exports = Mongoose.connect(connectionString, mongoOptions);