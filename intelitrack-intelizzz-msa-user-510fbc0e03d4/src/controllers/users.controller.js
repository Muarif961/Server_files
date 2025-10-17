const Boom = require('@hapi/boom');
const Mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const tokenGen = require('crypto-random-string');
const nodemailer = require('nodemailer');

const User = require('../models/user.model');
const Account = require('../models/account.model');
const alerter = require('../utils/alerter');

/**
 * Return a user's groups
 * @param ctx
 * @returns {Promise<void>}
 */
const userGroups = async (ctx) => {
    const userId = ctx.params.userId;

    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) throw Boom.badRequest('Invalid User ID', { id: userId, modelName: 'User'} );

    const DBObj = await User.findOne({ _id: userId });
    if (!DBObj) throw Boom.notFound('User not found', { id: userId, modelName: 'User'} );

    ctx.body = wrapResponse('groups', DBObj, { count: DBObj.groups.length });
};

/**
 * Check for a correct password
 * @param username
 * @param password
 * @param message
 * @returns {Promise<void>}
 */
const checkPassword = async (username, password, message = 'Incorrect Username or Password') => {
    if(!username || typeof username !== 'string' || !password || typeof password !== 'string') throw Boom.unauthorized(message, { username: username, modelName: 'User'} );

    const DBObj = await User.findOne({ username });
    if (!DBObj) throw Boom.unauthorized(message, { username: username, modelName: 'User'} );

    const match = await bcrypt.compare(password, DBObj.password);
    if(!match) throw Boom.unauthorized(message, { username, modelName: 'User'});

    return DBObj;
};

/**
 * Authenticate user by checking for correct username and password
 * @param ctx
 * @returns {Promise<void>}
 */
const authenticate = async (ctx) => {
    const username = ctx.request.body.username.toLowerCase();
    const password = ctx.request.body.password;

    const user = await checkPassword(username, password);

    ctx.body = wrapResponse([ '_id', 'username', 'accountId', 'firstName', 'lastName', 'roles', 'parentId' ], user);
};

/**
 * Updates required parameters of a user, including password checks when password is updated
 * @param ctx
 * @returns {Promise<void>}
 */
const updateUser = async (ctx) => {
    const [ accountId, userId ] = ctx.params.jwtdata.split(':');
    const user = ctx.request.body;

    if (!user._id || !user._id.match(/^[0-9a-fA-F]{24}$/))
        throw Boom.badRequest('Invalid User ID', { _id: user._id, modelName: 'User'} );

    const doc = await User.findOne({ _id: user._id });

    const _idString = doc._id.toString();

    // Ensure only the user themselves or the parent user can make any profile updates
    if(userId !== _idString && (doc.parentId && userId !== doc.parentId))
        throw Boom.unauthorized('Action not permitted', {_id: user._id, modelName: 'User'});

    // Account Information
    if(user.email) {
        doc.email = user.email.toLowerCase();
        doc.username = user.email.toLowerCase();
    }

    if(user.password && user.oldPassword) {
        const checkPass = await checkPassword(doc.username, user.oldPassword);
        doc.password = bcrypt.hashSync(user.password, 10);
    }

    // SMS Alerts
    if(user.alertsNumber) doc.alertsNumber = user.alertsNumber;

    // Contact information
    if(user.firstName) doc.firstName = user.firstName;
    if(user.lastName) doc.lastName = user.lastName;
    if(user.address1 || user.address1 === '') doc.address1 = user.address1;
    if(user.address2 || user.address2 === '') doc.address2 = user.address2;
    if(user.address3 || user.address3 === '') doc.address3 = user.address3;
    if(user.address4 || user.address4 === '') doc.address4 = user.address4;
    if(user.postcode || user.postcode === '') doc.postcode = user.postcode;
    if(user.country || user.country === '') doc.country = user.country;
    if(user.contactNumber || user.contactNumber === '') doc.contactNumber = user.contactNumber;
    const accountUpdate = user.companyName && !doc.parentId ? await updateAccount(doc.accountId, user.companyName) : null;
    // TODO: Groups

    await doc.save();

    const responseObj = {
       _id: doc._id
    };

    if(user.email) responseObj.email = doc.email;
    if(user.alertsNumber) responseObj.alertsNumber = doc.alertsNumber;
    if(user.firstName) responseObj.firstName = doc.firstName;
    if(user.lastName) responseObj.lastName = doc.lastName;
    if(user.address1 || user.address1 === '') responseObj.address1 = doc.address1;
    if(user.address2 || user.address2 === '') responseObj.address2 = doc.address2;
    if(user.address3 || user.address3 === '') responseObj.address3 = doc.address3;
    if(user.address4 || user.address4 === '') responseObj.address4 = doc.address4;
    if(user.postcode || user.postcode === '') responseObj.postcode = doc.postcode;
    if(user.country || user.country === '') responseObj.country = doc.country;
    if(user.contactNumber || user.contactNumber === '') responseObj.contactNumber = doc.contactNumber;
    if(accountUpdate) responseObj.companyName = accountUpdate;

    ctx.body = { ...responseObj, status: 'success' };
};

