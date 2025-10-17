const Boom = require('@hapi/boom');
const Promise = require('bluebird');
const Fuse = require('../utils/fuse');
const ExtractJwt = require('../utils/jwt-extract');

const SharedController = require('./shared.controller');

/**
 * Returns the object required for the Dashboard view
 * @param ctx
 * @returns {Promise<void>}
 *
 * Expected Response: {
 *	"units": 26,
 *	"groups": 12,
 *	"tracking": 3,
 *	"unread": 4,
 *	"status": "success"
 * }
 *
 */
const dashboardView = async (ctx) => {
    const [ accountId, userId, parentId ] = ctx.params.jwtdata.split(':');
    const jwtdata = ctx.params.jwtdata;
    const status = "success";

    const devicesAPI = process.env.DEVICESAPI;
    const groupsAPI = process.env.GROUPSAPI;
    const userAPI = process.env.USERAPI;
    const trackingAPI = process.env.TRACKINGAPI;
    const messagesAPI = process.env.MESSAGESAPI;

    let groups = parentId ? await SharedController.getGroups(accountId, userId, null, parentId) : null;

    let queryString = '';
    if(groups && groups.length > 0) queryString += `?groups=${groups}`;

    const endpoints = [
        {
            properties: [ { name: 'devices', mapTo: 'units'} ],
            url: devicesAPI,
            path: '/api/devices/count/' + accountId + queryString,
            override: !!(parentId && !queryString),
            override_value: 0
        },
        {
            properties: [ { name: 'groups', mapTo: 'groups'}],
            url: groupsAPI,
            path: '/api/groups/count/' + jwtdata
        }
    ];

    const promises = [];

    endpoints.forEach( (endpoint) => {
        if(!endpoint.override) {
            promises.push(Promise.resolve(Fuse.pluck(endpoint.url, endpoint.path, endpoint.properties)));
        } else {
            promises.push({ [endpoint.properties[0].mapTo]: endpoint.override_value});
        }
    });

    ctx.body = await Promise.each(promises, (ep) => ep).then((results) => {
            let response = {};

            results.forEach((result) => {
               response = {...response, ...result }
            });

            return { ...response, status };
        });
};

module.exports = {
    dashboardView
};