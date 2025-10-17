const Boom = require('@hapi/boom');
const Promise = require('bluebird');
const Fuse = require('../utils/fuse');
const ExtractJwt = require('../utils/jwt-extract');
const Fetch = require('../utils/fetch');
const SharedController = require('./shared.controller');

/**
 *
 * @param ctx
 * @returns {Promise<void>}
 */
const devices = async (ctx) => {
    const [ accountId, userId, parentId ] = ctx.params.jwtdata.split(':');

    const devicesAPI = process.env.DEVICESAPI;

    let groups = parentId ? await SharedController.getGroups(accountId, userId, null, parentId) : null;
    let queryString = '';
    if(groups && groups.length > 0) queryString += `?groups=${groups}`;

    const devices = parentId && !queryString ? { units: [], status: 'success' } : await Fetch(devicesAPI + `/api/devices/${accountId}${queryString}`, 'GET');

    ctx.body = devices;
};

/**
 * Update the group of a device in device database and wake history
 * @param ctx
 * @returns {Promise<void>}
 */
const deviceGroup = async (ctx) => {
    const [ accountId, userId, parentId ] = ctx.params.jwtdata.split(':');

    const devicesAPI = process.env.DEVICESAPI;
    const wakeAPI = process.env.WAKEAPI;

    // Update the group for the device itself
    const deviceUpdate = await Fetch(devicesAPI + `/api/devices/update/${accountId}`, 'PUT', ctx.request.body);

    console.log(ctx.request.body);
    console.log(deviceUpdate);

    // Update the group for any devices that match the current account id in the wake history db
    const wakeUpdate = await Fetch(wakeAPI + `/api/wakehistory/group/${accountId}`, 'PUT', ctx.request.body);

    console.log(wakeUpdate);

    ctx.body = deviceUpdate;
};

module.exports = {
    devices,
    deviceGroup
};