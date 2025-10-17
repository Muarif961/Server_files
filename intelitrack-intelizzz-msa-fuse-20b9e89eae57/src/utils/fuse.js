const Request = require('request-promise-native');

/**
 * Gets a response object and plucks out specific properties to enable the creation of new objects
 * @param url
 * @param path
 * @param properties
 * @returns {Promise<T | {error: *, message: *}>}
 */
const pluck = async (url, path, properties = []) => {
    const options = {
        method: 'GET',
        url: url + path,
        json: true,
        timeout: 5000
    };

    const PluckedObj = await Request(options)
        .then((response) => {
            const returnObj = {};

            properties.forEach((property) => {
                returnObj[property.mapTo] = response[property.name];
            });

            return returnObj;
        })
        .catch((e) => {
            let propertiesString = properties.map((property) => property.mapTo);
            let message = e.error.errno === 'ECONNREFUSED' ? `Error connecting to service for properties ${propertiesString.join(', ')}` : e.message;
            const error = { error: e.statusCode, message: message };
            logger.error({ ...error, ...options});
            return error;
        });

    return PluckedObj;

};

module.exports = {
    pluck
};