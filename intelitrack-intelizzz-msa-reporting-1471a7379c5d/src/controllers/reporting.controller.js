const Boom = require('@hapi/boom');
const Report = require('../models/report.model');
const moment = require('moment');
const { parseAsync } = require('json2csv');
const queue = require('../utils/queue');

const defaultReports = require('../config/default-reports');

/**
 * Pushes a report request onto the kafka queue
 * @param ctx
 * @returns {Promise<void>}
 */
const requestReport = async (ctx) => {
    const [ accountId, userId, parentId ] = ctx.params.jwtdata.split(':');
    const { type, name, range } = ctx.request.body;

    if(!defaultReports[type]) throw Boom.badRequest(`Error requesting report: invalid report type.`, { accountId, modelName: 'Report'});

    const report = defaultReports[type];

    const reportObject = {
        report: null,
        accountId,
        userId,
        name,
        category: report.category,
        type,
        fields: report.select.split(' ').map(field => field === '_id' ? report.category + 'Id' : field),
        status: 0,
        date: new Date()
    };

    // Create initial report record
    const doc = await Report.create(reportObject);

    let query = {};
    if(report.rangeName && range.from && range.to) {
        query[report.rangeName || 'date'] = `DD>=${moment(new Date(range.from)).format('YYYY-MM-DD')}:<=${moment(new Date(range.to)).add(1, 'd').format('YYYY-MM-DD')}`;
    }

    const reportRequest = {
        reportId: doc._id,
        name: name,
        accountId: accountId,
        userId: userId,
        parent: !parentId,
        category: report.category,
        query: { ...report.query, ...query },
        select: report.select,
        includeGroups: report.includeGroups,
        sortBy: report.sortBy
    };
    await queue(reportRequest);

    ctx.body = { reportId: doc._id, status: 'success' };
};

/**
 * Pushes a report request onto the kafka queue
 * @param ctx
 * @returns {Promise<void>}
 */
// const requestReport = async (ctx) => {
//     console.log(Report);
//
//     const [ accountId, userId, parentId ] = ctx.params.jwtdata.split(':');
//
//     if(!ctx.request.body || !accountId || !userId || !ctx.request.body.category || !ctx.request.body.query) {
//         throw Boom.badRequest(`Error requesting report: incorrect or missing query object.`, { accountId, modelName: 'Report'});
//     }
//
//     const reportObject = {
//         report: null,
//         accountId,
//         userId,
//         name: ctx.request.body.name,
//         fields: ctx.request.body.select.split(' ').map(field => field === '_id' ? ctx.request.body.category + 'Id' : field),
//         date: new Date()
//     };
//
//     // Create initial report record
//     const doc = await Report.create(reportObject);
//
//     const reportRequest = {
//         reportId: doc._id,
//         name: ctx.request.body.name,
//         accountId: accountId,
//         userId: userId,
//         parent: !parentId,
//         category: ctx.request.body.category,
//         query: ctx.request.body.query,
//         select: ctx.request.body.select,
//         includeGroups: ctx.request.body.includeGroups,
//         sortBy: ctx.request.body.sortBy
//     };
//     await queue(reportRequest);
//
//     ctx.body = { reportId: doc._id, status: 'success!!' };
// };

const downloadReport = async (ctx) => {
    const [ reportId, accountId, userId ] = ctx.params.reportid.split(':');

    const opts = { flatten: true };

    const doc = await Report.findOne({ _id: reportId });

    if(doc) {
        // opts.fields = doc.fields;

        const data = await parseAsync(doc.report, opts)
            .then(csv => csv)
            .catch(err => console.error(err));

        // console.log('DATA: ', data);

        ctx.set('Content-disposition', 'attachment; filename=' + doc.name + '.csv');
        ctx.set('Content-type', 'application/octet-stream');
        ctx.status = 200;
        ctx.body = data;
    } else {
        ctx.body = { 'message': 'No report found.', status: 'error' };
    }
};

const listReports = async (ctx) => {
    const [ accountId, userId, parentId ] = ctx.params.jwtdata.split(':');

    const reports = await Report.find({ accountId, userId })
        .select(['-userId', '-accountId', '-__v', '-report', '-fields'])
        .sort({ date:-1 });

    ctx.body = wrapResponse('reports', reports);
};

const wrapResponse = (responseName, response) => {
    return {
        [responseName]: response,
        status: 'success'
    }
};

module.exports = {
    requestReport,
    downloadReport,
    listReports
};


