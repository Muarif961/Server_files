const Router = require('koa-router');
const TrackingController = require('../controllers/sse-tracking.controller');

const RootRouter = new Router();

RootRouter.get('/tracking/health', TrackingController.healthCheck);
RootRouter.get('/live/tracking', TrackingController.sseTracking);
RootRouter.post('/tracked', TrackingController.tracked);
RootRouter.post('/locatortracked', TrackingController.trackedById);
RootRouter.delete('/tracking/:jwtdata', TrackingController.deleteTrackings);

module.exports = RootRouter;
