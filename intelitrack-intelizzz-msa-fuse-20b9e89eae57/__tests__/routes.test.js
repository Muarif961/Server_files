const request = require('supertest');
const server = require('../src/server/index');

// do stuff before anything else runs
beforeAll(async () => {
    console.log('Starting Jest ...');
});

// close the server after each test
afterAll(() => {
    server.close();
    console.log('Server closed.');
});

describe('basic route test for the template', () => {
    test('get initial route GET /', async () => {
        const response = await request(server).get('/');
        expect(response.status).toEqual(200);
        expect(response.body.message).toContain('Intelizzz MSA Template activated!');
    });
});