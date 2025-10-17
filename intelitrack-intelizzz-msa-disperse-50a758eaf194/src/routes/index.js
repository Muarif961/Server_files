const Router = require('koa-router');
const NotifierController = require('../controllers/notifier.controller');
const RootRouter = new Router();

RootRouter.get('/notify/:deviceId', NotifierController.getNotification);
RootRouter.post('/notify/:deviceId', NotifierController.getNotification);
RootRouter.post('/testpost', NotifierController.testPost);

module.exports = RootRouter;
