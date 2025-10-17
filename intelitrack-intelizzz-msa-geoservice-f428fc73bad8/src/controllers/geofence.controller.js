const Boom = require('@hapi/boom');
const Mongoose = require('mongoose');

const Geofence = require('../models/geofence.model');
const GeofenceDevices = require('../models/geofence-device.model');
const alerter = require('../utils/alerter');

const setGeofence = async (ctx) => {
    const [ accountId, userId, parentId ] = ctx.params.jwtdata.split(':');
    const { newGeofences, changedGeofences } = ctx.request.body;

    // Remove the devices property as this shouldn't be included for an existing geofence
    changedGeofences.forEach(async (changed) => {
        const { _id, devices, ...setBody } = changed;

        await Geofence.updateMany({ _id }, { $set: setBody }).catch(err => console.log(err));
    });

    newGeofences.forEach(async (newGeofence) => {
        const { devices, ...body } = newGeofence;
        const created = await Geofence.create({ accountId, ...body }).catch(err => console.log(err));

        // Add any devices to the new geofence
        if(devices) {
            const devicesBody = devices.map(device => ({
                deviceId: device,
                accountId,
                geofenceId: created._id
            }));

            await GeofenceDevices.create(devicesBody).catch(err => console.log(err));
        }
    });

    // const updatedGeofences = await Geofence.find({ accountId }, { accountId: 0 });

    ctx.body = { status: 'success' };
};

const listGeofences = async (ctx) => {
    const [ accountId, userId, parentId ] = ctx.params.jwtdata.split(':');

    const GeofencesObj = await Geofence.find({ accountId }, { accountId: 0, __v: 0 });
    const geofenceIds = GeofencesObj.map(fence => fence._id);

    // Made a decision to return the device ids relating to a geofence when a user clicks on a geofence, both for performance issues and to ensure
    // a child user only gets back devices ids they are allowed to see

    // const deviceIds = await GeofenceDevices.find({ accountId, geofenceId: { $in: geofenceIds }});

    // const geofences = GeofencesObj.map(geofence => {
    //     return {
    //         ...geofence._doc,
    //         devices: deviceIds.filter(device => geofence._id.toString() === device.geofenceId.toString()).map(device => device.deviceId)
    //     }
    // });

    ctx.body = { geofences: GeofencesObj };
};

const updateGeofenceDevices = async (ctx) => {
    const [ accountId, userId, parentId ] = ctx.params.jwtdata.split(':');

    const { changedDevices } = ctx.request.body;

    const addStaging = [];
    const removeStaging = [];

    changedDevices.forEach(geofence => {
        const adds = geofence.add.map(device => ({
            deviceId: device,
            accountId,
            geofenceId: geofence.geofenceId
        }));

        addStaging.push(adds);

        const removes = geofence.remove.map(device => ({
            deviceId: device,
            accountId,
            geofenceId: geofence.geofenceId
        }));

        removeStaging.push(removes);
    });

    const adds = [].concat(...addStaging);
    const removes = [].concat(...removeStaging);

    await GeofenceDevices.create(adds).catch(err => console.log(err));
    const bulkRemove = GeofenceDevices.collection.initializeUnorderedBulkOp();

    removes.forEach(item => {
        bulkRemove.find(item).remove();
    });

    bulkRemove.execute();

    ctx.body = { status: 'success' };
};

const getGeofenceDevices = async (ctx) => {
    const [ accountId, userId, parentId ] = ctx.params.jwtdata.split(':');
    const geofenceId = ctx.params.geofenceId;

    const deviceObj = await GeofenceDevices.find({ geofenceId }, { deviceId: 1 });

    const devices = deviceObj.map(device => device.deviceId);

    ctx.body = { geofenceId, devices, status: 'success' };

};

module.exports = {
    setGeofence,
    listGeofences,
    updateGeofenceDevices,
    getGeofenceDevices
};