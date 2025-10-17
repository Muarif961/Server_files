const Boom = require('@hapi/boom');
const csvParser = require('csv-parser');
const Mongoose = require('mongoose');
const fs = require('fs');
const vinDecoder = require('vin-decode').default;
const Device = require('../models/device.model');
const Account = require('../models/account.model');
const Note = require('../models/notes.model');
const Producer = require('../producer');
// const LogAction = require('../models/log-action.model');
const InstallationHistory = require('../models/installation-history.model');
const InstallerSetting = require('../models/installer-settings.model');
const Group = require('../models/group.model');
const User = require('../models/user.model');
const StockData = require('../models/stock-data.model');
const VinFetcher = require('../utils/vin-fetcher');
const Bloodhound = require('../utils/bloodhound');
const LogAction = require('../models/log-action.model');
const {simplifyId} = require("../utils/device");
const IntegrationData = require("../utils/integration-data");
const {sendToWebHook} = require("../utils/integration-data");
const logger = require("../utils/logger");
const { getAccountInstallerTimes } = require("../utils/timezone-helper");


const hdopGeneral = process.env.GNSS_HDOP_GENERAL || {};
const hdopTracking = process.env.GNSS_HDOP_TRACKING || {};

const loggingLevel = process.env.LOGGING_LEVEL || 'basic';

const INSTALLER_ID = process.env.INSTALLER_ACCOUNT_ID;

const MAX_WAKEUPS_LENGTH = 4;

const KAFKA_TOPIC = process.env.KAFKA_TOPIC;
const KAFKA_URL = process.env.KAFKA_URL;

const producer = Producer.create(KAFKA_URL);

