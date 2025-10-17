const Boom = require('@hapi/boom');
const AlertHistory = require('../models/alert.model');

const tempFunc = async (ctx) => {
    ctx.body = { status: 'success' }
};

module.exports = {
    tempFunc
};