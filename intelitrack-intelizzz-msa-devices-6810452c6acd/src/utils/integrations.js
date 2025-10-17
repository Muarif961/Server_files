const Request = require('request-promise-native');

const loggingLevel = process.env.LOGGING_LEVEL || 'basic';

const integrate = async (integrationData) => {
    const {mappedObject, integrations} = integrationData;
    const url = integrations[0].url;

    const headers = {
        'Content-Type': 'application/json'
    };

    if(loggingLevel === 'verbose') {
        logger.info('Performing Webhook Integration');
        logger.info('Integration URL: ', url);
        logger.info('Integration Data: ', JSON.stringify(mappedObject, null, 2));
    }

    if(!mappedObject || !url) return;

    if(integrations[0].token) {
        headers["Authorization"] = `Bearer ${integrations[0].token}`;
    }

    const options = {
        method: 'POST',
        headers: headers,
        url,
        json: true,
        timeout: 10000,
        resolveWithFullResponse: true,
        body: mappedObject
    };

    //console.log('Making request')
    return await Request(options)
        .then((response) => {
            //console.log('Response: ', response.statusCode);
            // console.log('Response: ', response);
            return response;
        })
        .catch((e) => {
            logger.error('Webhook Integration Error: ', e.code, e.message);
            logger.info('Webhook Request options: ', options);
            if (e.code === 'ETIMEDOUT') {
                logger.error('Webhook Request timed out, consider retrying.');
            }
            return e;
        });
}

module.exports = integrate;