const installDevice = async (ctx, next) => {
    const [accountId, userId] = ctx.params.jwtdata.split(':');
    const {_id, groupId, siteId, vin, plate, stockNumber, data, category, installCode, note, nameDevice, locationId, mco, deviceId, timezone} = ctx.request.body;
    const extraData = {};
    const wakeupDays = 'MTWTFSS';

    const _deviceId = _id || deviceId;

    if(stockNumber) {
        extraData.stockNumber = stockNumber;
    }

    const _data = data ? data : (await getStockData({vin: vin, stockId: stockNumber, ignoreExternalVIN: true}) || {}).response;

    const getMCO = async (mcoName, accountId) => {
        if(!mcoName) return null;

        const MCOObject = await Group.findOne({accountId: accountId, name: mcoName});

        return MCOObject && MCOObject._id && MCOObject._id.toLocaleString();
    }

    const InstallerUser = await User.findOne({accountId: accountId, _id: new Mongoose.Types.ObjectId(userId)});
    const Upfitter = InstallerUser.roles.includes("upfitter_user");

    const GroupIDObj = (_data && _data.MCO) ? await Group.findOne({accountId: accountId, name: _data.MCO}) : null;
    const _groupId = GroupIDObj ? GroupIDObj._id : null;

    const InstallerSettingObj = await InstallerSetting.findOne({accountId: accountId});
    const _siteId = siteId || _groupId || (await getMCO(mco, accountId)) || (Upfitter && (InstallerSettingObj && InstallerSettingObj.defaultInstallationGroup));

    const vehicleData = {..._data, ...extraData};

    const logActionObj = {
        userId,
        accountId,
        category: 'INSTALLERDEVICE',
        action: 'InstallDevice',
        data: JSON.stringify({
            deviceId: _deviceId,
            installerId: userId,
            groupId: groupId,
            siteId: _siteId,
            vin: vin,
            plate: plate,
            stockNumber: stockNumber,
            category: category,
            vehicleData: vehicleData,
            installCode: installCode,
            nameDevice: nameDevice,
            locationId: locationId,
            note: note,
            timezone: timezone,
            wakeupDays: wakeupDays
        }),
        date: new Date()
    };

    if(!_siteId) {
        logActionObj.success = false;
        logActionObj.error = Upfitter ? `The user is an Upfitter user and no site id was supplied and no default installation group exists.` : `The user is not an Upfitter and no site id was supplied.`;
        await (LogAction.create(logActionObj));
        throw Boom.notFound(logActionObj.error, {
            _deviceId,
            modelName: 'Device'
        });
    }

    const Installed = await Device.findOne({ _id: _deviceId });

    if (!Installed) {
        const errorMessage = `The device ${_deviceId} does not exist. Please check the device ID is correct or contact support.`;
        logActionObj.success = false;
        logActionObj.error = errorMessage;
        await LogAction.create(logActionObj);
        throw Boom.notFound(errorMessage, { _deviceId, modelName: 'Device' });
    }

    if (Installed && (!Installed.accountId || Installed.accountId.toString() !== accountId)) {
        const errorMessage = `The device ${_deviceId} exists but is not linked to your account. Please check the device ID or ensure it's added to your account before installing.`;
        logActionObj.success = false;
        logActionObj.error = errorMessage;
        await LogAction.create(logActionObj);
        throw Boom.notFound(errorMessage, { _deviceId, modelName: 'Device' });
    }

    const isVinMatch = vin && (
        (Installed.vin === vin) ||
        (Installed.vehicleData && Installed.vehicleData.VIN === vin)
    );

    if (Installed.installed && !isVinMatch) {
        let vehicleLabel = Installed.vehicleData?.stockNumber || Installed.name || '';
        if (Installed.vin) vehicleLabel = vehicleLabel ? `${vehicleLabel} ${Installed.vin}` : Installed.vin;

        const errorMessage = `The device ${_deviceId} is already installed in vehicle ${vehicleLabel}. Please uninstall this device before attempting to install again.`;
        logActionObj.success = false;
        logActionObj.error = errorMessage;
        await LogAction.create(logActionObj);
        throw Boom.notFound(errorMessage, { _deviceId, modelName: 'Device' });
    }

    const setQuery = {
        pendingOperatingMode: 'Normal',
        pendingTamperState: 'On',
        pendingWakeupDays: wakeupDays,
        vin: vin,
        plate: plate,
        installCode,
        category,
        vehicleData: vehicleData,
        groupId: _siteId,
        installedBy: userId,
        installed: true,
        installationDate: new Date(),
        locationId: locationId,
        name: nameDevice || stockNumber || _data.EquipmentTrimID || '',
        setHibernate: false
    };

    const deviceData = {
        name: null,
        vehicleData: null
    };

    if (isVinMatch) {
        logActionObj.data = logActionObj.data + ` | The device ${_deviceId} is already installed with matching VIN. Installation was skipped, but note saved.`
        deviceData.name = Installed.name;
        deviceData.vehicleData = Installed.vehicleData;
    } else {
        const DBObj = await Device.findOneAndUpdate(
            { _id: _deviceId, accountId },
            { $set: setQuery },
            { new: true, useFindAndModify: false }
        );

        deviceData.name = DBObj.name;
        deviceData.vehicleData = DBObj.vehicleData;

        await Bloodhound.setOperatingMode(_deviceId, 'Normal');
        await Bloodhound.setGNSSQuality(_deviceId, hdopGeneral.GNSSQuality, hdopGeneral.GNSSHDOP);
        await Bloodhound.setGNSSTimeout(_deviceId, hdopGeneral.GNSSTimeout);
        await Bloodhound.setTamper(_deviceId, 'On');

        // Check for account installer times first
        let updateTimes = null;
        if (timezone) {
            updateTimes = await getAccountInstallerTimes(accountId, timezone);
        }

        // Fall back to current wake times if no installer times found
        if (!updateTimes) {
            const wakeTimesResult = await Bloodhound.getWakeTimes(_deviceId);
            if (wakeTimesResult) {
                updateTimes = Array.from({ length: MAX_WAKEUPS_LENGTH }, (_, i) => wakeTimesResult['WakeupTime' + (i + 1)] || null);
            } else if (Installed && Installed.wakeupTimes) {
                updateTimes = Installed.wakeupTimes;
            }
        }

        if (DBObj && updateTimes) {
            const finalUpdateTimes = [...updateTimes.slice(0, MAX_WAKEUPS_LENGTH)];
            while (finalUpdateTimes.length < MAX_WAKEUPS_LENGTH) {
                finalUpdateTimes.push(null);
            }
            await Bloodhound.setWakeTimes(_deviceId, finalUpdateTimes, wakeupDays);
            
            // Set pendingWakeTimes in the database
            await Device.findOneAndUpdate(
                { _id: _deviceId, accountId },
                { $set: { pendingWakeupTimes: finalUpdateTimes } },
                { new: true, useFindAndModify: false }
            );
        }

        try {
            const integrationData = await IntegrationData.combineIntegrationData(DBObj, _siteId, note, true);
            await sendToWebHook(integrationData);
        } catch (e) {
            logger.error('Error pushing Installer data to webhook for device: ', _deviceId, e);
        }
    }

    if (note) {
        try {
            await Note.create({ userId, accountId, deviceId: _deviceId, name: deviceData.name, vin, plate, note, date: new Date() });
        } catch (e) {
            logger.error('Error logging note for device: ', _deviceId, note, e);
        }
    }

    logActionObj.success = true;
    await LogAction.create(logActionObj);

    ctx.body = {
        result: {
            _id: _deviceId,
            name: deviceData.name,
            vin,
            plate,
            category,
            _siteId,
            installCode,
            locationId,
            data: deviceData.vehicleData,
            note
        },
        status: 'success'
    };
};

