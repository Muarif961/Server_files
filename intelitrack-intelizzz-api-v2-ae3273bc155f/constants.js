const BASE_URL = 'https://api.intelitrack.co.uk'; //'http://62.69.69.200';
const LOGIN_ALTERNATE = `${BASE_URL}/Ajax/Login/handler.html`;
module.exports = {
  MONGO_CONSTANTS: {
    prod_url: 'mongodb://srv-captain--intelizzz-mongo:27017',
    dev_url: 'mongodb://localhost',
    db_url: process.env.MONGO_DB_URL || 'mongodb://localhost/intelizzz',
    database: 'intelizzz-v2'
  },
  CMSV2: {
    getToken: (username, password) =>
      `${BASE_URL}/Ajax/Api/StandardApiAction_login?account=${username}&password=${password}`,
    loginAlternate: LOGIN_ALTERNATE,
    getDeviceOnlineStatuses: (deviceName, token) =>
      `${BASE_URL}/Ajax/Api/StandardApiAction_getDeviceOlStatus?jsession=${token}&devIdno=${deviceName}`,
    setWakeUpTimers: (devId, timers, token) =>
      `${BASE_URL}/Ajax/Api/send_gps_order?jsession=${token}&devIdno=${devId}&p1=${timers}`,
    activateSecretTracker: (devId, token) =>
      `${BASE_URL}/Ajax/Api/send_gps_open_order?jsession=${token}&devIdno=${devId}`,
    searchDeviceById: `${BASE_URL}/Ajax/System/vehicles_grid.html`,
    allocateDeviceToGroup: `${BASE_URL}/Ajax/System/vehicles_save.html`
  }
};

// MongoDB is deployed and available as srv-captain--intelizzz-mongo:27017 to other apps.
//  For example with NodeJS: mongoose.connect("mongodb://srv-captain--intelizzz-mongo/mydatabase", { useMongoClient: true });