const updateAccount = async (_id, name) => {
    const doc = await Account.findOne({ _id });
    doc.name = name;
    doc.save();

    return doc.toObject().name;
};

// TODO: New user registration with account creation followed by user creation
const createNewUser = async (ctx) => {
    const roles = [ 'app_user' ];
    console.log(ctx.request.body);
    const { company, ...user } = ctx.request.body;

    if(await userExists(user.username)) throw Boom.conflict('User account already exists.', { username: user.username, modelName: 'User'} );

    const AccountObj = await Account.create({
        ...company
    });

    const DBObj = await createUser({
        ...user,
        accountId: AccountObj._id,
        roles
    });

    ctx.body = wrapResponse(['_id', 'firstName', 'lastName', 'username', 'email'], DBObj, { company: AccountObj.name });
};

const createChildUser = async (ctx) => {
    //TODO: Hard coded role for child user
    const roles = [ 'app_user'];
    const [ accountId, userId ] = ctx.params.jwtdata.split(':');

    if(await userExists(ctx.request.body.email)) throw Boom.conflict('User account already exists or an invite has already been sent.', { username: ctx.request.body.email, modelName: 'User'} );

    const userObj = {
        username: ctx.request.body.email,
        firstName: '',
        lastName: '',
        accountId,
        parentId: userId,
        email: ctx.request.body.email,
        roles,
        token: tokenGen({length: 15, type: 'url-safe'}),
        password: tokenGen({length: 30, type: 'base64'})
    };

    const DBObj = await createUser(userObj);

    // Send an email
    if(DBObj) {
        alerter.sendAlert('email', {
            from: '"Intelizzz Dev Account" <anthony@intelizzz.co.uk>',
            to: userObj.email,
            subject: 'Intelizzz Invitation',
            text: `You have been invited to access Intelizzz. Visit the url http://localhost:3000/signup/${userObj.token}`,
            html: `<p>You have been invited to access Intelizzz. Visit the url <a href="http://localhost:3000/signup/${userObj.token}">http://localhost:3000/signup/${userObj.token}</a></p>`
        });
    }

    ctx.body = wrapResponse(['_id', 'username', 'accountId'], DBObj);
};

const acceptChildInvite = async (ctx) => {
    const { _id, firstName, lastName, password, token } = ctx.request.body;
    const DBObj = await User.findOneAndUpdate({ _id: Mongoose.Types.ObjectId(_id), token }, { firstName, lastName, password: bcrypt.hashSync(password, 10), token: null}, { new: true });
    console.log(DBObj);
    ctx.body = ctx.body = wrapResponse([ '_id', 'firstName', 'lastName', 'username', 'email', 'parentId', 'accountId' ], DBObj);
};

