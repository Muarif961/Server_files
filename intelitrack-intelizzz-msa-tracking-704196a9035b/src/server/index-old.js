// Increase pool size to prevent ESOCKETTIMEDOUT errors
process.env.UV_THREADPOOL_SIZE = 128;

require('../config/dotenv');
const Boom = require('@hapi/boom');
const Koa = require('koa');
const Router = require('koa-router');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const sse = require('koa-sse-stream');
// const logger = require('koa-logger');
const logger = require('../utils/logger');

const RootRouter = require('../routes/index');
const DBconnection = require('../connections/mongoose');

const ControllerErrorHandler = require('../middleware/controller-error-middleware');

const PORT = process.env.PORT || 3000;

const Api = new Koa();
const MainRouter = new Router();

MainRouter.use('/api', RootRouter.routes());

const validOrigins = process.env.ORIGINS.split(',');

const verifyOrigin = (ctx) => {
    const origin = ctx.headers.origin;
    if(!originIsValid(origin)) return false;
    return origin;
};

const originIsValid = ( origin ) => {
    return validOrigins.indexOf( origin ) !== -1;
};

const corsConfig = {
    origin: verifyOrigin,
    credentials: true
};

Api
    .use(cors(corsConfig))
    // .use(logger())
    .use(bodyParser())
    .use(sse({
        maxClients: 5000,
        pingInterval: 30000
    }))
    .use( ControllerErrorHandler )
    .use(MainRouter.routes())
    .use(MainRouter.allowedMethods({
        throw: true,
        notImplemented: () => Boom.notImplemented(),
        methodNotAllowed: () => Boom.methodNotAllowed()
    }))
    .use((ctx, next) => {
        const retObj = { statusCode: 404, message: 'Invalid URL!', url: ctx.request.url, status: 'error' };
        logger.info(retObj);
        ctx.status = 404;
        ctx.body = retObj;
        Boom.notFound('Invalid URL!', retObj);
    });

const server = DBconnection
    .then(() => {
        if(process.env.NODE_ENV !== 'test') return Api.listen(PORT, () => {
            logger.log(`Server listening on port: ${PORT}`);
        })
    })
    .catch((error) => {
        error.status = error.statusCode || error.status || 500;
        logger.error(error);
        return Promise.reject(error);
    });

module.exports = server;