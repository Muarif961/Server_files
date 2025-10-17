const substring = (str, from) => str.substr(from, str.length);
const ne = (str) => ({ $ne: substring(str, 2) });
const eq = (str) => ({ $eq: substring(str, 2)});
const gt = (str) => ({ $gt: substring(str, 1) });
const lt = (str) => ({ $lt: substring(str, 1) });
const gte = (str, date = false) => ({ $gte: date ? new Date(substring(str, 2)) : substring(str, 2) });
const lte = (str, date = false) => ({ $lte: date ? new Date(substring(str, 2)) : substring(str, 2) });
const and = (str, date = false) => {
    const query = {};
    const queryStrings = substring(str, 2).split(':');
    const queries = [];
    // e.g. [ '>=10', '<<100' ]

    // Generate an array of queries from the split query string (eg: '>=10:<<100'
    queryStrings.forEach((qStr, i) => {
        const key = queryStrings[i].substr(0, 2);

        if(queryTyper.hasOwnProperty(key)){
            queries.push(queryTyper[key](queryStrings[i], date));
        }
    });

    // Go through each query and convert it to a property in the query object
    queries.forEach(q => {
        query[Object.keys(q)[0]] = q[Object.keys(q)[0]];
    });

    return query;
};
const date = (str) => {
    return and(str, true);
};

const queryTyper = {
    '!=': ne,
    '==': eq,
    '>=': gte,
    '<=': lte,
    '<<': lt,
    '>>': gt,
    '&&': and,
    'DD': date
};

/**
 * Generates a query based on query parameters sent in the following way:
 *
 * { name: '==value'  } produces { name: 'value' }
 * { name: '!=value' } produces { name: { $ne: 'value' } }
 * { name: '>value'  } produces { name: { $gt: 'value' } }
 * { name: '<value'  } produces { name: { $lt: 'value' } }
 * { name: '>=value' } produces { name: { $gte: 'value' } }
 * { name: '<=value' } produces { name: { $lte: 'value' } }
 * { name: '&&<=value:>=value' } produces { name: { $lte: 'value', $gte: value } }
 *
 * A property value without a name is added to the select statement
 * A property with a value and a name is added to the query and to the select statement
 *
 * @param accountId
 * @param props
 * @returns {{select: (string|string), query: {accountId: *}}|{query: {accountId: *}}}
 */
const generateQuery = (accountId, props) => {
    const query = {
        accountId
    };

    if(!props) return { query };

    Object.keys(props).forEach(prop => {

        const key = props[prop].substr(0, 2);

        if(queryTyper.hasOwnProperty(key)){
            query[prop] = queryTyper[key](props[prop]);
        }
    });

    return query;
};

module.exports = generateQuery;