const addDeviceNote = async (ctx, next) => {
    const [accountId, userId] = ctx.params.jwtdata.split(':');
    const {deviceId, note} = ctx.request.body;
    let status = 'success';
    let error;

    const DBObj = await Device.findOne({_id: deviceId, accountId: accountId});

    if (!DBObj || DBObj.length === 0) {
        throw Boom.notFound(`Unable to find any devices with device ID ${deviceId}. Please check and try again.`, {
            deviceId: deviceId,
            modelName: 'Device'
        });
    }
    const name = DBObj.name || '';

    const body = {
        status: status,
    }

    if(note && deviceId) {
        const currentDate = new Date();
        body.result = { deviceId: deviceId, name: name, note: note, date: currentDate, userId: userId, accountId: accountId };
        try {
            const NoteObj = await Note.create({userId, accountId, deviceId: deviceId, name: name, note, date: currentDate });
        } catch (e) {
            logger.error('Error logging note for device: ', e, deviceId, note);
            status = 'error';
            error = e;
        }
    }

    if(status === 'error') {
        body.error = error;
    }

    ctx.body = body;
};

const addDeviceImage = async (ctx, next) => {
    ctx.body = {};
};

const uninstallDeviceV2 = async (ctx, next) => {
    const [accountId, userId] = ctx.params.jwtdata.split(':');
    const {installCode, plate, vin, deviceId, groupId, siteId, locationId} = ctx.request.body;
    const wakeupDays = 'MXXTXXX';

    const logActionObj = {
        userId: userId,
        accountId: accountId,
        pendingWakeupDays: wakeupDays,
        category: 'INSTALLERDEVICE',
        action: 'UninstallDevice'
    };

    if(!(installCode || plate || vin || deviceId)) {
        logActionObj.success = false;
        logActionObj.error = `No identifier supplied to remove the device, this should be an installation QR code, license plate, vin, etc.`;
        await (LogAction.create(logActionObj));
        throw Boom.badRequest(`No identifier supplied to remove the device, this should be an installation QR code, license plate, vin, etc.`, {
            modelName: 'Device'
        });
    }

    if((plate || vin) && !deviceId) {
        logActionObj.success = false;
        logActionObj.error = `No device ID supplied with license plate or vin.`;
        await (LogAction.create(logActionObj));
        throw Boom.badRequest(`No device ID supplied with license plate or vin.`, {
            modelName: 'Device'
        });
    }

    const updateQuery = {
        $set: {
            installed: false,
            pendingOperatingMode: 'Shipping',
            pendingTamperState: 'Off',
            pendingWakeupDays: wakeupDays
        },
        $unset: {
            installCode: 1,
            vin: 1,
            plate: 1,
            vehicleData: 1,
            category: 1,
            locationId: 1,
        }
    };

    const matchQuery = {
        accountId: accountId,
    }

    if(siteId) {
        matchQuery.groupId = siteId;
    }

    if(installCode) {
        matchQuery.installCode = installCode;
    }

    if(plate) {
        matchQuery.plate = plate;
    }

    if(vin) {
        matchQuery.vin = vin;
    }

    if(deviceId) {
        matchQuery._id = deviceId;
    }

    logger.info('uninstallDeviceV2 - Find device query: ', matchQuery);

    const ArchiveObj = await Device.findOne(matchQuery);

    if (!ArchiveObj || ArchiveObj.length === 0) {
        logActionObj.success = false;
        logActionObj.error = `Unable to find any devices assigned with any of the provided identifiers. Please contact support.`;
        await (LogAction.create(logActionObj));
        throw Boom.notFound(`Unable to find any devices assigned with any of the provided identifiers. Please contact support.`, {
            modelName: 'Device'
        });
    }

    // if(ArchiveObj && ArchiveObj.name === ArchiveObj.vehicleData.stockNumber) {
    //     updateQuery.name = '';
    // }

    if(ArchiveObj && ArchiveObj.groupId) {
        const GroupObj = await Group.findOne({_id: ArchiveObj.groupId});

        updateQuery.$set.groupId = GroupObj && GroupObj.parentId ? GroupObj.parentId : null;
    } else {
        updateQuery.$set.groupId = null;
    }

    if(ArchiveObj && ArchiveObj._id) {
        updateQuery.$set.name = '';

        logActionObj.data = JSON.stringify({
            deviceId: ArchiveObj._id,
            installCode: installCode,
            wakeupDays: wakeupDays,
            vin: vin,
            plate: plate,
            installerId: userId,
            groupId: ArchiveObj.groupId,
            siteId: siteId,
            locationId: locationId,
            stagingAreaGroup: updateQuery.$set.groupId,
        });
    }

    const DBObj = await Device.findOneAndUpdate(matchQuery, updateQuery, {new: true, useFindAndModify: false});

    // Set device to Shipping operating mode
    await Bloodhound.setOperatingMode(ArchiveObj._id, 'Shipping');

    // Set tamper alerts to off
    await Bloodhound.setTamper(ArchiveObj._id, 'Off');

    const wakeTimesResult = await Bloodhound.getWakeTimes(ArchiveObj._id);
    let updateTimes = null;

    if (wakeTimesResult) {
        updateTimes = Array.from({ length: 1 }, (_, i) => wakeTimesResult['WakeupTime' + (i + 1)] || null);
    } else if (ArchiveObj && ArchiveObj.wakeupTimes) {
        updateTimes = ArchiveObj.wakeupTimes;
    }

    if (DBObj && updateTimes) {
        const finalUpdateTimes = [...updateTimes.slice(0, 1)];
        await Bloodhound.setWakeTimes(ArchiveObj._id, finalUpdateTimes, wakeupDays);
        
        // Set pendingWakeTimes in the database
        await Device.findOneAndUpdate(
            { _id: ArchiveObj._id, accountId },
            { $set: { pendingWakeupTimes: finalUpdateTimes } },
            { new: true, useFindAndModify: false }
        );
    }

    const installHistoryObj = {
        deviceId: ArchiveObj._id,
        accountId: ArchiveObj.accountId,
        groupId: ArchiveObj.groupId,
        name: ArchiveObj.name,
        vin: ArchiveObj.vin,
        plate: ArchiveObj.plate,
        category: ArchiveObj.category,
        vehicleData: ArchiveObj.vehicleData,
        installCode: ArchiveObj.installCode,
        installedBy: ArchiveObj.installedBy,
        installationDate: ArchiveObj.installationDate,
        locationId: ArchiveObj.locationId,
        removalDate: new Date()
    };

    await InstallationHistory.create(installHistoryObj);

    logActionObj.success = true;
    logActionObj.date = new Date();

    await (LogAction.create(logActionObj));

    const result = {
        groupId: groupId,
    }

    if(installCode) result.installCode = installCode;
    if(vin) result.vin = vin;
    if(plate) result.plate = plate;

    const removeObj = {
        _id: ArchiveObj._id,
        accountId: ArchiveObj.accountId,
        name: '',
        installedBy: userId,
        installationDate: installHistoryObj.removalDate,
    };

    try {
        const integrationData = await IntegrationData.combineIntegrationData({ ...DBObj.toObject(), ...removeObj }, updateQuery.$set.groupId, null, false);
        await sendToWebHook(integrationData);
    } catch (e) {
        logger.error('Error pushing Remover data to webhook for device: ', ArchiveObj._id, e)
    }

    return {
        result: result, status: 'success'
    };
};

