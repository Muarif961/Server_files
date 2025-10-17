const Locator = require('../models/locator.model');
const LocatorFound = require('../models/locator-found.model');
const Device = require('../models/device.model');
const Boom = require('@hapi/boom');
const Bloodhound = require("../utils/bloodhound");

const arcFrequency = process.env.ARC_FREQUENCY;
const arcHours = process.env.ARC_HOURS;

const hdopGeneral = process.env.GNSS_HDOP_GENERAL || {};
const hdopTracking = process.env.GNSS_HDOP_TRACKING || {};

/**
 * Retrieve all devices in the locator bucket
 * @param ctx
 * @returns {Promise<void>}
 */
const getLocatorDevices = async (ctx) => {
    const doc = await Locator.find();

    const deviceIds = doc && doc.length > 0 ? doc.map(device => device._id) : [];

    const devices = await Device.find({ _id: { $in: deviceIds }});

    const combined = await doc.map(device => ({ ...device._doc, ...((devices.find(d => device._id === d._id)) || {})._doc}));

    ctx.body = combined;
};

/**
 * Retrieve all found devices in the found bucket
 * @param ctx
 * @returns {Promise<void>}
 */
const getFoundDevices = async (ctx) => {
    const doc = await LocatorFound.find();

    const deviceIds = doc && doc.length > 0 ? doc.map(device => device.deviceId) : [];

    const devices = await Device.find({ _id: { $in: deviceIds }});

    ctx.body = doc.map(device => ({
        ...device._doc,
        deviceData: devices.find(d => device.deviceId === d._id.toString()) || {}
    }));
};

const verifyCode = async (ctx) => {
    const { accountId, code } = ctx.request.body;

    const doc = await Device.findOne({ accountId, recoveryCode: code });
    if(!doc) throw Boom.notFound(`Device not found using security code ${code}`, { code, accountId });

    ctx.body = wrapResponse(['_id', 'name', 'recoveryCode'], doc);
};

const addToBucket = async (ctx, wakeupTimes) => {
    const { accountId, deviceId, crimeRef, userLoc, pocName, pocEmail, pocTelephone, accountEmail } = ctx.request.body;

    try {
        const res = await Bloodhound.setTrackingMode(deviceId, arcFrequency === 0 ? 0 : arcFrequency, arcHours === 0 ? 0 : (arcHours || 0) * 60);
        logger.info('Setting ARC Locator Mode response: ', res);
    } catch (e) {
        logger.error('Error setting ARC Locator mode: ', e);
    }

    const doc = await Locator.findOneAndUpdate({ _id: deviceId, accountId },
        {$set:
                {
                    accountId,
                    crimeReference: crimeRef,
                    userLocation: userLoc,
                    dateCreated: new Date(),
                    pocName: pocName,
                    pocEmail: pocEmail,
                    pocTelephone: pocTelephone,
                    accountEmail: accountEmail,
                    initialMode: true,
                    pendingMonitor: null,
                }
        }, { upsert: true, new: true, useFindAndModify: false });

    ctx.body = doc;
};

/**
 * Wraps the response and plucks out the required properties
 * @param responseNames
 * @param response
 * @returns {{}&{status: string}}
 */
const wrapResponse = (responseNames, response, appendObj) => {
    let wrapped = {};

    if(typeof responseNames == 'string') {
        wrapped[responseNames] = response[responseNames];
    } else {
        responseNames.forEach((name) => {
            wrapped[name] = response[name];
        })
    }

    return { ...wrapped, ...appendObj, status: "success" };
};

const setOperatingMode = async (ctx, next) => {
    // const accountId = ctx.params.accountId;
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const {_ids, operatingMode, frequency, deviceAccountId} = ctx.request.body;
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
        action: 'LocatorSetOperatingMode',
        data: JSON.stringify({
            _ids,
            operatingMode: operatingMode,
            frequency: frequency,
            accountId: deviceAccountId,
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
        bulkOperation.find({_id, accountId: deviceAccountId})
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

module.exports = {
    getLocatorDevices,
    getFoundDevices,
    verifyCode,
    addToBucket,
    setOperatingMode
};
