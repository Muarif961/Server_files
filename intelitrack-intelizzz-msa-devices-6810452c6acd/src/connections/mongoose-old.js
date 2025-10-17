const Mongoose = require('mongoose');
const logger = require('../utils/logger');

const databases = {
    DEVICE: {},
    GODMODE: {},
    USER: {},
};

const MONGO_ATLAS = process.env.MONGO_ATLAS;
const reconnectTimeout = process.env.RECONNECTION_TIMEOUT || 5000;

const getConnectionString = (database, atlas = false, printed = false) => {
    const { host, port, db, user, pass } = database;

    const connectionString = atlas ?
        `mongodb+srv://${user}:${pass}@${host}/${db}?retryWrites=true&w=majority` :
        `mongodb://${host}:${port}/${db}`;

    const printedConnectionString = atlas ?
        `mongodb+srv://****:****@${host}/${db}?retryWrites=true&w=majority` :
        `mongodb://${host}:${port}/${db}`;

    return printed ? printedConnectionString : connectionString;
};

const connections = {};

const connectToMongo = (database) => {
    const connectionString = getConnectionString(databases[database], MONGO_ATLAS);
    const printedConnectionString = getConnectionString(databases[database], MONGO_ATLAS, true);

    const connection = Mongoose.connect(connectionString, databases[database].options);

    // connection.on('connected', () => {
    //     logger.info(`Mongo connection established for ${database} at: ${printedConnectionString}`);
    // });

    // connection.on('error', (error) => {
    //     logger.error(`Mongo connection error for ${database}: ${error}`);
    //     logger.info(`Retrying connection to ${database} in ${reconnectTimeout/1000} seconds...`);
    //     setTimeout(() => {
    //         connectToMongo(database);
    //     }, reconnectTimeout);
    // });
    //
    // connection.on('disconnected', () => {
    //     logger.info(`Mongo connection disconnected for ${database}. Retrying connection to ${database} in ${reconnectTimeout/1000} seconds...`);
    //     setTimeout(() => {
    //         connectToMongo(database);
    //     }, reconnectTimeout);
    // });

    connections[database.toLowerCase()] = connection;
};

Object.keys(databases).forEach((database) => {
    databases[database].host = process.env[`MONGO_${database}_HOST`];
    databases[database].db = process.env[`MONGO_${database}_DB`];
    databases[database].port = process.env.MONGO_PORT;
    databases[database].options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    };
    databases[database].user = process.env[`MONGO_${database}_USER`];
    databases[database].pass = process.env[`MONGO_${database}_PASS`];

    if (!MONGO_ATLAS && (databases[database].user && databases[database].pass)) {
        databases[database].options.user = databases[database].user;
        databases[database].options.pass = databases[database].pass;
    }

    connectToMongo(database);
});

module.exports = connections;
