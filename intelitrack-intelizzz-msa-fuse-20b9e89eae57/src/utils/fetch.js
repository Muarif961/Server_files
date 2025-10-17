const Request = require('request-promise-native');

const Fetch = async (url, method, body = {}) => {
    const options = {
        method,
        url,
        json: true,
        timeout: 5000
    };

    if(method === 'POST' || method === 'PUT') options.body = body;

    // console.log(options);

    return await Request(options)
        .then((response) => {
            return response;
        })
        .catch((e) => {
            logger.error(e.error);
            return e.error;
        });
};

module.exports = Fetch;