const Router = require('koa-router');
const Logger = require('../utils/logger');
const WakeHistoryController = require('../controllers/wakehistory.controller');

const RootRouter = new Router();

RootRouter.get('/:accountId', WakeHistoryController.allWakeHistory);
RootRouter.post('/locations', WakeHistoryController.wakeHistoryByGroup);
RootRouter.put('/group/:accountId', WakeHistoryController.updateGroup);

module.exports = RootRouter;