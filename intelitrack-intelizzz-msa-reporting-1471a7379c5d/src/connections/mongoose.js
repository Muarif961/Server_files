const Mongoose = require('mongoose');
const logger = require('../utils/logger');

const getConnectionString = (host, port, db) => `mongodb://${host}:${port}/${db}`;

const databases = {
    DEVICE: {},
    LOCATION: {},
    ALERTS: {},
    USER: {},
    REPORTS: {}
};

const connections = {};

Object.keys(databases).forEach(database => {
    databases[database].host = process.env[`MONGO_${database}_HOST`];
    databases[database].db = process.env[`MONGO_${database}_DB`];
    databases[database].port = process.env.MONGO_PORT;
    databases[database].options = {
        useNewUrlParser: true,
        user: process.env[`MONGO_${database}_USER`],
        pass: process.env[`MONGO_${database}_PASS`]
    };

    connections[database.toLowerCase()] = Mongoose.createConnection(getConnectionString(databases[database].host, databases[database].port, databases[database].db), databases[database].options);
    logger.info(`Setting up Mongo Connection for ${database.toLowerCase()} at: mongodb://${databases[database].host}:${databases[database].port}/${databases[database].db}`);

});

module.exports = connections;