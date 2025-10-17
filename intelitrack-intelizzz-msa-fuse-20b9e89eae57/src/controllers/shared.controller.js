const Boom = require('@hapi/boom');
const Promise = require('bluebird');
const Fuse = require('../utils/fuse');
const ExtractJwt = require('../utils/jwt-extract');
const moment = require('moment');
const Fetch = require('../utils/fetch');

const devicesAPI = process.env.DEVICESAPI;
const groupsAPI = process.env.GROUPSAPI;
const userAPI = process.env.USERAPI;
const trackingAPI = process.env.TRACKINGAPI;
const messagesAPI = process.env.MESSAGESAPI;
const wakeAPI = process.env.WAKEAPI;

const getGroups = async (accountId, userId, groupsQuery = '', parentId = null) => {
    // If it's a parent and no groups supplied, just return null so it fetches all wakeups by accountId
    if(!parentId && !groupsQuery) return null;

    const groupsArray = groupsQuery ? groupsQuery.split(',') : null;

    // If it's a parent and there are groups supplied, just return the array
    if(!parentId && groupsQuery) return groupsArray;

    const groupsObj = await Fetch(userAPI + `/api/usergroup/${userId}/${accountId}`, 'GET');

    if(groupsObj && groupsObj.groups && groupsObj.length === 0) return [];

    let filteredGroups;

    // If user supplied groups, compare then with actual user groups to ensure they aren't trying to get a cheeky look
    // at groups they don't own;
    if(groupsArray && groupsArray.length > 0) {
        filteredGroups = groupsObj.groups.filter(item => groupsArray.includes(item));
    }

    return filteredGroups && filteredGroups.length >= 0 ? filteredGroups : groupsObj.groups
};

const getLocations = async (accountId, startDate, endDate, tamper, groups) => {
    const locationsBody = {
        groups,
        accountId
    };

    // Format date YYYY-MM-DD for mongo and moment queries
    locationsBody.endDate = endDate ? endDate : moment(new Date()).format('YYYY-MM-DD');
    // Use the supplied startDate or use 7 days before
    locationsBody.startDate = startDate ? startDate : moment(locationsBody.endDate).subtract(7,'d').format('YYYY-MM-DD');
    // If we want only devices where the tamper alert is on, add it to the query
    locationsBody.tamper = tamper;

    const locations = await Fetch(wakeAPI + `/api/wakehistory/locations`, 'POST', locationsBody);
    const distinctIds = [ ...new Set(locations.map(x => x.deviceId))];

    const devicesBody = {
        deviceIds: distinctIds,
        accountId
    };

    // If we want only devices that are currently being tracked
    // if(tracking) {
    //     devicesBody.tracking = true;
    // }

    const devices = await Fetch(devicesAPI + `/api/devices/byid`, 'POST', devicesBody);

    return { locations, distinctIds, devices };
};

module.exports = {
    getLocations, getGroups
};