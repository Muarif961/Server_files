const Boom = require('@hapi/boom');
const Mongoose = require('mongoose');
const Group = require('../models/group.model');
const UserGroup = require('../models/user-group.model');

const adminGroups = async (ctx) => {

};

const groupsCount = async (ctx) => {
    const jwtArray = ctx.params.jwtdata.split(':');

    console.log(jwtArray.length);
    const accountId = jwtArray[0];
    const userId = jwtArray[1];
    const parentId = jwtArray.length > 1 ? jwtArray[2] : null;

    const count = parentId ? await UserGroup.countDocuments({ accountId, userId }) : await Group.countDocuments({ accountId });
    logger.info('Result: ', count);
    ctx.body = wrapResponse([ 'groups' ], { groups: count });
};

const userGroups = async (ctx) => {

};

const createGroup = async (ctx) => {
    const name = ctx.request.body.groupName;
    const accountId = ctx.params.accountId;

    const Exists = await Group.find({ accountId, name });
    if(Exists.length > 0) throw Boom.conflict('Group name already exists under this account', { accountId, name, modelName: 'Group'});

    const DBObj = await Group.create({ accountId, name });
    if (!DBObj) throw Boom.badRequest('Error creating new group', { accountId, name, modelName: 'Group'} );

    ctx.body = wrapResponse([ '_id', 'name' ], DBObj);
};

const updateGroup = async (ctx) => {
    const name = ctx.request.body.groupName;
    const accountId = ctx.params.accountId;
    const groupId = ctx.request.body.groupId;

    const Exists = await Group.find({ accountId, name, _id: { $ne: groupId } });
    if(Exists.length > 0) throw Boom.conflict('Group name already exists under this account', { accountId, name, modelName: 'Group'});

    const DBObj = await Group.findOneAndUpdate({ _id: groupId }, { $set: { name: name  }}, { new: true });
    if (!DBObj) throw Boom.badRequest('Error updating group', { accountId, name, modelName: 'Group'} );

    ctx.body = wrapResponse([ '_id', 'name' ], DBObj);
};

/**
 *
 * @param ctx
 * @returns {Promise<void>}
 */
const getGroups = async (ctx) => {
    const [ accountId, userId, parentId ] = ctx.params.jwtdata.split(':');

    let query = { accountId };

    // If it's a child account, grab the groups from the usergroups instead
    if(parentId) {
        const groups = await UserGroup.find({accountId, userId}, { accountId: 0, __v: 0 });
        query._id = { $in: groups.map(group => group.groupId) };
    }

    const doc =  await Group.find( query, { accountId: 0, __v: 0 });
    ctx.body = wrapResponse(['groups' ], { groups: doc });
};

// const wrapResponse = (responseName, response) => {
//     return {
//         [responseName]: response,
//         status: 'success'
//     }
// };

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
    adminGroups,
    groupsCount,
    userGroups,
    createGroup,
    updateGroup,
    getGroups
};