const uninstallDeviceV1 = async (ctx, next) => {
    const [accountId, userId] = ctx.params.jwtdata.split(':');
    const {installCode, groupId, siteId} = ctx.request.body;
    const wakeupDays = 'MXXTXXX';

    const logActionObj = {
        userId: userId,
        accountId: accountId,
        category: 'INSTALLERDEVICE',
        action: 'UninstallDevice'
    };

    const updateQuery = {
        installed: false,
        pendingOperatingMode: 'Shipping',
        pendingTamperState: 'Off',
        pendingWakeupDays: wakeupDays,
        $unset: {
            installCode: 1,
            vin: 1,
            plate: 1,
            vehicleData: 1,
            category: 1,
            groupId: 1,
        }
    };

    const ArchiveObj = await Device.findOne({accountId, installCode, groupId: siteId});

    if(ArchiveObj && ArchiveObj.name === ArchiveObj.vehicleData.stockNumber) {
        updateQuery.name = '';
    }

    if(ArchiveObj && ArchiveObj._id) {
        logActionObj.data = JSON.stringify({
            deviceId: ArchiveObj._id,
            installCode: installCode,
            installerId: userId,
            groupId: groupId,
            siteId: siteId,
        });
    }

    const DBObj = await Device.findOneAndUpdate({accountId, installCode}, updateQuery, {new: true, useFindAndModify: false});

    if (!DBObj || DBObj.length === 0) {
        logActionObj.success = false;
        logActionObj.error = `Unable to find any devices assigned to installer code ${installCode}. Please contact support.`;
        await (LogAction.create(logActionObj));
        throw Boom.notFound(`Unable to find any devices assigned to installer code ${installCode}. Please contact support.`, {
            installerCode: installCode,
            modelName: 'Device'
        });
    }

    // Set device to Shipping operating mode
    await Bloodhound.setOperatingMode(ArchiveObj._id, 'Shipping');

    // Set tamper alerts to off
    await Bloodhound.setTamper(ArchiveObj._id, 'Off');

    const wakeTimesResult = await Bloodhound.getWakeTimes(ArchiveObj._id);
    let updateTimes = null;

    if (wakeTimesResult) {
        updateTimes = Array.from({ length: 1 }, (_, i) => wakeTimesResult['WakeupTime' + (i + 1)] || null);
    } else if (ArchiveObj && ArchiveObj.wakeupTimes) {
        updateTimes = ArchiveObj.wakeupTimes;
    }

    if (DBObj && updateTimes) {
        const finalUpdateTimes = [...updateTimes.slice(0, 1)];
        await Bloodhound.setWakeTimes(ArchiveObj._id, finalUpdateTimes, wakeupDays);
        
        // Set pendingWakeTimes in the database
        await Device.findOneAndUpdate(
            { _id: ArchiveObj._id, accountId },
            { $set: { pendingWakeupTimes: finalUpdateTimes } },
            { new: true, useFindAndModify: false }
        );
    }

    const installHistoryObj = {
        deviceId: ArchiveObj._id,
        accountId: ArchiveObj.accountId,
        groupId: ArchiveObj.groupId,
        name: ArchiveObj.name,
        vin: ArchiveObj.vin,
        plate: ArchiveObj.plate,
        category: ArchiveObj.category,
        vehicleData: ArchiveObj.vehicleData,
        installCode: ArchiveObj.installCode,
        installedBy: ArchiveObj.installedBy,
        installationDate: ArchiveObj.installationDate,
        removalDate: new Date()
    };

    await InstallationHistory.create(installHistoryObj);

    logActionObj.success = true;
    logActionObj.date = new Date();

    await (LogAction.create(logActionObj));

    return {
        result: {installCode, groupId}, status: 'success'
    };
};

