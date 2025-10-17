const Device = require('../models/device.model');
const Locator = require('../models/locator.model');
const LocatorFound = require('../models/locator-found.model');
const LogAction = require('../models/log-action.model');

const Bloodhound = require('../utils/bloodhound');


const Boom = require('@hapi/boom');
const {addToBucket} = require("./locator.controller");

const MAX_WAKEUPS_LENGTH = 4;

const hdopGeneral = process.env.GNSS_HDOP_GENERAL || {};
const hdopTracking = process.env.GNSS_HDOP_TRACKING || {};

/**
 *
 * @param ctx
 * @returns {Promise<void>}
 */
const devicesById = async (ctx) => {
    const {accountId, deviceIds, groups, tracking} = ctx.request.body;

    const query = {
        accountId,

    };

    if (deviceIds && deviceIds.length > 0) query._id = {$in: deviceIds};
    if (groups && groups.length > 0) query.groupId = {$in: groups};
    if (tracking) query.operatingMode = 'Tracking';

    const doc = await Device.find(query);

    ctx.body = doc;
};

/**
 *
 * @param query
 * @param sortBy
 * @param sortDirection
 * @param skip
 * @param limit
 * @returns {Promise<*>}
 */
const devicesSortByField = async (query, sortBy = '_id', sortDirection = 'asc', skip = 0, limit = 150) => {
    // logger.info('Sorting by field: ', skip, limit);
    const direction = sortDirection === 'desc' ? -1 : 1;
    const sortByQuery = sortBy === 'wakeupTimesLength' ? 'wakeupTimes' : sortBy;
    let sort = {};

    if(sortByQuery !== 'wakeupTimes' && sortByQuery !== '_id') {
        sort[sortByQuery] = direction;
        sort._id = 1;
    }

    if(sortByQuery !== 'wakeupTimes' && sortByQuery === '_id') {
        sort._id = direction;
    }

    const count = await Device.countDocuments(query);
    const result = sortByQuery !== 'wakeupTimes' ? await Device.find(query).sort(sort).skip(skip).limit(limit)
    : await Device.aggregate([
            {$match: query},
            {
                $project: {
                    accountId: 1,
                    apn: 1,
                    battery: 1,
                    configure: 1,
                    createdAt: 1,
                    dateAssigned: 1,
                    favourite: 1,
                    fwVersion: 1,
                    gnssstatus: 1,
                    groupId: 1,
                    lastWakeupTime: 1,
                    model: 1,
                    name: 1,
                    operatingMode: 1,
                    pendingOperatingMode: 1,
                    pendingTamperState: 1,
                    pendingWakeupDays: 1,
                    pendingWakeupTimes: 1,
                    productionDate: 1,
                    radioStatus: 1,
                    retryDate: 1,
                    serverAddress: 1,
                    tags: 1,
                    tamperState: 1,
                    updatedAt: 1,
                    wakeupCount: 1,
                    wakeupDays: 1,
                    wakeupTimes: 1,
                    wakeupTimesLength: {
                        $size: {
                            $filter: {
                                input: "$wakeupTimes",
                                as: "item",
                                cond: { $ne: ["$$item", null] }
                            }
                        }
                    }
                }
            },
            {
                $sort: {
                    "wakeupTimesLength": direction
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ]);

    return ({ units: result, documentCount: count});
};

const devicesSortByNextWakeup = async (query, sortDirection, skip = 0, limit = 150) => {
    const direction = sortDirection === 'desc' ? -1 : 1;

    const count = await Device.countDocuments(query);

    const result = await Device.aggregate([
        {$match: query},
        {
            $addFields:
                {
                    'wakeupTimeStampsFiltered': {
                        $let: {
                            'vars': {
                                'wakeupTimeStampsConcat': {
                                    $let: {
                                        'vars': {
                                            'wakeupTimeStamps': {
                                                '$map': {
                                                    'input': '$wakeupTimes',
                                                    'as': 'time',
                                                    'in': {
                                                        $let: {
                                                            'vars': {
                                                                'enddate': {
                                                                    $dateFromParts: {
                                                                        year: new Date().getUTCFullYear(),
                                                                        month: new Date().getUTCMonth() + 1,
                                                                        day: new Date().getUTCDate(),
                                                                        // day: new Date().getDay(),
                                                                        hour: {
                                                                            $toInt: {"$arrayElemAt": [{$split: ['$$time', ':']}, 0]}
                                                                        },
                                                                        minute: {
                                                                            $toInt: {"$arrayElemAt": [{$split: ['$$time', ':']}, 1]}
                                                                        }
                                                                    }
                                                                }
                                                            },
                                                            'in': {
                                                                time: '$$time',
                                                                duration: {
                                                                    $divide: [{$subtract: ['$$enddate', new Date()]}, 3600000]
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            'wakeupTimeStamps2': {
                                                '$map': {
                                                    'input': '$wakeupTimes',
                                                    'as': 'time',
                                                    'in': {
                                                        $let: {
                                                            'vars': {
                                                                'enddate': {
                                                                    $dateFromParts: {
                                                                        year: new Date(Date.now() + (3600 * 1000 * 24)).getUTCFullYear(),
                                                                        month: new Date(Date.now() + (3600 * 1000 * 24)).getUTCMonth() + 1,
                                                                        day: new Date(Date.now() + (3600 * 1000 * 24)).getUTCDate(),
                                                                        // day: new Date().getDay(),
                                                                        hour: {
                                                                            $toInt: {"$arrayElemAt": [{$split: ['$$time', ':']}, 0]}
                                                                        },
                                                                        minute: {
                                                                            $toInt: {"$arrayElemAt": [{$split: ['$$time', ':']}, 1]}
                                                                        }
                                                                    }
                                                                }
                                                            },
                                                            'in': {
                                                                time: '$$time',
                                                                duration: {
                                                                    $divide: [{$subtract: ['$$enddate', new Date()]}, 3600000]
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        },
                                        'in': {
                                            $concatArrays: ['$$wakeupTimeStamps', '$$wakeupTimeStamps2']
                                        }
                                    }
                                }
                            },
                            'in': {
                                $filter: {
                                    'input': '$$wakeupTimeStampsConcat',
                                    'as': 'item',
                                    'cond': {
                                        $gte: ['$$item.duration', 0]
                                    }
                                }
                            }
                        }
                    }
                }
        },
        {$unwind: '$wakeupTimeStampsFiltered'},
        {$sort: {'wakeupTimeStampsFiltered.duration': 1}},
        {
            "$group": {
                "_id": "$_id",
                "alert": {$first: '$alert'},
                "alertDate": {$first: '$alertDate'},
                "apn": {$first: '$apn'},
                "battery": {$first: '$battery'},
                "configure": {$first: '$configure'},
                "activatedDate": {$first: 'activatedDate'},
                "fwVersion": {$first: '$fwVersion'},
                "favourite": {$first: '$favourite'},
                "model": {$first: '$model'},
                "operatingMode": {$first: '$operatingMode'},
                "pendingOperatingMode": {$first: '$pendingOperatingMode'},
                "pendingTamperState": {$first: '$pendingTamperState'},
                "pendingWakeupDays": {$first: '$pendingWakeupDays'},
                "pendingWakeupTimes": {$first: '$pendingWakeupTimes'},
                "productionDate": {$first: '$productionDate'},
                "radioStatus": {$first: '$radioStatus'},
                "serverAddress": {$first: '$serverAddress'},
                "tamperState": {$first: '$tamperState'},
                "wakeupDays": {$first: '$wakeupDays'},
                "wakeupTimes": {$first: '$wakeupTimes'},
                "accountId": {$first: '$accountId'},
                "name": {$first: '$name'},
                "groupId": {$first: '$groupId'},
                "gnssstatus": {$first: '$gnssstatus'},
                "wakeupTimeSorter": {"$first": "$wakeupTimeStampsFiltered.time"}
            }
        },
        {
            $sort: {
                'wakeupTimeSorter': direction,
                _id: 1,
            }
        },
        {$skip: skip},
        {$limit: limit},
    ]);

    return ({ units: result, documentCount: count});
};

const devicesSortByLastWakeup = async (query, sortDirection, skip = 0, limit = 150) => {
    const direction = sortDirection === 'desc' ? -1 : 1;

    const count = await Device.countDocuments(query);

    const result = await Device.aggregate([
        {$match: query},
        {
            $addFields: {
                // Add a field that converts null lastWakeupTime to a very old date for desc sort
                // or very new date for asc sort, ensuring nulls appear last
                lastWakeupTimeSorter: {
                    $cond: {
                        if: { $eq: ["$lastWakeupTime", null] },
                        then: direction === -1 ? new Date("1900-01-01") : new Date("2099-12-31"),
                        else: "$lastWakeupTime"
                    }
                }
            }
        },
        {
            $sort: {
                lastWakeupTimeSorter: direction,
                _id: 1
            }
        },
        {$skip: skip},
        {$limit: limit}
    ]);

    return ({ units: result, documentCount: count});
};

/**
 * Get all devices for a specific account id
 * @param ctx
 * @param next
 * @returns {Promise<void>}
 */
const devicesByAccount = async (ctx, next) => {
    const accountId = ctx.params.accountId;
    const groups = ctx.request.query.groups ? ctx.request.query.groups.split(',') : null;
    const favourite = ctx.request.query.favourite;
    const alert = ctx.request.query.alert;
    const operatingMode = ctx.request.query.operatingMode;
    const search = ctx.request.query.search ? decodeURIComponent(ctx.request.query.search) : null;
    const sortBy = ctx.request.query.sortby || 'wakeupTimes';
    const tags = ctx.request.query.tags ? ctx.request.query.tags.split(',') : null;
    const sortDirection = ctx.request.query.sortdirection || 'desc';
    const isChild = ctx.request.query.ischild;

    const skip = ctx.request.query.skip ? Number(ctx.request.query.skip) : undefined;
    const limit = ctx.request.query.limit ? Number(ctx.request.query.limit) : undefined;

    // logger.info('skip & limit: ', skip, limit)

    // logger.info('Query: ', groups);

    const query = {
        accountId
    };

    if(favourite) query.favourite = true;

    if(alert) query.alert = { $exists: true };

    if(operatingMode) query.operatingMode = operatingMode;

    if (search) query['$or'] = [
        {name: {'$regex': search, '$options': "i"}},
        {_id: {'$regex': search.replace(/[^\w]/gi, '')}},
    ];

    if (groups && groups.length > 0) {
        query.groupId = {$in: groups}
    }

    if(tags) query.tags = {$elemMatch: {$in:tags}};

    const getDevices = async (sortBy) => sortBy !== 'wakeupTimes' ? await devicesSortByField(query, sortBy, sortDirection, skip, limit) : await devicesSortByLastWakeup(query, sortDirection, skip, limit);

    const DBObj = isChild && (!groups || (groups && groups.length === 0)) ? [] : await getDevices(sortBy);

    ctx.body = {
        units: (DBObj && DBObj.units && DBObj.units.length > 0) || (DBObj && DBObj.length > 0) ? DBObj.units || DBObj : [],
        documentCount: DBObj.documentCount,
        status: 'success'
    }
};

/**
 *
 * @param ctx
 * @param next
 * @returns {Promise<void>}
 */
const devicesSortedByGroup = async (ctx, next) => {
    const accountId = ctx.params.accountId;
    const groups = ctx.request.query.groups ? ctx.request.query.groups.split(',') : null;
    const search = ctx.request.query.search ? decodeURIComponent(ctx.request.query.search) : null;
    const favourite = ctx.request.query.favourite;
    const alert = ctx.request.query.alert;
    const sortBy = ctx.request.query.sortby;
    const sortDirection = ctx.request.query.sortdirection;
    const direction = sortDirection === 'desc' ? -1 : 1;
    const groupNames = ctx.request.body.groupNames || [];

    // logger.info('Query: ', groups);

    const skip = ctx.request.query.skip ? Number(ctx.request.query.skip) : 0;
    const limit = ctx.request.query.limit ? Number(ctx.request.query.limit) : 150;

    const query = {
        accountId
    };

    if(favourite) query.favourite = true;

    if(alert) query.alert = { $exists: true };

    if (search) query['$or'] = [
        {name: {'$regex': search, '$options': "i"}},
        {_id: {'$regex': search.replace(/[^\w]/gi, '')}},
    ];

    if (groups && groups.length > 0) {
        query.groupId = {$in: groups}
    }

    const count = await Device.countDocuments(query);

    const DBObj = await Device.aggregate([
        {$match: query},
        {
            $addFields:
                {
                    "groupName": {
                        '$let': {
                            'vars': {
                                'groupName': {
                                    '$filter': {
                                        'input': groupNames,
                                        'as': 'n',
                                        'cond': {$eq: ['$$n._id', '$groupId']}
                                    }
                                }
                            },
                            'in': {
                                "$arrayElemAt": ['$$groupName.name', 0]
                            }
                        }
                    }
                }
        },
        {
            $sort: {
                'groupName': direction,
                _id: 1,
            }
        },
        {$skip: skip},
        {$limit: limit},
    ]);

    ctx.body = ({ units: DBObj, documentCount: count});
};

/**
 * Get all devices in config mode for a specific account id
 * @param ctx
 * @param next
 * @returns {Promise<void>}
 */
const configDevicesByAccount = async (ctx, next) => {
    const accountId = ctx.params.accountId;

    const query = {
        accountId,
        configure: true
    };

    const DBObj = await Device.find(query);

    ctx.body = wrapResponse('units', DBObj.length > 0 ? DBObj : []);
};

/**
 * Get a count of all devices for a specific account id
 * @param ctx
 * @param next
 * @returns {Promise<void>}
 */
const devicesCount = async (ctx, next) => {
    const accountId = ctx.params.accountId;
    const groups = ctx.request.query.groups ? ctx.request.query.groups.split(',') : null;
    // logger.info('Query: ', groups);

    const query = {
        accountId
    };

    if (groups && groups.length > 0) {
        query.groupId = {$in: groups}
    }

    const Count = await Device.countDocuments(query);
    // if(!Count) throw Boom.notFound(`Could not count devices as no devices for AccountId ${accountId} found`, { accountId, modelName: 'Device'});
    // logger.info('Result: ', Count);
    ctx.body = wrapResponse('devices', Count);
};

/**
 * Return the account id of a device
 * @param ctx
 * @param next
 * @returns {Promise<void>}
 */
const deviceData = async (ctx, next) => {
    const _id = ctx.params.deviceId;

    const DBObj = await (Device.find({_id}));
    if (!DBObj || DBObj.length === 0) throw Boom.notFound(`No devices under device ID ${_id} found`, {
        _id,
        modelName: 'Device'
    });

    // logger.info('Result: ', DBObj);
    // ctx.body = wrapResponse('accountId', DBObj[0].accountId);
    ctx.body = {
        accountId: DBObj[0].accountId,
        name: DBObj[0].name,
        groupId: DBObj[0].groupId,
        dateAssigned: DBObj[0].dateAssigned,
        lastWakeupTime: DBObj[0].lastWakeupTime,
        wakeupCountThreshold: DBObj[0].wakeupCountThreshold,
        lowThresholdAlert: DBObj[0].lowThresholdAlert,
        endOfLifeAlert: DBObj[0].endOfLifeAlert,
        tags: DBObj[0].tags,
        setHibernate: DBObj[0].setHibernate,
        notActivated: DBObj[0].notActivated,
        status: 'success'
    };
};


/**
 * Temporary function to be removed in the future (creates an initial device for dev purposes)
 * @param ctx
 * @param next
 * @returns {Promise<void>}
 */
const create = async (ctx, next) => {
    // TODO: REMOVE THIS FUNCTION ONCE INTEGRATION COMPLETE
    const deviceData = ctx.request.body;
    const DBObj = await (Device.create(deviceData, (err) => {
        logger.error(err);
    }));
    ctx.body = DBObj;
};

/**
 * Set wakeup times
 * @param ctx
 * @param next
 * @returns {Promise<void>}
 */
const updateWakeupTimes = async (ctx, next) => {
    // const accountId = ctx.params.accountId;
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const {times, _ids, signup, wakeupDays} = ctx.request.body;

    const logActionObj = {
        userId,
        accountId,
        parent: !!!parentId,
        category: 'DEVICE',
        action: 'UpdateWakeupTimes',
        data: JSON.stringify({
            times: times,
            days: wakeupDays,
            _ids
        }),
        date: new Date()
    };

    if (times.every(time => time === null)) {
        const errorMessage = `Error setting wake-up times. There must be at least one wake up time set.`
        logActionObj.error = errorMessage;
        logActionObj.success = false;
        await (LogAction.create(logActionObj));
        throw Boom.badRequest(errorMessage, {_ids, modelName: 'Device'});

    }

    times.sort((a, b) => {
        if(a < b) { return -1; }
        if(a > b) { return 1; }
        return 0;
    });

    const bulkOperation = Device.collection.initializeUnorderedBulkOp();

    // Set the times with bloodhound
    _ids.forEach(async (_id) => {
        // Set new wakeTimes via bloodhound
        const wakeTimes = await Bloodhound.setWakeTimes(_id, times, wakeupDays);
        if (wakeTimes.Result !== 'Success') {
            logActionObj.error = `Bloodhound: Error setting wakeup times object for ${_id}.`;
            logActionObj.success = false;
            await (LogAction.create(logActionObj));
            throw Boom.badRequest(`Error setting wakeup times object for ${_id}.`, {_id, modelName: 'Device'})
        }

    });

    _ids.forEach(async (_id) => {
        bulkOperation.find({_id, accountId})
            .update({
                $set: {
                    pendingWakeupTimes: times,
                    pendingWakeupDays: wakeupDays
                }
            });
    });

    bulkOperation.execute(async (err, result) => {
        if (err) {
            logActionObj.error = err;
            logActionObj.success = false;
        }

        if (!err) {
            logActionObj.success = true;
        }

        await (LogAction.create(logActionObj));
    });

    ctx.body = {
        data: _ids.map(_id => ({
            _id,
            pendingWakeupTimes: times,
            pendingWakeupDays: wakeupDays
        })),
        status: 'success'
    };
};

/**
 * Set wakeup days
 * @param ctx
 * @param next
 * @returns {Promise<void>}
 */
const updateWakeupDays = async (ctx, next) => {
    // const accountId = ctx.params.accountId;
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const {devices, wakeupDays} = ctx.request.body;

    const logActionObj = {
        userId,
        accountId,
        parent: !!!parentId,
        category: 'DEVICE',
        action: 'UpdateWakeupDays',
        data: JSON.stringify({
            devices: devices,
            days: wakeupDays,
        }),
        date: new Date()
    };

    const bulkOperation = Device.collection.initializeUnorderedBulkOp();

    // Set the times with bloodhound
    devices.forEach(async (device) => {
        // Set new wakeTimes via bloodhound
        const wakeTimes = await Bloodhound.setWakeTimes(device._id, device.wakeupTimes, wakeupDays);
        if (wakeTimes.Result !== 'Success') {
            logActionObj.error = `Bloodhound: Error setting wakeup times object for ${device._id}.`;
            logActionObj.success = false;
            await (LogAction.create(logActionObj));
            throw Boom.badRequest(`Error setting wakeup times object for ${device._id}.`, {_id: device._id, modelName: 'Device'})
        }

    });

    devices.forEach(async (device) => {
        bulkOperation.find({_id: device._id, accountId})
            .update({
                $set: {
                    pendingWakeupTimes: device.wakeupTimes,
                    pendingWakeupDays: wakeupDays
                }
            });
    });

    bulkOperation.execute(async (err, result) => {
        if (err) {
            logActionObj.error = err;
            logActionObj.success = false;
        }

        if (!err) {
            logActionObj.success = true;
        }

        await (LogAction.create(logActionObj));
    });

    ctx.body = {
        data: devices.map(device => ({
            _id: device._id,
            pendingWakeupTimes: device.wakeupTimes,
            pendingWakeupDays: wakeupDays
        })),
        status: 'success'
    };
};

// Checks for a valid device id
function validId(id) {
    const re = /^-?\d+\.?\d*$/;
    return id && id.length === 19 && re.test(String(id));
}

const assign = async (ctx, next) => {
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const _id = ctx.request.body._id.trim();
    const name = ctx.request.body.name;
    const dateAssigned = new Date();
    const setter = {
        accountId,
        pendingOperatingMode: 'Normal',
        operatingMode: 'Normal',
        configure: true,
        dateAssigned,
        hdopProcessEnabled: true,
        gnssQuality: hdopGeneral.GNSSQuality || 1,
        gnssHDOP: hdopGeneral.GNSSHDOP || 1.0,
        gnssTimeout: hdopGeneral.GNSSTimeout || 60
    };
    let DBObjWakeTimes;

    const logActionObj = {
        userId,
        accountId,
        parent: !!!parentId,
        category: 'DEVICE',
        action: 'AssignDevice',
        data: JSON.stringify({
            _id,
            name,
            dateAssigned
        }),
        date: new Date()
    };

    if (!validId(_id)) {
        logActionObj.success = false;
        logActionObj.error = `${_id} is an invalid device id.`;
        await (LogAction.create(logActionObj));
        throw Boom.badRequest(`${_id} is an invalid device id.`, {_id, modelName: 'Device'});
    }

    // If a name was supplied, add that to the set query
    if (name) {
        setter.name = name;
    }

    // logger.info(_id, setter);

    const DBObj = await Device.findOneAndUpdate({_id, accountId: {$in: [null, '444']}}, {$set: setter}, {new: true});
    if (!DBObj || DBObj.length === 0) {
        logActionObj.success = false;
        logActionObj.error = `The device ${_id} has already been assigned or does not exist. Please contact support.`;
        await (LogAction.create(logActionObj));
        throw Boom.notFound(`The device ${_id} has already been assigned or does not exist. Please contact support.`, {
            _id,
            modelName: 'Device'
        });
    }

    // Set device to Normal operating mode
    await Bloodhound.setOperatingMode(_id, 'Normal');

    await Bloodhound.setGNSSQuality(_id, hdopGeneral.GNSSQuality, hdopGeneral.GNSSHDOP);

    await Bloodhound.setGNSSTimeout(_id, hdopGeneral.GNSSTimeout);

    // Clear tamper alert on device
    await Bloodhound.setTamper(_id, 'On');

    // Get current wakeTimes
    const wakeTimes = await Bloodhound.getWakeTimes(_id);

    if (DBObj && wakeTimes) {
        const updateTimes = [];

        for (let i = 0; i < MAX_WAKEUPS_LENGTH; i++) {
            updateTimes.push(wakeTimes['WakeupTime' + (i + 1)] || null);
        }

        const wakeupDays = 'MTWTFSS';

        DBObjWakeTimes = await Device.findOneAndUpdate({
            _id,
            accountId
        }, {$set: {wakeupTimes: updateTimes, wakeupDays: wakeupDays}}, {new: true});

        await Bloodhound.setWakeTimes(_id, updateTimes, wakeupDays);
    }

    const responseObj = await DBObjWakeTimes ? await DBObjWakeTimes : await DBObj;

    if (!responseObj) {
        logActionObj.success = false;
        logActionObj.error = 'The device has already been assigned or does not exist. Please contact support.';
    } else {
        logActionObj.success = true;
    }

    await (LogAction.create(logActionObj));

    //console.log('Object: ', DBObj);

    ctx.body = await responseObj ? await responseObj :
        wrapResponse('message', 'The device has already been assigned or does not exist. Please contact support.');
};

const activateDevice = async (ctx, next) => {
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const _id = ctx.request.body._id ? ctx.request.body._id.trim() : null;
    const clear = ctx.request.body.clear;
    const retry = ctx.request.body.retry;
    const lbsRetry = ctx.request.body.lbsRetry;
    const activatedDate = clear ? null : new Date();
    const retryDate = retry ? new Date() : null;

    const setter = {activatedDate};

    if (retryDate) {
        setter.retryDate = retryDate;
    }

    if (lbsRetry) {
        setter.lbsRetry = true;
    }

    const logActionObj = {
        userId,
        accountId,
        parent: !!!parentId,
        category: 'DEVICE',
        action: 'ActivateDevice',
        data: JSON.stringify({
            _id,
            activatedDate
        }),
        date: new Date()
    };

    if (!validId(_id)) {
        logActionObj.success = false;
        logActionObj.error = `${_id} is an invalid device id.`;
        await (LogAction.create(logActionObj));
        throw Boom.badRequest(`${_id} is an invalid device id.`, {_id, modelName: 'Device'});
    }

    const DBObj = await Device.findOneAndUpdate({_id, accountId}, {$set: setter}, {new: true});
    if (!DBObj || DBObj.length === 0) {
        logActionObj.success = false;
        logActionObj.error = `The device ${_id} has already been assigned or does not exist. Please contact support.`;
        await (LogAction.create(logActionObj));
        throw Boom.notFound(`The device ${_id} has already been assigned or does not exist. Please contact support.`, {
            _id,
            modelName: 'Device'
        });
    }

    await (LogAction.create(logActionObj));

    ctx.body = wrapResponse(['result'], {_id, activatedDate, retryDate});
};

const setTamperState = async (ctx, next) => {
    // const accountId = ctx.params.accountId;
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const {_ids, tamperState} = ctx.request.body;
    const logActionObj = {
        userId,
        accountId,
        parent: !!!parentId,
        category: 'DEVICE',
        action: 'SetTamperState',
        data: JSON.stringify({
            _ids,
            tamperState: tamperState
        }),
        date: new Date()
    };

    const bulkOperation = Device.collection.initializeUnorderedBulkOp();

    _ids.forEach(async (_id) => {
        const tamper = await Bloodhound.setTamper(_id, tamperState);
        if (tamper.Result !== 'Success') {
            logActionObj.error = `Bloodhound: Error setting tamper state for ${_id}.`;
            logActionObj.success = false;
            await (LogAction.create(logActionObj));
            throw Boom.badRequest(`Error setting tamper state for ${_id}.`, {_id, modelName: 'Device'})
        }
    });

    _ids.forEach(async (_id) => {
        bulkOperation.find({_id, accountId})
            .update({$set: {pendingTamperState: tamperState}});
    });

    bulkOperation.execute(async (err, result) => {
        if (err) {
            logActionObj.error = err;
            logActionObj.success = false;
        }

        if (!err) {
            logActionObj.success = true;
        }

        await (LogAction.create(logActionObj));
    });

    ctx.body = {data: _ids.map(_id => ({_id, pendingTamperState: tamperState})), status: 'success'};
};

const setOperatingMode = async (ctx, next) => {
    // const accountId = ctx.params.accountId;
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const {_ids, operatingMode, frequency} = ctx.request.body;
    const gnssSettings = operatingMode === 'Tracking' ? hdopTracking : hdopGeneral;

    const gnssHDOPOptions = {
        hdopProcessEnabled: true,
        gnssQuality: gnssSettings.GNSSQuality || 1,
        gnssHDOP: gnssSettings.GNSSHDOP || 1.00,
        gnssTimeout: gnssSettings.GNSSTimeout || 60
    }

    const logActionObj = {
        userId,
        accountId,
        parent: !!!parentId,
        category: 'DEVICE',
        action: 'SetOperatingMode',
        data: JSON.stringify({
            _ids,
            operatingMode: operatingMode,
            frequency: frequency,
            ...gnssHDOPOptions,
        }),
        date: new Date()
    };

    const bulkOperation = Device.collection.initializeUnorderedBulkOp();

    _ids.forEach(async (_id) => {
        const mode = operatingMode === 'Tracking' ? await Bloodhound.setTrackingMode(_id, frequency) : await Bloodhound.setOperatingMode(_id, operatingMode);
        if (mode.Result !== 'Success') {
            logActionObj.error = `Bloodhound: Error setting operating mode for ${_id}.`;
            logActionObj.success = false;
            await (LogAction.create(logActionObj));
            throw Boom.badRequest(`Error setting operating mode for ${_id}.`, {_id, modelName: 'Device'})
        }
        const gnssQuality = await Bloodhound.setGNSSQuality(_id, gnssHDOPOptions.gnssQuality, gnssHDOPOptions.gnssHDOP);
        if (gnssQuality.Result !== 'Success') {
            logActionObj.error = `Bloodhound: Error setting GNSSQuality for ${_id}.`;
            logActionObj.success = false;
            await (LogAction.create(logActionObj));
            throw Boom.badRequest(`Error setting GNSSQuality for ${_id}.`, {_id, modelName: 'Device'})
        }
        const gnssTimeout = await Bloodhound.setGNSSTimeout(_id, gnssHDOPOptions.gnssTimeout);
        if (gnssTimeout.Result !== 'Success') {
            logActionObj.error = `Bloodhound: Error setting GNSSTimeout for ${_id}.`;
            logActionObj.success = false;
            await (LogAction.create(logActionObj));
            throw Boom.badRequest(`Error setting GNSSTimeout for ${_id}.`, {_id, modelName: 'Device'})
        }
    });

    _ids.forEach(async (_id) => {
        bulkOperation.find({_id, accountId})
            .update({$set: {pendingOperatingMode: operatingMode, pendingFrequency: frequency ? frequency : null}});
    });

    await bulkOperation.execute(async (err, result) => {
        if (err) {
            logActionObj.error = err;
            logActionObj.success = false;
        }

        if (!err) {
            logActionObj.success = true;
        }

        await (LogAction.create(logActionObj));
    });

    ctx.body = {data: _ids.map(_id => ({_id, pendingOperatingMode: operatingMode})), status: 'success'};
};

/**
 * Return the pending states of a device
 * @param ctx
 * @param next
 * @returns {Promise<void>}
 */
const pending = async (ctx, next) => {
    const _id = ctx.params.deviceId;

    const DBObj = await Device.findOne({_id});
    if (!DBObj || DBObj.length === 0) throw Boom.notFound(`No devices under device ID ${_id} found`, {
        _id,
        modelName: 'Device'
    });

    ctx.body = {pendingOperatingMode: DBObj.pendingOperatingMode, status: 'success'};
};

const setGroup = async (ctx, next) => {
    // const accountId = ctx.params.accountId;
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const {_ids, groupId} = ctx.request.body;

    const logActionObj = {
        userId,
        accountId,
        parent: !!!parentId,
        category: 'DEVICE',
        action: 'SetGroup',
        data: JSON.stringify({
            _ids: _ids && _ids.length > 0 && _ids.length > 10 ? [..._ids.slice(0, 10), '...'] : _ids,
            group: groupId
        }),
        date: new Date()
    };

    const bulkOperation = Device.collection.initializeUnorderedBulkOp();

    _ids.forEach(async (_id) => {
        bulkOperation.find({_id, accountId})
            .update({$set: {groupId}});
    });

    bulkOperation.execute(async (err, result) => {
        if (err) {
            logActionObj.error = err;
        }

        if (!err) {
            logActionObj.success = true;
        }

        await (LogAction.create(logActionObj));
    });

    ctx.body = {data: _ids.map(_id => ({_id, groupId})), status: 'success'};
};

const updateDevice = async (ctx, next) => {
    // const accountId = ctx.params.accountId;
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const {_id, _ids, name, wakeupCountThreshold} = ctx.request.body;
    const logActionObj = {
        userId,
        accountId,
        parent: !!!parentId,
        category: 'DEVICE',
        action: 'Update',
        date: new Date()
    };

    const logActionData = {};

    if(_id) {
        logActionData._id = _id;
    }

    if(_ids && _ids.length >= 1) {
        logActionData._ids = _ids;
    }

    const docs = _id ? await Device.find({_id: {$in: _id}, accountId}) : await Device.find({_id: {$in: _ids}, accountId});
    const updated = [];

    for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        if (name || name === '') {
            logActionData.newName = name;
            logActionData.oldName = doc.name;
            doc.name = name;
            updated.push('name');
        }

        if (wakeupCountThreshold || wakeupCountThreshold === 0) {
            logActionData.newwakeupCountThreshold = wakeupCountThreshold;
            logActionData.oldwakeupCountThreshold = doc.wakeupCountThreshold;

            doc.wakeupCountThreshold = wakeupCountThreshold;
            doc.lowThresholdAlert = false;
            updated.push('wakeupCountThreshold');
        }
        // save changes for each document
        await doc.save();
    }
    logActionObj.data = JSON.stringify(logActionData);
    logActionObj.success = true;

    try {
        const logRes = await LogAction.create(logActionObj);
        if(!logRes) {
            logger.error('Error creating logaction. ', logActionObj);
        }
    } catch (error) {
        logger.error('Error creating logaction when updating device: ', error, logActionObj);
    }

    const retObj = _id ? {} : [];

    if(_id) {
        retObj._id = _id;
        updated.forEach(update => {
            retObj[update] = docs[update];
        });
    }

    if(_ids) {
        const innerRetObj = {};

        updated.forEach(update => {
            innerRetObj[update] = docs[0][update];
        });

        _ids.forEach(id => {
            retObj.push({
                _id: id,
                ...innerRetObj,
            })
        })
    }

    ctx.body = {data: _id ? [retObj] : retObj, status: 'success'};
};

const updateThresholdById = async (ctx, next) => {
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const ids = ctx.request.body.ids;
    const wakeupCountThreshold = ctx.request.body.wakeupCountThreshold;
    const query = ctx.request.body.query

    const logActionObj = {
        userId,
        accountId,
        parent: !!!parentId,
        category: 'DEVICE',
        action: 'UpdateById',
        date: new Date()
    };

    const logActionData = {};

    if(query) {
        logActionData.query = query;
        logActionData.wakeupCountThreshold = wakeupCountThreshold;
        logActionData.noIdsError = ids.length <= 0;
    }

    const DataObj = ids.length > 0 ? await Device.updateMany({_id: {$in: ids}, accountId}, { $set: { wakeupCountThreshold: wakeupCountThreshold}}) : null;

    logActionObj.data = JSON.stringify(logActionData);
    logActionObj.success = !!DataObj;

    await (LogAction.create(logActionObj));

    ctx.body = { status: 'success' };
}

const unsetGroup = async (ctx, next) => {
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const groupIds = ctx.request.body.groupIds || [];
    const logActionObj = {
        userId,
        accountId,
        parent: !!!parentId,
        category: 'DEVICE',
        action: 'UnsetGroup',
        data: JSON.stringify({
            groupIds
        }),
        date: new Date()
    };

    if ((!accountId || !userId) || parentId) {
        logActionObj.error = `Unauthorised to remove device groups`;
        logActionObj.success = false;
        await (LogAction.create(logActionObj));
        throw Boom.forbidden('Unauthorised to remove device groups', {groupIds, accountId, modelName: 'Device'});
    }

    const bulkOperation = Device.collection.initializeUnorderedBulkOp();

    groupIds.forEach(async (groupId) => {
        bulkOperation.find({groupId, accountId})
            .update({$set: {groupId: null}});
    });

    if (groupIds.length > 0) bulkOperation.execute(async (err, result) => {
        if (err) {
            logActionObj.error = err;
        }

        if (!err) {
            logActionObj.success = true;
        }

        await (LogAction.create(logActionObj));
    });

    ctx.body = wrapResponse(['groupIds'], {groupIds});
};

const getRecoveryCode = async (ctx, next) => {
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const deviceId = ctx.request.body.deviceId;
    const logActionObj = {
        userId,
        accountId,
        parent: !!!parentId,
        category: 'DEVICE',
        action: 'GetRecoveryCode',
        date: new Date()
    };

    if (!deviceId) {
        logActionObj.error = 'Invalid or missing device id';
        logActionObj.success = false;
        await (LogAction.create(logActionObj));
        throw Boom.badRequest('Invalid or missing device id', {deviceId, accountId, modelName: 'Device'});
    }

    const code = Math.floor(1000 + Math.random() * 9000);

    const DBObj = await Device.findOneAndUpdate({
        _id: deviceId,
        accountId
    }, {$set: {recoveryCode: code.toString(), stolenState: 1 }}, {new: true});
    if (!DBObj || DBObj.length === 0) {
        logActionObj.error = `No devices under device ID ${deviceId} found`;
        logActionObj.success = false;
        await (LogAction.create(logActionObj));
        throw Boom.notFound(`No devices under device ID ${deviceId} found`, {deviceId, modelName: 'Device'});
    }

    await addToBucket(ctx);

    logActionObj.success = true;
    logActionObj.data = JSON.stringify({
        deviceId,
        recoveryCode: code.toString(),
        stolenState: 1,
    });

    await (LogAction.create(logActionObj));

    ctx.body = wrapResponse(['device'], {deviceId, recoveryCode: code.toString(), stolenState: 1});
};

const clearRecoveryCode = async (ctx, next) => {
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const deviceId = ctx.request.body.deviceId;
    const stolenState = ctx.request.body.cancel ? 0 : 2;
    const cancel = ctx.request.body.cancel;

    const gnssHDOPOptions = {
        hdopProcessEnabled: true,
        gnssQuality: hdopGeneral.GNSSQuality || 1,
        gnssHDOP: hdopGeneral.GNSSHDOP || 1.00,
        gnssTimeout: hdopGeneral.GNSSTimeout || 60
    };

    const logActionObj = {
        userId,
        accountId,
        parent: !!!parentId,
        category: 'DEVICE',
        action: 'ClearRecoveryCode',
        data: JSON.stringify({
            deviceId,
            stolenState,
            ...gnssHDOPOptions
        }),
        date: new Date()
    };

    const foundDate = new Date();

    if (!deviceId) {
        logActionObj.error = 'Invalid or missing device id';
        logActionObj.success = false;
        await (LogAction.create(logActionObj));
        throw Boom.badRequest('Invalid or missing device id', {deviceId, accountId, modelName: 'Device'});
    }

    const DBObj = await Device.findOneAndUpdate({
        _id: deviceId,
        accountId
    }, {$unset: { recoveryCode: null }, $set: { stolenState, foundDate: stolenState === 2 ? new Date() : null, ...gnssHDOPOptions }}, {new: true});
    if (!DBObj || DBObj.length === 0) {
        logActionObj.error = `No devices under device ID ${deviceId} found`;
        logActionObj.success = false;
        await (LogAction.create(logActionObj));
        throw Boom.notFound(`No devices under device ID ${deviceId} found`, {deviceId, modelName: 'Device'});
    }

    if(stolenState === 2) {
        try {
            const foundInsert = {
                deviceId: DBObj._id,
                assigneeId: DBObj.assigneeId,
                accountId: DBObj.accountId,
                crimeReference: DBObj.crimeReference,
                userLocation: DBObj.userLocation,
                dateAssigned: DBObj.dateAssigned,
                dateCreated: DBObj.dateCreated,
                foundDate: foundDate,
            }
            const FoundDevice = await LocatorFound.create(foundInsert);
        } catch (e) {
            logger.error(e);
        }
    }

    if(cancel) {

        // Remove from Locator bucket
        await Locator.deleteMany({_id: deviceId});
    }

    // Clear the locate mode (set it to normal operating mode)
    try {
        const res = await Bloodhound.setOperatingMode(deviceId, 'Normal');
        logger.info('Setting Operating Mode response: ', res);
    } catch (e) {
        logger.error('Error setting operating mode: ', e);
    }

    // Revert back to general GNSS Quality
    try {
        const gnssQuality = await Bloodhound.setGNSSQuality(deviceId, hdopGeneral.GNSSQuality, hdopGeneral.GNSSHDOP);
        const gnssTimeout = await Bloodhound.setGNSSTimeout(deviceId, hdopGeneral.GNSSTimeout);
        logger.info('Setting GNSS Quality responses: ', gnssQuality, gnssTimeout);
    } catch (e) {
        logger.error('Error setting GNSS Quality: ', e);
    }

    logActionObj.success = true;
    await (LogAction.create(logActionObj));

    ctx.body = wrapResponse(['device'], {deviceId, stolenState});
};

const resetDevices = async (ctx, next) => {
    const [accountId, userId] = ctx.params.jwtdata.split(':');
    const deviceIds = ctx.request.body.ids;

    const logActionObj = {
        userId,
        accountId,
        category: 'DEVICE',
        action: 'ResetDevice',
        data: JSON.stringify({
            deviceIds
        }),
        date: new Date()
    };

    const DBObj = deviceIds.length > 0 ? await Device.updateMany({
        accountId,
        _id: {$in: deviceIds}
    }, {
        $set: {
            accountId: null,
            groupId: null,
            name: "",
            configure: false,
            pendingOperatingMode: null,
            pendingWakeupTimes: null,
            pendingTamperState: null,
            pendingWakeupDays: null,
            retryDate: null,
        },
        $unset: {
            dateAssigned: null,
            activatedDate: null,
            lbsRetry: null,
            lowThresholdAlert: null,
            endOfLifeAlert: null,
        }
    }) : [];

    logActionObj.success = true;
    await (LogAction.create(logActionObj));

    ctx.body = {
        ids: deviceIds,
        status: 'success'
    }
};

const updateTags = async (ctx) => {
    const [accountId, userId] = ctx.params.jwtdata.split(':');
    const deviceIds = ctx.request.body._ids;
    const tags = ctx.request.body.tags;

    const logActionObj = {
        userId,
        accountId,
        category: 'DEVICE',
        action: 'UpdateDeviceTags',
        data: JSON.stringify({
            _ids: deviceIds && deviceIds.length > 0 && deviceIds.length > 10 ? [...deviceIds.slice(0, 10), '...'] : deviceIds,
            tags
        }),
        date: new Date()
    };

    const DBObj = deviceIds.length > 0 ? await Device.updateMany({
        accountId,
        _id: {$in: deviceIds}
    }, {
        $set: {
            tags
        }
    }) : [];

    logActionObj.success = true;
    await (LogAction.create(logActionObj));

    ctx.body = {
        ids: deviceIds,
        tags,
        status: 'success'
    }
}

const tagCount = async (ctx) => {
    const [accountId, userId] = ctx.params.jwtdata.split(':');
    const tags = ctx.request.body.tags;

    const counts = await Promise.all(
        tags.map(tag => Device.countDocuments({ accountId, tags: {$elemMatch: {$in:[tag]}} }).then(res => ({ _id: tag, count: res})))
    );

    ctx.body = { counts: counts, status: 'success' }
}

const filterCount = async (ctx) => {
    const [accountId, userId] = ctx.params.jwtdata.split(':');

    const favouriteCounts = await Device.countDocuments({ accountId, favourite: true });
    const alertCounts = await Device.countDocuments({ accountId, alert: { $exists: true }});

    ctx.body = { counts: {favourite: favouriteCounts, alert: alertCounts}, status: 'success' };
}

const clearAlert = async (ctx, next) => {
    const [accountId, userId] = ctx.params.jwtdata.split(':');
    const deviceIds = ctx.request.body.ids;

    // TODO: Decide what endpoints to log in LogAction
    // const logActionObj = {
    //     userId,
    //     accountId,
    //     category: 'DEVICE',
    //     action: 'ClearAlert',
    //     data: JSON.stringify({
    //         deviceIds
    //     }),
    //     date: new Date()
    // };

    const DBObj = deviceIds.length > 0 ? await Device.updateMany({
        accountId,
        _id: {$in: deviceIds}
    }, {
        $unset: {
            alert: null,
            alertDate: null,
        }
    }) : [];

    // logActionObj.success = true;
    // await (LogAction.create(logActionObj));

    // logger.error(deviceIds);

    ctx.body = {
        ids: deviceIds,
        status: 'success'
    }
};

const setFavourite = async (ctx, next) => {
    const [accountId, userId] = ctx.params.jwtdata.split(':');
    const deviceIds = ctx.request.body.ids;
    const favourite = ctx.request.body.favourite;

    const logActionObj = {
        userId,
        accountId,
        category: 'DEVICE',
        action: 'FavouriteDevice',
        data: JSON.stringify({
            deviceIds,
            favourite: favourite,
        }),
        date: new Date()
    };

    const DBObj = deviceIds.length > 0 ? await Device.updateMany({
        accountId,
        _id: {$in: deviceIds}
    }, {
        $set: {
            favourite: favourite,
        }
    }) : [];

    logActionObj.success = true;
    await (LogAction.create(logActionObj));

    ctx.body = {
        ids: deviceIds,
        favourite: favourite,
        status: 'success'
    }
};

const addToLocator = async (ctx) => {
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const { deviceId, crimeRef, userLoc } = ctx.request.body;

    const logActionObj = {
        userId,
        accountId,
        parent: !!!parentId,
        category: 'DEVICE',
        action: 'AddToLocator',
        data: JSON.stringify({
            deviceId,
            crimeRef,
            userLoc
        }),
        date: new Date()
    };

    if (!deviceId) {
        logActionObj.error = 'Invalid or missing device id';
        logActionObj.success = false;
        await (LogAction.create(logActionObj));
        throw Boom.badRequest('Invalid or missing device id', {deviceId, accountId, modelName: 'Device'});
    }

    const code = Math.floor(1000 + Math.random() * 9000);

    const DBObj = await Device.findOneAndUpdate({
        _id: deviceId,
        accountId
    }, {$set: {recoveryCode: code.toString()}}, {new: true});

    if (!DBObj || DBObj.length === 0) {
        logActionObj.error = `No devices under device ID ${deviceId} found`;
        logActionObj.success = false;
        await (LogAction.create(logActionObj));
        throw Boom.notFound(`No devices under device ID ${deviceId} found`, {deviceId, modelName: 'Device'});
    }

    const doc = await Locator.findOneAndUpdate({ _id: deviceId, accountId }, {$set: { accountId, crimeReference: crimeRef, userLocation: userLoc, dateCreated: new Date() }}, { upsert: true, new: true, useFindAndModify: false });

    logActionObj.success = true;
    await (LogAction.create(logActionObj));

    ctx.body = wrapResponse(['device'], {deviceId, recoveryCode: code.toString(), notifyData: doc});
};

const clearGroup = async (ctx) => {
    const { groups, accountId } = ctx.request.body;

    if(groups && groups.length > 0 && accountId) {
        await groups.forEach(async (group) => {
            if(group.children && group.children.length) {
                const Obj = await Device.updateMany({ groupId: { $in: group.children}, accountId}, { $set: {groupId: group.parentId}});
            }
        });
    }

    ctx.body = { status: 'success' };
};

const assignConfDevices = async (ctx, next) => {
    const devices = ctx.request.body.devices || [];
    const userId = ctx.request.body.userId;
    const accountId = ctx.request.body.accountId;

    try {
        const responses = await Promise.all(devices.map(device => {
            return assignSingleDevice(device, accountId, userId);
        }));

        ctx.body = { devices: responses, status: "success" };
    } catch (error) {
        ctx.body = { error: error.message, status: "failure" };
    }
};

const assignSingleDevice = async (deviceId, accountId, userId) => {
    const shortId = deviceId.trim();
    const name = 'icrs-' + shortId;
    const _id = '8946203807600' + shortId;

    const dateAssigned = new Date();

    const setter = {
        accountId,
        name: name,
        pendingOperatingMode: 'Normal',
        operatingMode: 'Normal',
        configure: true,
        dateAssigned,
        hdopProcessEnabled: true,
        gnssQuality: hdopGeneral.GNSSQuality || 1,
        gnssHDOP: hdopGeneral.GNSSHDOP || 1.0,
        gnssTimeout: hdopGeneral.GNSSTimeout || 60
    };

    let DBObjWakeTimes;

    const logActionObj = {
        userId,
        accountId,
        parent: null,
        category: 'DEVICE',
        action: 'AssignConferenceDevice',
        data: JSON.stringify({
            _id,
            name,
            dateAssigned
        }),
        date: new Date()
    };

    if (!validId(_id)) {
        logActionObj.success = false;
        logActionObj.error = `${_id} is an invalid device id.`;
        await (LogAction.create(logActionObj));
        return { error: true, _id: _id, message: `${_id} is an invalid device id.` }
    }

    const DBObj = await Device.findOneAndUpdate({_id, accountId: {$in: [null, '444']}}, {$set: setter}, {new: true});
    if (!DBObj || DBObj.length === 0) {
        logActionObj.success = false;
        logActionObj.error = `The device ${_id} has already been assigned or does not exist. Please contact support.`;
        await (LogAction.create(logActionObj));
        return { error: true, _id: _id, message: `The device ${_id} has already been assigned or does not exist. Please contact support.` }
    }

    // Set device to Normal operating mode
    await Bloodhound.setOperatingMode(_id, 'Normal');
    await Bloodhound.setGNSSQuality(_id, hdopGeneral.GNSSQuality, hdopGeneral.GNSSHDOP);
    await Bloodhound.setGNSSTimeout(_id, hdopGeneral.GNSSTimeout);
    // Clear tamper alert on device
    await Bloodhound.setTamper(_id, 'On');
    // Get current wakeTimes
    const wakeTimes = await Bloodhound.getWakeTimes(_id);

    if (DBObj && wakeTimes) {
        const updateTimes = [];

        for (let i = 0; i < MAX_WAKEUPS_LENGTH; i++) {
            updateTimes.push(wakeTimes['WakeupTime' + (i + 1)] || null);
        }

        DBObjWakeTimes = await Device.findOneAndUpdate({
            _id,
            accountId
        }, {$set: {wakeupTimes: updateTimes}}, {new: true});
    }

    const responseObj = await DBObjWakeTimes ? await DBObjWakeTimes : await DBObj;

    if (!responseObj) {
        logActionObj.success = false;
        logActionObj.error = 'The device has already been assigned or does not exist. Please contact support.';
    } else {
        logActionObj.success = true;
    }

    await (LogAction.create(logActionObj));

    return responseObj ? responseObj : { error: true, _id: _id, message: `Device ${_id} has already been assigned or does not exist. Please contact support.` };
}

const healthCheck = async (ctx, next) => {
    ctx.body = {status: 'success'};
}

const wrapResponse = (responseName, response) => {
    return {
        [responseName]: response,
        status: 'success'
    }
};

module.exports = {
    devicesByAccount,
    devicesSortedByGroup,
    devicesCount,
    deviceData,
    assign,
    updateDevice,
    clearAlert,
    setFavourite,
    updateWakeupTimes,
    updateWakeupDays,
    devicesById,
    setTamperState,
    setOperatingMode,
    setGroup,
    unsetGroup,
    pending,
    getRecoveryCode,
    clearRecoveryCode,
    configDevicesByAccount,
    activateDevice,
    resetDevices,
    updateTags,
    tagCount,
    filterCount,
    addToLocator,
    clearGroup,
    updateThresholdById,
    assignConfDevices,
    healthCheck
};


