const Request = require('request-promise-native');

const fetchData = async (query, apiRoute, host, params, headers) => {
    let urlParams = '';
    let paramStarted = false;

    // Build the url parameters string
    params.forEach((param) => {
        // If it's a path type of param, add it to the url
        if (param.type === 'path') urlParams += `/${param.route}`;
        // If it's a url param, build the string out
        if (param.type === 'param') {
            urlParams += !paramStarted ? '?' : '&';
            urlParams += `${param.name}=${param.value}`;
            paramStarted = true;
        }
    });

    const url = `${host}/${apiRoute}/${query}${urlParams}`;
    // logger.info('Fetch URL: ', url);
    const options = {
        method: 'GET',
        url,
        json: true,
        timeout: 5000
    };

    if(headers) {
        options.headers = headers;
    }

    return await Request(options)
        .then((response) => {
            // logger.log('Response: ', response);
            return response;
        })
        .catch((e) => {
            logger.error('(fetchData) - Error Requesting URL: ', url);
            logger.error('(fetchData) - Error: ', e.error);
            return e.error;
        });
};

module.exports = fetchData;
