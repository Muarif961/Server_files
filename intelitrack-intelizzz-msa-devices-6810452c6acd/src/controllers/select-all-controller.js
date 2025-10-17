const Device = require("../models/device.model");
const Bloodhound = require("../utils/bloodhound");
// const LogAction = require("../models/log-action.model");
const Boom = require("@hapi/boom");
const LogAction = require('../models/log-action.model');

const hdopGeneral = process.env.GNSS_HDOP_GENERAL || {};
const hdopTracking = process.env.GNSS_HDOP_TRACKING || {};

/**
 * Set wakeup times
 * @param ctx
 * @param next
 * @returns {Promise<void>}
 */
const selectAllUpdateWakeupTimes = async (ctx, next) => {
    // const accountId = ctx.params.accountId;
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const {times, _ids, wakeupDays} = ctx.request.body;

    times.sort((a, b) => {
        if(a < b) { return -1; }
        if(a > b) { return 1; }
        return 0;
    });

    const logActionObj = {
        userId,
        accountId,
        parent: !!!parentId,
        category: 'DEVICE',
        action: 'UpdateWakeupTimes',
        data: JSON.stringify({
            times: times,
            days: wakeupDays,
            ids: [],
            selectAll: true,
        }),
        date: new Date()
    };

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
        status: 'success'
    };
};

const selectAllSetOperatingMode = async (ctx, next) => {
    // const accountId = ctx.params.accountId;
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const {_ids, operatingMode} = ctx.request.body;
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
            operatingMode: operatingMode,
            selectAll: true,
            ...gnssHDOPOptions
        }),
        date: new Date()
    };

    const bulkOperation = Device.collection.initializeUnorderedBulkOp();

    _ids.forEach(async (_id) => {
        const mode = operatingMode === 'Tracking' ? await Bloodhound.setTrackingMode(_id) : await Bloodhound.setOperatingMode(_id, operatingMode);
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
            .update({$set: {pendingOperatingMode: operatingMode, ...gnssHDOPOptions}});
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

    ctx.body = {status: 'success'};
};

const selectAllSetTamperState = async (ctx, next) => {
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
            tamperState: tamperState,
            selectAll: true,
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

    ctx.body = {status: 'success'};
};

module.exports = {
    selectAllSetOperatingMode,
    selectAllUpdateWakeupTimes,
    selectAllSetTamperState,
};
