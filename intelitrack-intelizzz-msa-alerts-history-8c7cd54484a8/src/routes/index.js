const Router = require('koa-router');
const StolenHistoryController = require('../controllers/stolen.controller');
const AlertHistoryController = require('../controllers/alert.controller');

const RootRouter = new Router();

RootRouter.get('/stolen/', StolenHistoryController.tempFunc);
RootRouter.get('/tamper/', AlertHistoryController.tempFunc);

module.exports = RootRouter;