const Boom = require('@hapi/boom');
const Promise = require('bluebird');
const Fuse = require('../utils/fuse');
const ExtractJwt = require('../utils/jwt-extract');
const moment = require('moment');
const Fetch = require('../utils/fetch');
const SharedController = require('./shared.controller');

const devicesAPI = process.env.DEVICESAPI;
const groupsAPI = process.env.GROUPSAPI;
const userAPI = process.env.USERAPI;
const trackingAPI = process.env.TRACKINGAPI;
const messagesAPI = process.env.MESSAGESAPI;
const wakeAPI = process.env.WAKEAPI;

/**
 * locationsView
 * @param ctx
 * @returns {Promise<void>}
 */
const locationsView = async (ctx) => {
    console.log(ctx.request.query);
    const [ accountId, userId, parentId ] = ctx.params.jwtdata.split(':');
    const { startDate, endDate, tamper, tracking, groupsQuery } = ctx.request.query;

    const status = "success";

    const groups = await SharedController.getGroups(accountId, userId, groupsQuery, parentId);

    const { locations, distinctIds, devices } = await SharedController.getLocations(accountId, startDate, endDate, tamper, groups);

    ctx.body = { locations, distinctIds, devices, status };
};



module.exports = {
    locationsView
};