const uninstallDevice = async (ctx, next) => {
    switch(ctx.state.apiVersion) {
        case '1':
            ctx.body = await uninstallDeviceV1(ctx, next);
            break;
        case '2':
            ctx.body = await uninstallDeviceV2(ctx, next);
            break;
        default:
            throw Boom.badRequest(`Unsupported API version.`, {});
    }
}

const removeDeviceNotes = async () => {
    ctx.body = {};
};

const removeDeviceImages = async () => {
    ctx.body = {};
};

const getVinData = async (_vin) => {
    const vin = _vin && _vin[0] === 'I' ? _vin.substring(1) : _vin;
    const response = {};

    response.data = await VinFetcher.fetchUS(vin);

    if(response.data && response.data.data && response.data.message && response.data.message.code === 0) {
        response.response = { ...response.data.data, responseType: 'vin'};
        response.status = "success"
    }

    if(!response.status && (response.data && response.data.message && response.data.message.code) === 1001) {
        response.response = {
            message: 'Invalid VIN format'
        };

        response.status = "error";
    }

    response.data = response.status ? response.data : await VinFetcher.fetchUK(vin);

    if(!response.status && response.data && response.data.DataItems && Object.keys(response.data.DataItems).length > 0) {
        const items = response.data.DataItems;

        response.response = {
            year: items.VehicleRegistration.YearOfManufacture,
            make: items.VehicleRegistration.Make,
            model: items.VehicleRegistration.Model,
            colour: items.VehicleRegistration.Colour,
            manufacturer: items.VehicleRegistration.Make,
            engine: items.SmmtDetails.EngineCapacity,
            trim: items.ClassificationDetails.Smmt.Trim,
            transmission: items.SmmtDetails.Transmission,
            responseType: 'vin'
        };
        response.status = "success";
    }

    if(!response.status) {
        response.response = { message: 'VIN not found'};
        response.status = "error";
    }

    return response;
};

const getLicensePlateData = async (plate) => {
    const response = {};

    response.data = await VinFetcher.fetchUK(plate, 'plate');

    if(!response.status && response.data && response.data.DataItems && Object.keys(response.data.DataItems).length > 0) {
        const items = response.data.DataItems;

        response.response = {
            year: items.VehicleRegistration.YearOfManufacture,
            make: items.VehicleRegistration.Make,
            model: items.VehicleRegistration.Model,
            colour: items.VehicleRegistration.Colour,
            manufacturer: items.VehicleRegistration.Make,
            engine: items.SmmtDetails.EngineCapacity,
            trim: items.ClassificationDetails.Smmt.Trim,
            transmission: items.SmmtDetails.Transmission,
            responseType: 'plate'
        };
        response.status = "success";
    }

    if(!response.status) {
        response.response = { message: 'License plate not found'};
        response.status = "error";
    }

    return response;
};