const createUser = async (userObj) => {

    logger.log(userObj);

    const user = {
        username: userObj.username.toLowerCase(),
        password: bcrypt.hashSync(userObj.password, 10),
        firstName: userObj.firstName,
        lastName: userObj.lastName,
        accountId: userObj.accountId,
        address1: userObj.address1,
        address2: userObj.address2,
        address3: userObj.address3,
        address4: userObj.address4,
        postcode: userObj.postcode,
        country: userObj.country,
        parentId: userObj.parentId || null,
        email: userObj.email,
        contactNumber: userObj.contactNumber,
        groups: userObj.groups,
        roles: userObj.roles
    };

    if(userObj.token) {
        user.token = userObj.token;
    }

    return await User.create(user);
};

const getUser = async (ctx) => {
    const [ accountId, userId ] = ctx.params.jwtdata.split(':');

    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) throw Boom.badRequest('Invalid User ID', { id: userId, modelName: 'User'} );

    const DBObj = await User.findOne({ _id: userId });
    const AccountObj = await Account.findOne({ _id: DBObj.accountId });

    ctx.body = ctx.body = wrapResponse([
        '_id',
        'username',
        'accountId',
        'firstName',
        'lastName',
        'roles',
        'address1',
        'address2',
        'address3',
        'address4',
        'postcode',
        'country',
        'email',
        'contactNumber',
        'alertsNumber',
        'parentId'
    ], DBObj, { isParent: !DBObj.parentId, companyName: AccountObj.name });
};

const getChildren = async (ctx) => {
    const [ accountId, userId ] = ctx.params.jwtdata.split(':');

    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) throw Boom.badRequest('Invalid User ID', { id: userId, modelName: 'User'} );
    const DBObj = await User.find({ parentId: userId }).select({
        '_id': '1',
        'username': '1',
        'firstName': '1',
        'lastName': '1',
        'address1': '1',
        'address2': '1',
        'address3': '1',
        'address4': '1',
        'postcode': '1',
        'country': '1',
        'contactNumber': '1',
        'email': '1',
        'userStatus': '1'
    });

    ctx.body = { children: DBObj || [], status: 'success' };
};

const getTokenData = async (ctx) => {
    const token = ctx.params.token;

    const DBObj = await User.findOne({ token }).select({
        '_id': '1',
        'username': '1',
        'email': '1',
        'accountId': '1'
    });

    if(!DBObj) throw Boom.notFound('Token invalid or expired.', { token: token, modelName: 'User'} );

    const AccObj = await Account.findOne({ _id: Mongoose.Types.ObjectId(DBObj.accountId) });

    ctx.body = wrapResponse(['_id', 'username', 'email', 'accountName'], { ...DBObj.toObject(), accountName: AccObj.name })
};

/**
 * Wraps the response and plucks out the required properties
 * @param responseNames
 * @param response
 * @returns {{}&{status: string}}
 */
const wrapResponse = (responseNames, response, appendObj) => {
    let wrapped = {};

    console.log(response);

    if(typeof responseNames == 'string') {
        wrapped[responseNames] = response[responseNames];
    } else {
        responseNames.forEach((name) => {
            wrapped[name] = response[name];
        })
    }

    return { ...wrapped, ...appendObj, status: "success" };
};

/**
 * Mongoose unique isn't working for string fields(?) so here is a function to check if the user
 * exists and prevent two accounts being created with the same username / email addresss
 * @param username
 * @returns {boolean}
 */
const userExists = async (username) => {
    const DBObj = await User.find({ username });
    return DBObj && DBObj.length > 0 ? true : false;
};

module.exports = {
    userGroups,
    authenticate,
    createUser,
    createChildUser,
    getUser,
    getChildren,
    createNewUser,
    getTokenData,
    acceptChildInvite,
    updateUser
};