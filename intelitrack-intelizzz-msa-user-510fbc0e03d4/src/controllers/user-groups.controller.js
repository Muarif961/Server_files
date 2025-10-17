const Boom = require('@hapi/boom');
const UserGroup = require('../models/user-group.model');


// TODO: Use db.usergroups.createIndex({ "userId": 1, "groupId": 1, "accountId": 1}, { "unique": true }); in mongo to ensure unique documents
const addUserGroup = async (ctx) => {
    const accountId = ctx.params.accountId;
    const userId = ctx.request.body._id;

    const groups = ctx.request.body.groups.map(group => {
        return { ...group, accountId };
    });

    await UserGroup.deleteMany({ userId, accountId });

    const doc = await UserGroup.create(groups, (err, doc) => {
        console.log(err);
    });

    console.log(doc);

    ctx.body = { groups: ctx.request.body.groups, status: 'success' };
};

const getGroups = async (ctx) => {
    const accountId = ctx.params.accountId;
    const userId = ctx.params.userId;

    const DBObj = await UserGroup.find( { userId, accountId }, { groupId: 1 });
    const response = DBObj.map(item => item.groupId);

    ctx.body = wrapResponse(['groups', 'userId' ], { groups: response, userId });
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
    addUserGroup,
    getGroups
};