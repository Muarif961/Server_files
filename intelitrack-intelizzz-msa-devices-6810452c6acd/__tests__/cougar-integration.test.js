const postData = require('../src/utils/arc-integration');

const cougarIntegrationURL = 'https://efep1.demo.monitor.equipment:9039/GenericLineHTTPS';

// do stuff before anything else runs
beforeAll(async () => {
    console.log('Starting Jest ...');
});

// close the server after each test
afterAll(() => {
    console.log('Test ended.');
});

describe('testing cougar integration', () => {
    test('test integration with POST /', async () => {
        const response = await postData(cougarIntegrationURL, [
            { name: 'SiteID',    value: '8946203804400013558' },
            { name: 'EventType', value: 'VehicleTracking' },
            { name: 'Event',     value: 'TrackingStarted' },
            { name: 'Long',      value: '-1.1352575'},
            { name: 'Lat',       value: '53.9767948' },
        ]);
        expect(response.statusCode).toEqual(200);
    });
});