const getStockData = async (identifier) => {
    const response = {};
    const {stockId, vin, ignoreExternalVIN} = identifier;
    const query = {};

    if(!stockId && !vin) {
        response.response = { message: `Missing stock number.`};
        response.status = "error";

        return response;
    }

    if (stockId && !vin) {
        query.$or = [
            { EquipmentTrimID: stockId.toUpperCase() },
            { VIN: stockId }
        ];
    } else {
        if (stockId) {
            query.EquipmentTrimID = stockId.toUpperCase();
        }
        if (vin) {
            query.VIN = vin;
        }
    }

    const DBObj = await StockData.findOne(query);

    if(DBObj) {
        response.response = {
            // EquipmentTrimID: DBObj.EquipmentTrimID,
            // Model: DBObj.Model,
            // VIN: DBObj.VIN,
            // LicensePlateNumber: DBObj.LicensePlateNumber,
            // RotationMCO: DBObj.RotationMCO,
            // RotationEntityCode: DBObj.RotationEntityCode,
            // CurrentMCO: DBObj.CurrentMCO,
            // CurrentEntityCode: DBObj.CurrentEntityCode,
            // OEM: DBObj.OEM,
            // ManufactureYear: DBObj.ManufactureYear,
            ...DBObj._doc,
            responseType: 'stockdata'
        };
        response.status = "success";
    }

    if(!DBObj && vin && !ignoreExternalVIN) {
        const _response = await getVinData(vin);
        response.response = _response.response;
        response.status = _response.status;
    }

    if(!response.status) {
        response.status = "success";
    }

    return response;
}

const getVehicleData = async (ctx, next) => {
    const [accountId, userId] = ctx.params.jwtdata.split(':');
    const groupId = ctx.request.query.group;
    const siteId = ctx.request.query.site;

    const formatIdentifier = (identifier) => {
        if(!identifier) return;

        return identifier.toUpperCase();
    }

    logger.info('getVehicleData - Request Query: ', ctx.request.query);

    const getData = {
        'plate': getLicensePlateData,
        'vin': getVinData,
        'stock': getStockData,
    };

    const getIdentifier = (query) => {
        const res = {};
        if(query.plate) {
            res.identifier = formatIdentifier(query.plate);
            res.type = 'plate';
        }
        if(query.vin) {
            res.identifier = formatIdentifier(query.vin);
            res.type = 'vin';

        }
        if(query.stockCode) {
            res.identifier = { stockId: formatIdentifier(query.stockCode) };
            res.type = 'stock';
        }
        if(query.stockvin) {
            res.identifier = { vin: formatIdentifier(query.stockvin) };
            res.type = 'stock';
        }
        if(query.stockvinonly || query.stockonlyvin) {
            res.identifier = { vin: formatIdentifier(query.stockvinonly) || formatIdentifier(query.stockonlyvin), ignoreExternalVIN: true };
            res.type = 'stock';
        }

        return res;
    }

    const { identifier, type } = getIdentifier(ctx.request.query);

    // console.log(type, identifier);

    const typeObj = {};

    if(identifier) {
        typeObj[type] = identifier;
    }

    // const response = type === 'plate' ? await getLicensePlateData(identifier) : await getVinData(identifier);

    const response = type && identifier ? await getData[type](identifier) : { response: { message: 'Type and Identifier not found'}, status: 'error' };

    ctx.body = {
        result: { ...response.response, ...typeObj },
        status: response.status
    }
};

