const queryGen = require('../../src/utils/query-generator');

// do stuff before anything else runs
beforeAll(async () => {
    console.log('Starting Jest ...');
});

// clean up after tests complete
afterAll(() => {
    console.log('Done testing.');
});

describe('mongo query generator', () => {
    test('simple query generation with one property with an equal to query', async () => {
        const result = queryGen('100', {
            name: '=Fred'
        });

        const expected = { accountId: '100', name: 'Fred' };
        expect(result).toEqual(expected);
    });
    test('simple query generation with one property with a not equal to query', async () => {
        const result = queryGen('100', {
            name: '!=Fred'
        });

        const expected = { accountId: '100', name: { $ne: 'Fred' } };
        expect(result).toEqual(expected);
    });
    test('simple query generation with one property with a greater than query', async () => {
        const result = queryGen('100', {
            amount: '>10'
        });

        const expected = { accountId: '100', amount: { $gt: '10' } };
        expect(result).toEqual(expected);
    });
    test('simple query generation with one property with a less than query', async () => {
        const result = queryGen('100', {
            amount: '<10'
        });

        const expected = { accountId: '100', amount: { $lt: '10' } };
        expect(result).toEqual(expected);
    });
    test('simple query generation with one property with a greater than and equal to query', async () => {
        const result = queryGen('100', {
            amount: '>=10'
        });

        const expected = { accountId: '100', amount: { $gte: '10' } };
        expect(result).toEqual(expected);
    });
    test('simple query generation with one property with a less than and equal to query', async () => {
        const result = queryGen('100', {
            amount: '<=10'
        });

        const expected = { accountId: '100', amount: { $lte: '10' } };
        expect(result).toEqual(expected);
    });
    test('simple query generation with several properties, one representing each query type', async () => {
        const result = queryGen('100', {
            name: '=Fred',
            amount: '<10',
            amount2: '>20',
            amount3: '<=100',
            amount4: '>=0'
        });

        const expected = {
            accountId: '100',
            name: 'Fred',
            amount: { $lt: '10' },
            amount2: { $gt: '20' },
            amount3: { $lte: '100' },
            amount4: { $gte: '0' },
        };

        expect(result).toEqual(expected);
    });
    test('simple query generation testing an and property with a split string (such as a date range)', async () => {
        const result = queryGen('100', {
            dateRange: '&&>=2004:<=2008'
        });

        const expected = { accountId: '100', dateRange: { '$gte': '2004', '$lte': '2008' } };

        expect(result).toEqual(expected);
    })
});