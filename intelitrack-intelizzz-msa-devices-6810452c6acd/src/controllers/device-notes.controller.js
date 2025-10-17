const Notes = require('../models/notes.model');
const Device = require('../models/device.model');
const Boom = require('@hapi/boom');

/**
 * Retrieve all devices in the locator bucket
 * @param ctx
 * @returns {Promise<void>}
 */
const getDeviceNotes = async (ctx) => {
    const [accountId, userId, parentId] = ctx.params.jwtdata.split(':');
    const deviceId = ctx.request.query.deviceid;

    if(!deviceId) throw Boom.badRequest(`Missing device ID.`, {
        modelName: 'Notes'
    });

    const DBObj = await Notes.find({ accountId, deviceId }).sort({ date: -1 });

    ctx.body = {
        result: {notes: DBObj}, status: 'success'
    };
};

const addDeviceNote = async (ctx) => {
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

module.exports = {
    getDeviceNotes,
    addDeviceNote
};