const getInstallerQRData = async (ctx, next) => {
    const [accountId, userId] = ctx.params.jwtdata.split(':');
    const groupId = ctx.request.query.group;
    const siteId = ctx.request.query.site;
    const installCode = ctx.request.query.code;
    const plate = ctx.request.query.plate;
    const vin = ctx.request.query.vin;
    const stockCode = ctx.request.query.stockCode;
    const deviceId = ctx.request.query.deviceId;

    // TODO: Validate code

    const logActionObj = {
        userId,
        accountId,
        category: 'INSTALLERDEVICE',
        action: 'GetInstallerQRData',
        data: JSON.stringify({
            installerId: userId,
            groupId: groupId,
            siteId: siteId,
            installCode: installCode,
            plate: plate,
            vin: vin,
            stockCode: stockCode,
            deviceId: deviceId,
        }),
        date: new Date()
    };

    // if (accountId !== INSTALLER_ID) {
    //     logActionObj.error = 'This account is unauthorised to perform installation services.';
    //     logActionObj.success = false;
    //     await (LogAction.create(logActionObj));
    //     throw Boom.unauthorized('This account is unauthorised to perform installation services.', {
    //         installCode: installCode,
    //         accountId,
    //         modelName: 'Device'
    //     });
    // }

    // if (!groupId || !siteId) {
    //     logActionObj.error = 'You must be logged into a site to perform this action.';
    //     logActionObj.success = false;
    //     await (LogAction.create(logActionObj));
    //     throw Boom.badRequest('You must be logged into a site to perform this action.', {
    //         installCode: installCode,
    //         accountId,
    //         modelName: 'Device'
    //     });
    // }

    const matchDeviceData = {
        accountId,
        // groupId: siteId,
    }

    if(installCode) matchDeviceData.installCode = installCode.toUpperCase();
    if(plate) matchDeviceData.plate = plate.toUpperCase();
    if(vin) matchDeviceData.vin = vin.toUpperCase();
    if(deviceId) matchDeviceData._id = deviceId;
    if(stockCode) matchDeviceData["vehicleData.stockNumber"] = stockCode.toUpperCase();

    // console.log('QUERY: ', JSON.stringify(matchDeviceData, null, 2));

    const DeviceData = await Device.findOne(matchDeviceData);

    // console.log('DEVICE DATA: ', DeviceData);

    if (!DeviceData) {
        logActionObj.success = false;
        logActionObj.error = `No devices installed with those details or device is not installed.`;
        await (LogAction.create(logActionObj));
        throw Boom.notFound(`No devices installed with those details or device is not installed.`, {
            installerId: userId,
            groupId: groupId,
            siteId: siteId,
            installCode: installCode,
            modelName: 'Device'
        });
    }

    ctx.body = {
        deviceId: DeviceData._id,
        installCode: DeviceData.installCode,
        vin: DeviceData.vin,
        plate: DeviceData.plate,
        category: DeviceData.category,
        vehicleData: DeviceData.vehicleData,
        installedBy: DeviceData.installedBy,
        installed: true,
        installationDate: DeviceData.installationDate,
        locationId: DeviceData.locationId,
    };
};

const getInstallationHistory = async (ctx, next) => {
    const [accountId, userId] = ctx.params.jwtdata.split(':');
    const deviceId = ctx.request.query.deviceid;

    if(!deviceId) {
        throw Boom.badRequest(`Installation History: Missing device ID.`, {
            modelName: 'Device'
        });
    }

    const DBObj = await InstallationHistory.find({ deviceId, accountId }).sort({ installationDate: -1 });

    ctx.body = {

        result: {
            deviceId,
            history: DBObj || [],
        },
        status: 'success'
    }
};

async function processBatch(records, accountId) {
    const bulkOps = records.map(record => {
        const upsertRecord = {accountId: accountId};

        for (let key in record) {
            const value = record[key].trim();
            if (value.length > 10) {
                upsertRecord.VIN = value;
            } else if (/^\d{3}$/.test(value)) {
                upsertRecord.MCOID = parseInt(value, 10);
                upsertRecord.MCO = `${value} MCO`;
            } else if (value.length > 3 && value.length <= 10) {
                upsertRecord.EquipmentTrimID = value;
            }
        }

        switch(loggingLevel) {
            case 'verbose':
                logger.info(`Upsert records: ${JSON.stringify({
                    filter: { VIN: upsertRecord.VIN, accountId: accountId },
                    update: { $set: upsertRecord, $setOnInsert: { createdAt: new Date() } },
                    upsert: true
                }, null, 2)}`);
                break;
            case 'basic':
            default:
                logger.info(`Upserting records for accountId ${accountId}`);
                break;
        }

        return {
            updateOne: {
                filter: { VIN: upsertRecord.VIN, accountId: accountId },
                update: { $set: upsertRecord, $setOnInsert: { createdAt: new Date() } },
                upsert: true
            }
        };
    });

    logger.info(`Writing bulk records for ${bulkOps.length} records.`);

    if (bulkOps.length > 0) {
        await StockData.bulkWrite(bulkOps);
    }

    logger.info('Completed writing records.');
}

const getFile = async (files) => {
    if (!files || files.length === 0) {
        throw Boom.notFound('No file uploaded.', {
            modelName: 'Installer'
        });
    }

    return files[0];
}

