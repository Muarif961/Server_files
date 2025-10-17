require('../config/dotenv');

const pkg = require('../../package');
console.log(`*** Device Service Version: ${pkg.version} ***`);

const Boom = require('@hapi/boom');
const Koa = require('koa');
const Router = require('koa-router');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
// const logger = require('koa-logger');
const logger = require('../utils/logger');

const RootRouter = require('../routes/index');
const DBconnection = require('../connections/mongoose');

const ControllerErrorHandler = require('../middleware/controller-error-middleware');

const PORT = process.env.PORT || 3000;

const Api = new Koa();
const MainRouter = new Router();

// Middleware to handle API versioning based on custom header
async function versioningMiddleware(ctx, next) {
    const apiVersion = ctx.request.header['internal-api-version'] || '1';
    ctx.state.apiVersion = apiVersion; // Store version in state for downstream use
    await next();
}

MainRouter.use('/api/devices', RootRouter.routes());

Api
    .use(cors())
    // .use(logger())
    .use(bodyParser())
    .use( ControllerErrorHandler )
    .use( versioningMiddleware )
    .use(MainRouter.routes())
    .use(MainRouter.allowedMethods({
        throw: true,
        notImplemented: () => Boom.notImplemented(),
        methodNotAllowed: () => Boom.methodNotAllowed()
    }))
    .use((ctx, next) => {
        const retObj = { statusCode: 404, message: 'Invalid URL!', url: ctx.request.url, status: 'error' };
        logger.error(retObj);
        ctx.status = 404;
        ctx.body = retObj;
        Boom.notFound('Invalid URL!', retObj);
    });

// const server = DBconnection
//     .then(() => {
//         if(process.env.NODE_ENV !== 'test') return Api.listen(PORT, () => {
//             logger.log(`Server listening on port: ${PORT}`);
//         })
//     })
//     .catch((error) => {
//         error.status = error.statusCode || error.status || 500;
//         logger.error(error);
//         return Promise.reject(error);
//     });

const server = DBconnection
    .then(() => {
        if(process.env.NODE_ENV !== 'test') return Api.listen(PORT, () => {
            logger.log(`Server listening on port: ${PORT}`);
        })
    })
    .catch((error) => {
        error.status = error.statusCode || error.status || 500;
        logger.error('Error Starting Server: ', error);
        return Promise.reject(error);
    });

module.exports = server;

//
