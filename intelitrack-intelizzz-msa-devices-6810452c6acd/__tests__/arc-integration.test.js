require('../src/config/dotenv');
const arcIntegration = require('../src/utils/arc-integration');
const performArcIntegration= arcIntegration.performArcIntegration;

// do stuff before anything else runs
beforeAll(async () => {
    console.log('Starting Jest ...');
});

// close the server after each test
afterAll(() => {
    console.log('Test ended.');
});

describe('testing arc integration', () => {
    test('test integration string response', async () => {
        const currentDeviceData = {
            pendingOperatingMode: 'Tracking',
            operatingMode: 'Normal',
            "battery": 39,
            "fwVersion": "V 1.6 031220",
            "lastWakeupTime": "2023-10-20T11:01:14.000Z",
            "wakeupTimes": [
                "11:00",
                null,
                null,
                null
            ],
            "frequency": 5,
            "pendingFrequency": null,
            "trackingStartTime": "2023-10-18T12:55:37.558Z",
            "plate": "V11ptd",
            "vehicleData": {
                "year": 2016,
                "make": "BENTLEY",
                "model": "MULSANNE SPEED V8 AUTO",
                "manufacturer": "BENTLEY",
                "engine": "6752",
                "trim": "V8 SPEED",
                "transmission": "Automatic",
                "colour": "BLACK"
            }
        }

        const data = {
            longitude: -1.1352575,
            latitude: 53.9767948,
            deviceId: '8946203804400132147',
            "tamperState": "Tamper",
            speed: 92,
            direction: 13,
        }

        const deviceInLocator = {
            crimeReference: '123456',
            userLocation: null,
            pocName: 'Bob Marley',
            pocEmail: '9U0Yf@example.com',
            pocTelephone: '0123456789',
            accountEmail: 'main_user@example.com'
        }

        const response = await performArcIntegration(data, deviceInLocator, currentDeviceData, false);
        console.log(response);
        // expect(response.statusCode).toEqual(200);
    });
});
