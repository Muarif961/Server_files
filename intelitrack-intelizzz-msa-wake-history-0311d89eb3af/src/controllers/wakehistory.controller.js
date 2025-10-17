const WakeHistory = require('../models/wakehistory.model');
const Boom = require('@hapi/boom');

// const devicesByAccount = async (ctx, next) => {
//     const accountId = parseInt(ctx.params.accountId);
//     logger.info(ctx.headers, ctx.request.body);
//
//     const DBObj = await Device.find({accountId});
//     if(!DBObj || DBObj.length === 0) throw Boom.notFound(`No devices for AccountId ${accountId} found`, { accountId, modelName: 'Device'});
//
//     logger.info('Result: ', DBObj);
//     ctx.body = wrapResponse('units', DBObj);
// };
//
// const devicesCount = async (ctx, next) => {
//     const accountId = parseInt(ctx.params.accountId);
//
//     const Count = await Device.countDocuments({ accountId });
//     // if(!Count) throw Boom.notFound(`Could not count devices as no devices for AccountId ${accountId} found`, { accountId, modelName: 'Device'});
//     logger.info('Result: ', Count);
//     ctx.body = wrapResponse('devices', Count);
// };

const allWakeHistory = async(ctx, next) => {
    const accountId = ctx.params.accountId;

    const wakeHistory = await WakeHistory.find({ accountId });
    if(!WakeHistory) throw Boom.notFound(`No location history available for AccountId ${accountId} found`, { accountId, modelName: 'WakeHistory'});

    ctx.body = wrapResponse('locations', wakeHistory);
};

const wakeHistoryByGroup = async(ctx) => {
    const {
        groups,
        accountId,
        startDate,
        endDate,
        tamper
    } = ctx.request.body;

    const query = {
        accountId
    };

    if(groups && groups.length >= 0) query.groupId = { $in: groups };

    if(startDate && endDate) {
        query.date = { $gte: new Date(startDate), $lte: new Date(endDate) }
    }

    if(tamper) {
        query.tamperState = 'Tamper';
    }

    const doc = await WakeHistory.find(query).sort({date: 'desc'});

    ctx.body = doc;
};

const updateGroup = async(ctx) => {
    const accountId = ctx.params.accountId;
    const { _id, groupId } = ctx.request.body;

    const doc = await WakeHistory.updateMany({ accountId, deviceId: _id }, { $set: { groupId }});

    ctx.body = wrapResponse('updated', doc.nModified);
};

const wrapResponse = (responseName, response) => {
    return {
        [responseName]: response,
        status: 'success'
    }
};

module.exports = {
    allWakeHistory, wakeHistoryByGroup, updateGroup
};


