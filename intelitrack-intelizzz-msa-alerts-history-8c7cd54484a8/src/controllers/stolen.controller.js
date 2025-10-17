const Boom = require('@hapi/boom');
const StolenHistory = require('../models/stolen.model');

const tempFunc = async (ctx) => {
    ctx.body = { status: 'success' }
};

module.exports = {
    tempFunc
};