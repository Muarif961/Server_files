const jwt = require('jsonwebtoken');
const Request = require('request-promise-native');
const Cookies = require('cookies');

const JWT_SECRET = process.env.JWT_SECRET;
const API_KEY_SECRET = process.env.API_KEY_SECRET;
const USER_AUTH_API = process.env.USER_AUTH_API;
const USER_REGISTER_API = process.env.USER_REGISTER_API;
const USERS_API = process.env.USERS_API;
// const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
const COOKIE_PREFIX = process.env.COOKIE_PREFIX || 'zzz';

const createJWT = (ctx, result) => {
    const currDate = new Date().getTime();
    const prefix = COOKIE_PREFIX + (ctx.request.headers.prefix || '');

    const hostnameArray = ctx.request.headers.host ? ctx.request.headers.host.split('.') : null;
    const COOKIE_DOMAIN = hostnameArray ? '.' + hostnameArray.slice(1,hostnameArray.length).join('.') : null;

    // TODO: Make the expiry configurable
    const expDate = new Date().setDate(new Date(currDate).getDate() + ((7 * 52) * 30)); // current time + 7 days
    const cookieExpDate = new Date(expDate);

    // TODO: Temporary override option for secure cookies (still httponly)
    const unsecured = ctx.request.body.mobile;

    const token = jwt.sign(
        {
            roles: result.roles,
            accountId: result.accountId,
            username: result.username,
            parentId: result.parentId,
            id: result._id,
            iat: currDate,
            exp: expDate
        },
        JWT_SECRET
    );

    const userObj = {
        _id: result._id,
        username: result.username,
        firstName: result.firstName,
        lastName: result.lastName
    };

    ctx.status = 200;

    const cookies = new Cookies(ctx.req, ctx.res, { secure: true, httpOnly: true });

    if(unsecured) {
        ctx.cookies.set(prefix, token, { httpOnly: true, expires: cookieExpDate, domain: COOKIE_DOMAIN, sameSite: 'none' });
        ctx.cookies.set(prefix + 'user', JSON.stringify(userObj), { httpOnly: false, expires: cookieExpDate, domain: COOKIE_DOMAIN, sameSite: 'none' });
    } else {
        cookies.set(prefix, token, { secure: true, httpOnly: true, expires: cookieExpDate, domain: COOKIE_DOMAIN, sameSite: 'none' });
        cookies.set(prefix + 'user', JSON.stringify(userObj), { httpOnly: false, expires: cookieExpDate, domain: COOKIE_DOMAIN, sameSite: 'none' });
    }

    ctx.body = {
        message: 'Successful Authentication',
        cookieExpDate,
        ...userObj
    };
};

const createUser = async (ctx) => {
    // console.log(ctx.request.body);
    const user = ctx.request.body;

    const result = await sendRequest(USER_REGISTER_API, {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        company: { name: user.company },
        password: user.password,
        email: user.email,
        address1: user.address1,
        address2: user.address2,
        address3: user.address3,
        address4: user.address4,
        postcode: user.postcode,
        country: user.country,
        contactNumber: user.contactNumber,
        mobileUser: user.mobileUser
    }, 'POST', ctx.request.headers.host);

    if(!(result.status === 'success')) {
        ctx.status = 401;
        ctx.body = result;

        return ctx;
    }

    createJWT(ctx, result);

    return ctx;
};

const acceptInvite = async (ctx) => {
    const user = ctx.request.body;

    const result = await sendRequest(USERS_API + '/api/user/accept', {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        password: user.password,
        token: user.token
    }, 'PUT', ctx.request.headers.host);

    if(!(result.status === 'success')) {
        ctx.status = 401;
        ctx.body = result;

        return ctx;
    }

    createJWT(ctx, result);

    return ctx;
};

const resetPassword = async (ctx) => {
    const user = ctx.request.body;

    const result = await sendRequest(USERS_API + '/api/user/reset', {
        _id: user._id,
        token: user.token,
        password: user.password
    }, 'PUT', ctx.request.headers.host);

    if(!(result.status === 'success')) {
        ctx.status = 401;
        ctx.body = result;

        return ctx;
    }

    createJWT(ctx, result);

    return ctx;
};

const gateway = async (ctx) => {
    // console.log('Cookie: ', ctx.cookies.get('zzz'));
    // console.log(ctx.request.body);

    const result = await sendRequest(USER_AUTH_API, { username: ctx.request.body.username, password: ctx.request.body.password }, 'POST', ctx.request.headers.host);

    if(!(result.status === 'success')) {
        ctx.status = 401;
        ctx.body = result;

        return ctx;
    }

    const auth_user = (result.roles.findIndex(role => role === ctx.request.body.role) > -1);

    if(auth_user) {
        createJWT(ctx, result);
    } else {
        ctx.status = 401;
        ctx.body = {
            "statusCode": 401,
            "error": "Incorrect Account Type",
            "message": `Please contact your administrator to gain access to the ${ctx.request.body.appName || ''} app.`
        };
    }

    return ctx;
};

const logout = async (ctx) => {
    const hostnameArray = ctx.request.headers.host ? ctx.request.headers.host.split('.') : null;
    const COOKIE_DOMAIN = hostnameArray ? '.' + hostnameArray.slice(1,hostnameArray.length).join('.') : null;

    const prefix = COOKIE_PREFIX + (ctx.request.headers.prefix || '');
    const currDate = new Date().getTime();

    const expDate = new Date().setDate(new Date(currDate));
    const cookieExpDate = new Date(expDate);

    const cookies = new Cookies(ctx.req, ctx.res, { secure: true, httpOnly: true });
    cookies.set(prefix, null, { secure: true, httpOnly: true, expires: cookieExpDate, domain: COOKIE_DOMAIN, sameSite: 'none' });
    cookies.set(prefix + 'user', null, { httpOnly: false, expires: cookieExpDate, domain: COOKIE_DOMAIN, sameSite: 'none' });

    ctx.body = {
        message: 'Logged Out'
    };
};

const api = async (ctx) => {

    const result = await sendRequest(USER_AUTH_API,
        { username: ctx.request.body.username, password: ctx.request.body.password, authIP: ctx.request.body.authIP }, 'POST', ctx.request.headers.host);

    if(!(result.status === 'success')) {
        ctx.status = 401;
        ctx.body = result;

        return ctx;
    }

    const api_user = (result.roles.findIndex(role => role === 'api_user') > -1);

    if(api_user) {
        ctx.status = 200;
        ctx.body = {
            key: jwt.sign(
                {
                    username: result.username,
                    id: result._id,
                    authIP: ctx.request.body.authIP,
                    scopes: {
                        notify: {
                            actions: ['read', 'create']
                        }
                    }
                },
                API_KEY_SECRET
            ), // key should be in environment variable
            status: 'success'
        };
    } else {
        ctx.status = 401;
        ctx.body = {
            "statusCode": 401,
            "error": "Incorrect Permissions",
            "message": "Please contact your administrator to get the correct permissions if you feel you should have access."
        };
    }
    return ctx;
};

const sendRequest = async (url, body, method, host) => {
    const options = {
        method,
        url,
        body,
        json: true,
        timeout: 5000,
        headers: {
            'x-forwarded-host': host,
        }
    };

    return await Request(options)
        .then((response) => {
            // console.log(response);
            return response;
        })
        .catch((e) => {
            return e.error;
        });
};

module.exports = {
    gateway, api, logout, createUser, acceptInvite, resetPassword
};
