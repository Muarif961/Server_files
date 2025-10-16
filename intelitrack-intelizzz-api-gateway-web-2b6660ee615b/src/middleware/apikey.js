const jwt = require('koa-jwt');

const API_KEY_SECRET=process.env.API_KEY_SECRET;

const getTokenFromAPIKey = (ctx) => {
  return ctx.request.headers['api-key'];
};

module.exports = jwt({
    secret: API_KEY_SECRET,
    credentialsRequired: false,
    getToken: getTokenFromAPIKey
});