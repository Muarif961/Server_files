const Router = require('koa-router');
const TrackingController = require('../controllers/sse-tracking.controller');

const RootRouter = new Router();

RootRouter.post('/tracked', TrackingController.tracked);

module.exports = RootRouter;