const Boom = require('@hapi/boom');
const logger = require('../utils/logger');

const ErrorHandlers = {
    "ValidationError": (e) => {
        const error = Boom.badRequest(e.message);
        error.output.payload.attributes = e.errors;
        return error;
    }
};

const ControllerErrorHandler = async (ctx, next) => {
    try {
        await next();
    }
    catch(e) {
        let errType = (e.isBoom) ? `${e.output.statusCode}` : e.constructor.name;
        logger.error(e.constructor.name);
        logger.error(`Caught error ${errType}: ${e.message}`);

        let errOutput;
        if(e.isBoom)
            errOutput = e;
        else if(ErrorHandlers[errType] !== undefined)
            errOutput = ErrorHandlers[errType](e);
        else {
            logger.error('Unexpected error, sending 500 to client');
            logger.error('Error Type: ', errType);
            logger.error(e);
            errOutput = Boom.boomify(e, { statusCode: 500 });
            if(e.message !== undefined) {
                // errOutput.output.payload.debug_message = e.message
                errOutput.output.payload.message = e.message;
            }
            if(e.stack !== undefined) {
                // errOutput.output.payload.stack = e.stack;
                errOutput.output.payload.attributes = e.stack;
            }
        }
        ctx.status = errOutput.output.statusCode;
        ctx.body = { ...errOutput.output.payload, status: 'error' } ;
    }
};

module.exports = ControllerErrorHandler;