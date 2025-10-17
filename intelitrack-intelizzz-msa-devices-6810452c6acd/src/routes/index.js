const Router = require('koa-router');
const multer = require('@koa/multer');
const Logger = require('../utils/logger');
const DeviceController = require('../controllers/devices.controller');
const LocatorController = require('../controllers/locator.controller');
const CertificatesController = require('../controllers/certificates.controller');
const InstallerDeviceController = require('../controllers/installer-device.controller');
const DeviceNotesController = require('../controllers/device-notes.controller');
const SelectAllController = require('../controllers/select-all-controller');

const RootRouter = new Router();
const upload = multer({ dest: 'uploads/' });

RootRouter.get('/locator', LocatorController.getLocatorDevices);
RootRouter.get('/found', LocatorController.getFoundDevices);
RootRouter.post('/verify', LocatorController.verifyCode);
RootRouter.post('/addlocator', LocatorController.addToBucket);
RootRouter.put('/locatoroperatingmode/:jwtdata', LocatorController.setOperatingMode);

RootRouter.get('/:accountId', DeviceController.devicesByAccount);
RootRouter.post('/groupsort/:accountId', DeviceController.devicesSortedByGroup);
RootRouter.get('/config/:accountId', DeviceController.configDevicesByAccount);
RootRouter.put('/activate/:jwtdata', DeviceController.activateDevice);
RootRouter.get('/count/:accountId', DeviceController.devicesCount);
RootRouter.get('/data/:deviceId', DeviceController.deviceData);
RootRouter.get('/pending/:deviceId', DeviceController.pending);
RootRouter.put('/assign/:jwtdata', DeviceController.assign);
RootRouter.put('/update/:jwtdata', DeviceController.updateDevice);
RootRouter.put('/tamper/:jwtdata', DeviceController.setTamperState);
RootRouter.put('/clearalert/:jwtdata', DeviceController.clearAlert);
RootRouter.put('/favourite/:jwtdata', DeviceController.setFavourite);
RootRouter.put('/operatingmode/:jwtdata', DeviceController.setOperatingMode);
RootRouter.put('/group/:jwtdata', DeviceController.setGroup);
RootRouter.put('/wakeuptimes/:jwtdata', DeviceController.updateWakeupTimes);
RootRouter.put('/wakeupdays/:jwtdata', DeviceController.updateWakeupDays);
// RootRouter.post('/create', DeviceController.create);
RootRouter.post('/byid', DeviceController.devicesById);
RootRouter.put('/recoverycode/:jwtdata', DeviceController.getRecoveryCode);
RootRouter.put('/clearrecoverycode/:jwtdata', DeviceController.clearRecoveryCode);
RootRouter.put('/reset/:jwtdata', DeviceController.resetDevices);
RootRouter.get('/installationhistory/:jwtdata', InstallerDeviceController.getInstallationHistory);

// Select All
RootRouter.put('/selectall/wakeuptimes/:jwtdata', SelectAllController.selectAllUpdateWakeupTimes);
RootRouter.put('/selectall/operatingmode/:jwtdata', SelectAllController.selectAllSetOperatingMode);
RootRouter.put('/selectall/tamper/:jwtdata', SelectAllController.selectAllSetTamperState);

RootRouter.put('/groupunset/:jwtdata', DeviceController.unsetGroup);

// Remote internal call from Groups
RootRouter.put('/cleargroup', DeviceController.clearGroup);

RootRouter.post('/addcertificate/:jwtdata', CertificatesController.addCertificate);
RootRouter.get('/certificate/:deviceId/:jwtdata', CertificatesController.downloadCertificate);
RootRouter.get('/certificates/:jwtdata', CertificatesController.getCertificates);
RootRouter.delete('/certificates/:jwtdata', CertificatesController.deleteCertificates);

// Device Notes Routes
// RootRouter.post('/note/:jwtdata', DeviceNotesController.addDeviceNote);
RootRouter.get('/notes/:jwtdata', DeviceNotesController.getDeviceNotes);

// Installer Routes
RootRouter.put('/installer/install/:jwtdata', InstallerDeviceController.installDevice);
RootRouter.put('/installer/image', InstallerDeviceController.addDeviceImage);
RootRouter.put('/note/:jwtdata', InstallerDeviceController.addDeviceNote);
RootRouter.put('/installer/uninstall/:jwtdata', InstallerDeviceController.uninstallDevice);
RootRouter.get('/installer/getvindata/:jwtdata', InstallerDeviceController.getVehicleData);
RootRouter.get('/installer/getinstalldata/:jwtdata', InstallerDeviceController.getInstallerQRData);

// Uploader
RootRouter.put('/uploader/stockdata/:jwtdata', upload.any(), InstallerDeviceController.uploadStockData);
RootRouter.put('/uploader/installs/:jwtdata', upload.any(), InstallerDeviceController.uploadDeviceInstall);

// Tags & Filters
RootRouter.put('/tags/:jwtdata', DeviceController.updateTags);
RootRouter.put('/tags/count/:jwtdata', DeviceController.tagCount);
RootRouter.get('/filters/count/:jwtdata', DeviceController.filterCount);

// Automated Notify Stolen
RootRouter.put('/stolen/:jwtdata', DeviceController.addToLocator);

// Select All
RootRouter.put('/thresholdbyid/:jwtdata', DeviceController.updateThresholdById);

// Conference Devices
RootRouter.put('/conf/add', DeviceController.assignConfDevices);

RootRouter.get('/health', DeviceController.healthCheck);

module.exports = RootRouter;
