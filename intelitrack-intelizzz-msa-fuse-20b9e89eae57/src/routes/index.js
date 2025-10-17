const Router = require('koa-router');
const DashboardController = require('../controllers/dashboard.controller');
const LocationsController = require('../controllers/locations.controller');
const DevicesFacadeController = require('../controllers/devices-facade.controller');
const RootRouter = new Router();

RootRouter.get('/dashboard/:jwtdata', DashboardController.dashboardView);
RootRouter.get('/locations/:jwtdata', LocationsController.locationsView);
RootRouter.get('/locations/:startDate/:jwtdata', LocationsController.locationsView);
RootRouter.get('/locations/:startDate/:endDate/:jwtdata', LocationsController.locationsView);
RootRouter.get('/devices/:jwtdata', DevicesFacadeController.devices);
RootRouter.put('/devices/group/:jwtdata', DevicesFacadeController.deviceGroup);

module.exports = RootRouter;