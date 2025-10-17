require('../config/dotenv');
const Boom = require('@hapi/boom');
const Koa = require('koa');
const Router = require('koa-router');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
// const logger = require('koa-logger');
const logger = require('../utils/logger');

const RootRouter = require('../routes/index');


const ControllerErrorHandler = require('../middleware/controller-error-middleware');

const PORT = process.env.PORT || 3000;

const Api = new Koa();
const MainRouter = new Router();

MainRouter.use('/api', RootRouter.routes());

Api
    .use(cors())
    // .use(logger())
    .use(bodyParser())
    .use( ControllerErrorHandler )
    .use(MainRouter.routes())
    .use(MainRouter.allowedMethods({
        throw: true,
        notImplemented: () => Boom.notImplemented(),
        methodNotAllowed: () => Boom.methodNotAllowed()
    }))
    .use((ctx, next) => {
        const retObj = { statusCode: 404, message: 'Invalid URL!', url: ctx.request.url, status: 'error' };
        // logger.info(retObj);
        ctx.status = 404;
        ctx.body = retObj;
        Boom.notFound('Invalid URL!', retObj);
    });

const server = Api.listen(PORT, () => {
    logger.log(`Server listening on port: ${PORT}`);
});

module.exports = server;