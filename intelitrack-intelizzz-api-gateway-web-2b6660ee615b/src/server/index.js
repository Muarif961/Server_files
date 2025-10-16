require('../config/dotenv');
const Koa = require('koa');
const Router = require('koa-router');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const logger = require('koa-logger');
const proxy = require('koa-proxy');

// Clustering optimisation
const os = require('os');
const numCPUs = os.cpus().length;
const cluster = require('cluster');

const jwt = require('jsonwebtoken');
const auth = require('../middleware/jwt');
const apikey = require('../middleware/apikey');

const methodMap = { 'GET': 'read', 'POST': 'create', 'PUT': 'update', 'DELETE': 'delete' };

const checkAPIAuthorised = (method, path, permissions) => {
    const checkedRoute = path.split('/')[2];
    if(!permissions[checkedRoute]) return false;
    return (permissions[checkedRoute].actions.findIndex(action => action === methodMap[method]) > -1);
};

// TODO: move this out of here?
const authenticate = require('../middleware/authenticate');

const validate = require('../helpers/services-validator');

const API_KEY_SECRET=process.env.API_KEY_SECRET;
const JWT_SECRET=process.env.JWT_SECRET;
const API_PREFIX=process.env.API_PREFIX;

const COOKIE_PREFIX = process.env.COOKIE_PREFIX || 'zzz';

const router = new Router({
    prefix: API_PREFIX
});

const healthSuccess = async (ctx) => { ctx.body = { message: 'success'}};

router.get('/healthcheck', healthSuccess);

// TODO: move this out of here?
router.post('/authenticate', authenticate.gateway);
router.post('/getkey', authenticate.api);
router.get('/logout', authenticate.logout);
router.post('/user/register', authenticate.createUser);
router.put('/user/accept', authenticate.acceptInvite);
router.put('/user/reset', authenticate.resetPassword);

const context = process.env.CONTEXT ? process.env.CONTEXT : 'services';
const config = require(`./contexts/${context}.json`)

const PORT = process.env.PORT || 80;

const app = new Koa();

const stats = {
    total: 0,
    enabled: 0,
    disabled: 0,
};

const corsOptions = {
    credentials: true
};

app.use(cors(corsOptions));
app.use(logger());
app.use(async (ctx, next) => {
    if (
        !(ctx.path === '/api/authenticate')
        && !(ctx.path === '/api/getkey')
        && !(ctx.path === '/api/user/register')
        && !(ctx.path === '/api/user/accept')
        && !(ctx.path === '/api/user/reset')
    ) {
        ctx.disableBodyParser = true;
    }

    ctx.set('Cross-Origin-Embedder-Policy', 'require-corp');
    ctx.set('Cross-Origin-Opener-Policy','same-origin');

    await next();
});
app.use(bodyParser());

// Simple validation function
validate(config);

/**
 * Configure the services as per the services.json file
 */
config.services.forEach((service) => {
    const middlewares = [];
    let decoded;

    // If it's a protected route, add the auth middleware
    if(service.protectedRoute && !service.appendAccount) {
        // middlewares.push(() => {console.log('hah!', auth); return auth});
        middlewares.push(async (ctx, next) => {
            const prefix = COOKIE_PREFIX + (ctx.request.headers.prefix || '');
            // console.log('PREFIX: ', prefix);
            // console.log(ctx.cookies);

            if(!ctx.cookies.get(prefix)) {
                ctx.body = {
                    "statusCode": 401,
                    "error": "Unauthorized",
                    "message": "Unauthorized access to this page."
                };
            } else {
                decoded = jwt.verify(ctx.cookies.get(prefix), JWT_SECRET);
                await next();
            }
        })
    }

    if(service.externalAPI) {
        middlewares.push(apikey);

        // TODO: IP whitelisting??
        middlewares.push(async (ctx, next) => {
            decoded = jwt.verify(ctx.headers['api-key'], API_KEY_SECRET);

            // Check the route is authorised for this user (set in the JWT token)
            const authorised = checkAPIAuthorised(ctx.method, ctx.request.url, decoded.scopes);

            if(!authorised) {
                ctx.status = 401;
                ctx.body = {
                    "statusCode": 401,
                    "error": "Unauthorized",
                    "message": "You do not have permission to access this resource. Please contact your administrator if you feel this is a mistake."
                };
            } else {
                await next();
            }
        })
    }

    // If an account id is required for the request, add the middleware to apply it
    if(service.protectedRoute && service.appendAccount) {
        middlewares.push(async (ctx, next) => {
            const prefix = COOKIE_PREFIX + (ctx.request.headers.prefix || '');
            decoded = jwt.verify(ctx.cookies.get(prefix), JWT_SECRET);
            // console.log('decoded: ', decoded);
            ctx.url = ctx.url + '/' + decoded.accountId;
            await next();
        })
    }

    // If an jwt datarequired for the request, add the middleware to apply it
    if(service.protectedRoute && service.appendJWT) {
        middlewares.push(async (ctx, next) => {
            const prefix = COOKIE_PREFIX + (ctx.request.headers.prefix || '');
            decoded = jwt.verify(ctx.cookies.get(prefix), JWT_SECRET);
            // console.log(decoded);

            // We have to re-create the query params to apply to the end
            const queryParams = Object.keys(ctx.request.query);
            let queryString = '';

            if(queryParams.length > 0) {
                queryString += '?';
                queryParams.forEach(query => {
                    if(queryString !== '?') queryString += '&';
                    queryString += `${query}=${ctx.request.query[query]}`
                })
            }

            let ctxUrl = ctx.path + '/' + decoded.accountId + ':' + decoded.id;
            if(decoded.parentId) ctxUrl += ':' + decoded.parentId;

            console.log(ctxUrl);

            ctx.url = ctxUrl + queryString;
            await next();
        })
    }

    // Proxy to

    // If we don't have a service yet or we want to temporarily disable one, we can return mock responses
    if(!service.enabled) {
        middlewares.push(async (ctx) => {
                ctx.body = service.response;
            });
    } else {
        const url = process.env[service.name] || 'http://';

        // If we have a service url and it's not a mock, use the service to get the response
        middlewares.push(proxy({
                host: url
            }));
    }

    // The types are set in the services.json file and can be the usual "get", "post", "put", "delete", etc
    service.types.forEach((type) => {
        const url = process.env[service.name] || 'http://';
        console.info(`Registering service: '${url}' | Path: '${service.path}' | Type: ${type.toUpperCase()} | Enabled: ${service.enabled.toString().toUpperCase()}`);

        router[type](service.path, ...middlewares);

        stats.total++;
        service.enabled ? stats.enabled ++ : stats.disabled++;
    });
});

console.info(`\nServices Registered: ${stats.total} | Enabled: ${stats.enabled} | Disabled: ${stats.disabled}\n`);

app.use(router.routes());

if (cluster.isMaster) {
    console.log(`This machine has ${numCPUs} CPUs.`);
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("online", (worker) => {
        console.log(`Worker ${worker.process.pid} is online`);
    });

    cluster.on("exit", (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died with code: ${code} and signal: ${signal}`);
        console.log("Starting a new worker...");
        cluster.fork();
    });

} else {
    const index = app.listen(PORT, () => {
        console.log(`Server listening on port: ${PORT}`);
    });
}

// module.exports = index;
