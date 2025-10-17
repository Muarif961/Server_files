const Router = require('koa-router');
const Logger = require('../utils/logger');
const ReportingController = require('../controllers/reporting.controller');

const RootRouter = new Router();

RootRouter.post('/request/:jwtdata', ReportingController.requestReport);
RootRouter.get('/download/:reportid', ReportingController.downloadReport);
RootRouter.get('/list/:jwtdata', ReportingController.listReports);

module.exports = RootRouter;