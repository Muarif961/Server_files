const Router = require('koa-router');
const GeofenceController = require('../controllers/geofence.controller');

const RootRouter = new Router();

RootRouter.post('/geofences/:jwtdata', GeofenceController.setGeofence);
RootRouter.put('/geofences/devices/:jwtdata', GeofenceController.updateGeofenceDevices);
RootRouter.get('/geofences/:jwtdata', GeofenceController.listGeofences);
RootRouter.get('/geofences/devices/:geofenceId/:jwtdata', GeofenceController.getGeofenceDevices);

module.exports = RootRouter;

