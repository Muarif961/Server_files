const Boom = require('@hapi/boom');
const jwt = require('jsonwebtoken');
const Tracking = require('../models/tracking.model');

const validOrigins = process.env.ORIGINS.split(',');

const verifyOrigin = (ctx) => {
    const origin = ctx.headers.origin;
    if(!originIsValid(origin)) return false;
    return origin;
};

const originIsValid = ( origin ) => {
    return validOrigins.indexOf( origin ) !== -1;
};

const sseTracking = async = (ctx) => {
    const decoded = jwt.verify(ctx.cookies.get('zzz'), JWT_SECRET);
    const accountId = decoded.accountId;

    const match = {
        'fullDocument.accountId': accountId
    };

    const pipeline = [
        {
            $match: match
        }
    ];

    ctx.set({
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': verifyOrigin(ctx)
    });

    ctx.status = 200;

    // Watch the tracking database for the matching account id
    Tracking.watch(pipeline).
    on('change', (data) => {
        let response = null;

        if(data.updateDescription && data.updateDescription.updatedFields) {
            response = data.updateDescription.updatedFields;
        }

        if(data.fullDocument) {
            response = data.fullDocument;
        }

        if(response) {
            ctx.sse.send(JSON.stringify({
                updated: true
            }));
            ctx.sse.sendEnd('', '', (data) => console.log(data));
        }
    });
};

const tracked = async (ctx) => {
    const {
        groups,
        accountId
    } = ctx.request.body;

    logger.info(JSON.stringify(ctx.request.body));

    const query = {
        accountId
    };

    // Only return results from within the last hour
    const lastHour = new Date();
    lastHour.setHours(lastHour.getHours()-1);
    query.startTime = { $gt: lastHour };

    logger.info('******: ', lastHour, JSON.stringify(query, null, 2));


    if(groups && groups.length >= 0) query.groupId = { $in: groups };

    const doc = await Tracking.find(query).sort({date: 'desc'});

    console.log('***** Result: ', JSON.stringify(doc, null, 2));

    ctx.body = doc;
};

/**
 * Used by the locator app
 * @param ctx
 * @returns {Promise<void>}
 */
const trackedById = async (ctx) => {
    const { deviceIds } = ctx.request.body;

    const query = { _id: { $in: deviceIds }};

    // Only return results from within the last hour
    const lastHour = new Date();
    lastHour.setHours(lastHour.getHours()-1);
    query.startTime = { $gt: lastHour };

    const doc = await Tracking.find(query).sort({date: 'desc'});

    ctx.body = doc;
};

const deleteTrackings = async (ctx, next) => {
    const [ accountId, userId ] = ctx.params.jwtdata.split(':');
    const deviceIds = ctx.request.body.ids;

    const DBObj = deviceIds.length > 0 ? await Tracking.remove({ accountId, _id: { $in: deviceIds }}) : [];

    ctx.body = {
        ids: deviceIds,
        status: 'success'
    }
};

const healthCheck = async (ctx, next) => {
    ctx.body = {status: 'success'};
}


module.exports = { sseTracking, tracked, trackedById, deleteTrackings, healthCheck };