const uploadDeviceInstall = async (ctx) => {
    const [accountId, userId] = ctx.params.jwtdata.split(':');
    const files = ctx.request.files;

    const file = await getFile(files);

    const type = 'processInstall'

    try {
        const rows = [];

        await new Promise((resolve, reject) => {
            fs.createReadStream(file.path)
                .pipe(csvParser({
                    mapHeaders: ({ header }) => header?.replace(/^\uFEFF/, '').trim()
                })) // Turn off automatic header parsing
                .on('data', (row) => rows.push(row))
                .on('end', async () => {
                    try {
                        for (const row of rows) {
                            const serialised = JSON.stringify({ type, row, accountId });

                            const payload = [
                                {
                                    topic: KAFKA_TOPIC,
                                    messages: [serialised]
                                }
                            ];

                            await producer.send(payload);
                            logger.info(`[kafka-producer -> ${KAFKA_TOPIC}]: broker update success`);
                        }
                        resolve();
                    } catch (err) {
                        logger.error(err);
                        logger.error(`[kafka-producer -> ${KAFKA_TOPIC}]: broker update failed`);
                        reject(err);
                    }
                })
                .on('error', (err) => reject(Boom.badImplementation('Error processing CSV file', err)));
        });

        ctx.body = { status: 'success' };
    }
    catch (error) {
            // Handle errors and send the appropriate Boom error response
            logger.error('Error uploading device install data: ', error);
            if (error.isBoom) {
                ctx.status = error.output.statusCode;
                ctx.body = error.output.payload;
            } else {
                // If the error is not a Boom error, treat it as an internal server error
                ctx.status = 500;
                ctx.body = { statusCode: 500, message: error || 'Internal Server Error' };
            }
        }
}

const uploadStockData = async (ctx) => {
    const [accountId, userId] = ctx.params.jwtdata.split(':');
    const files = ctx.request.files;
    const records = [];

    if(loggingLevel && loggingLevel === 'verbose') {
        logger.info('Files: ', files);
    }

    const file = await getFile(files);

    let headers = [];  // Store headers here

    try {
        await new Promise((resolve, reject) => {
            fs.createReadStream(file.path)
                .pipe(csvParser({ headers: false })) // Turn off automatic header parsing
                .on('data', (data) => {
                    if(loggingLevel && loggingLevel === 'verbose') {
                        logger.info('Parsed file data:', data);
                    }

                    if (headers.length === 0) {
                        // First row is expected to be the header
                        headers = Object.values(data).map(header => header.trim());

                        const requiredColumns = ['EQ ID', 'MCO', 'VIN'];
                        const missingColumns = requiredColumns.filter(col => !headers.includes(col));

                        if(loggingLevel && loggingLevel === 'verbose') {
                            logger.info('Missing Columns: ', missingColumns);
                        }

                        if (missingColumns.length > 0) {
                            return reject(Boom.badData(`Missing required columns: ${missingColumns.join(', ')}`));
                        }
                    } else {
                        // Validate that each subsequent row has exactly 3 columns
                        const rowValues = Object.values(data);

                        if(loggingLevel && loggingLevel === 'verbose') {
                            logger.info('Row Values: ', rowValues);
                        }

                        if (rowValues.length !== 3) {
                            return reject(Boom.badData(`Invalid row: ${JSON.stringify(data)}. Each row must have exactly 3 columns.`));
                        }

                        // Prepare the record for further processing using headers as keys
                        const record = {
                            eqId: rowValues[headers.indexOf('EQ ID')].trim(),
                            mco: rowValues[headers.indexOf('MCO')].trim(),
                            vin: rowValues[headers.indexOf('VIN')].trim()
                        };

                        if(loggingLevel && loggingLevel === 'verbose') {
                            logger.info('Record: ', record);
                        }

                        // Further validation on the values
                        if (record.vin.length !== 17) {
                            return reject(Boom.badData(`Invalid data found in row: ${JSON.stringify(data)}`));
                        }

                        records.push(record);
                    }
                })
                .on('end', resolve)
                .on('error', (err) => reject(Boom.badImplementation('Error processing CSV file', err)));
        });

        if(loggingLevel && loggingLevel === 'verbose') {
            logger.info('Resulting Records: ', records);
        }

        const batchSize = 1000; // Adjust batch size as needed
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            if(loggingLevel && loggingLevel === 'verbose') {
                logger.info('Batch: ', batch);
            }
            await processBatch(batch, accountId);
        }
        logger.info('Stock upload complete.');
        ctx.body = { status: 'success' };
    } catch (error) {
        logger.error('Error uploading stock data: ', error);
        // Handle errors and send the appropriate Boom error response
        if (error.isBoom) {
            ctx.status = error.output.statusCode;
            ctx.body = error.output.payload;
        } else {
            // If the error is not a Boom error, treat it as an internal server error
            ctx.status = 500;
            ctx.body = { statusCode: 500, message: error || 'Internal Server Error' };
        }
    }
};

module.exports = {
    installDevice,
    addDeviceImage,
    addDeviceNote,
    uninstallDevice,
    // getVinData,
    getInstallerQRData,
    // getLicensePlateData,
    getVehicleData,
    getInstallationHistory,
    uploadStockData,
    uploadDeviceInstall
};

