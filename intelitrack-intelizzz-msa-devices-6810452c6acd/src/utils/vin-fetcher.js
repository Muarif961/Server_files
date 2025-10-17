const fetchData = require('../utils/fetch-data');

const CARMD_API_TOKEN = process.env.CARMD_API_TOKEN;
const CARMD_PARTNER_TOKEN = process.env.CARMD_PARTNER_TOKEN;
const CARMD_URL = process.env.CARMD_URL;
const UK_VEHICLEDATA_APIKEY = process.env.UK_VEHICLEDATA_APIKEY;
const UK_VEHICLEDATA_URL = process.env.UK_VEHICLEDATA_URL;

const fetchUS = async (vin) => {
    try {
        const params = [];

        params.push({
            type: 'param',
            name: 'vin',
            value: vin
        });

        const headers = {
            'Authorization': `Basic ${CARMD_API_TOKEN}`,
            'partner-token': CARMD_PARTNER_TOKEN
        };

        return await fetchData('decode', 'v3.0', CARMD_URL, params, headers);
    } catch (error) {
        logger.error('Error collecting US vin data: ', error);
        return null;
    }
};

const fetchUK = async (identifier, type) => {
    try {
        const params = [{
            type: 'param',
            name: 'v',
            value: 2
        }, {
            type: 'param',
            name: 'api_nullitems',
            value: 1
        }, {
            type: 'param',
            name: 'auth_apikey',
            value: UK_VEHICLEDATA_APIKEY
        }];

        const name = type === 'plate' ? 'key_VRM' : 'key_VIN';

        params.push({
            type: 'param',
            name: name,
            value: identifier
        });

        const res = await fetchData('VehicleData', 'api/datapackage', UK_VEHICLEDATA_URL, params);

        return res.Response;
    } catch (error) {
        logger.error('Error collecting UK vin data: ', error);
        return null;
    }
};

module.exports = {
    fetchUS, fetchUK
};
