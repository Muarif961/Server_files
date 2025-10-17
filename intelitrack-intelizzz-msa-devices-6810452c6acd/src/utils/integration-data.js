// Check alerts-history for latest version
const Group = require("../models/group.model");
const Mongoose = require("mongoose");
const User = require("../models/user.model");
const Account = require("../models/account.model");
const WakeHistory = require("../models/wakehistory.model");
const Tags = require("../models/tag.model");
const integrate = require("./integrations");

const loggingLevel = process.env.LOGGING_LEVEL || 'basic';
const maxBalance = 1095;

const mergeObjects = (obj1, obj2) => {
    let result = { ...obj1 };  // Start with a shallow copy of obj1

    for (let key in obj2) {
        if (obj2.hasOwnProperty(key)) {
            result[key] = obj2[key];
        }
    }

    return result;
}

const createIntegrationObject = (mappingObject, integrations, existingObject) => {
    if((loggingLevel && loggingLevel === 'basic') || !loggingLevel){
        logger.info('createIntegrationObject - Creating Integration Object (input) - device: ', mappingObject && mappingObject.deviceId);

    } else if (loggingLevel === 'verbose'){
        logger.info('createIntegrationObject - Creating Integration Object (input): ', mappingObject, integrations, existingObject);
    }
    if(!integrations || (integrations && integrations.length === 0)) return null;

    const mapped = {};
    integrations[0].mappings.forEach(property => {
        mapped[property.fieldName] = mappingObject[property.valueProperty] || null;
    });

    // logger.info('New Object: ', mapped);

    const mappedObject = mergeObjects(existingObject, mapped);

    //logger.info('Squishing them together ... ', mappedObject);
    if((loggingLevel && loggingLevel === 'basic') || !loggingLevel){
        logger.info('createIntegrationObject - Final Integration Object (output): ', mappingObject && mappingObject.deviceId);

    } else if (loggingLevel === 'verbose'){
        logger.info('createIntegrationObject - Final Integration Object (output): ', ({ mappedObject: mappedObject, integrations: integrations }))
    }

    return { mappedObject: mappedObject, integrations: integrations };
}

const getNextWakeup = (wakeupObj = []) => {
    if(!wakeupObj) {
        logger.error('getNextWakeup Error: wakeupObj missing.');
        return;
    }
    const now = new Date();
    let closestWakeupTime;

    wakeupObj.filter(time => time).forEach(time => {
        const [hours, minutes] = time.split(':');

        const wakeupDate = new Date(now);
        wakeupDate.setUTCHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        if (wakeupDate <= now) {
            wakeupDate.setDate(wakeupDate.getDate() + 1);
        }

        if (!closestWakeupTime || wakeupDate < closestWakeupTime) {
            closestWakeupTime = wakeupDate;
        }        
    });

    if(!closestWakeupTime){
        logger.error('getNextWakeup Error: Unable to get next wakeup. ', wakeupObj);
        return null;
    } else {
        return closestWakeupTime.toISOString();
    }
}

const getTagNames = async (_tagIds, accountId) => {
    const tagIds = _tagIds ? _tagIds.map(id => id) : null;

    const _tagNames = tagIds ? await Tags.find({ _id: { $in: tagIds }, accountId: accountId }, { name: 1, _id: 0 }) : null;

    const tagNames = _tagNames ? _tagNames.map(tag => tag.name) : [];

    return tagNames;
}

const generateGoogleUrl = (lat,lng) => {
    if(!lat || !lng) return null;

    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

const combineIntegrationData = async (device, groupId, note, install = true) => {
    try {
        const groupObj = await Group.findOne({ _id: new Mongoose.Types.ObjectId(groupId) });
        const installerUserObj = await User.findOne({ _id: new Mongoose.Types.ObjectId(device.installedBy) });
        const wakeDataObj = await WakeHistory.find({ deviceId: device._id }).sort({ date: -1 }).limit(2);
        const nextWakeTime = getNextWakeup(device.wakeupTimes);
        const tagNames = await getTagNames(device.tags, device.accountId);

        const wakeup = wakeDataObj && wakeDataObj.length > 0 && wakeDataObj[0];
        const locationMethod = wakeup.locationMethod;
        const previousWakeup = wakeDataObj && wakeDataObj.length > 1 && wakeDataObj[1];
        const previousLocationMethod = previousWakeup.locationMethod;
        const wakeTime = wakeup && wakeup[locationMethod].fixTime;
        const address = (wakeup && wakeup.address) || '';
        const longitude = wakeup && wakeup[locationMethod].longitude;
        const latitude = wakeup && wakeup[locationMethod].latitude; 
        const previousWakeTime = previousWakeup && previousWakeup[previousLocationMethod].fixTime;
        const wakeBalance = maxBalance - device.wakeupCount;

        const googleUrl = generateGoogleUrl(latitude, longitude);

        const formatInstallerName = (firstName, lastName) => {
            let fullName = '';

            if(!firstName && !lastName) {
                return null;
            }

            if(firstName) {
                fullName = firstName;
            }

            if(lastName) {
                fullName = fullName + (firstName ? ' ' : '');
                fullName = fullName + lastName;
            }

            return fullName;
        }

        const integrationData = {
            deviceId: device._id,
            deviceName: device.name,
            deviceGroup: groupObj && groupObj.name,
            deviceGroupId: groupId,
            accountId: device.accountId,
            deviceWakeTime: wakeTime,
            deviceAddress: address,
            deviceLongitude: longitude,
            deviceLatitude: latitude,
            deviceSpeed: wakeup && wakeup[locationMethod].speed,
            deviceDirection: wakeup && wakeup[locationMethod].direction,
            deviceLastWakeTime: previousWakeTime,
            deviceNextWakeTime: nextWakeTime,
            deviceOperatingMode: device.operatingMode,
            deviceTamper: wakeup && wakeup.tamperState,
            deviceWakeBalance: wakeBalance,
            deviceTags: tagNames,
            deviceTagIds: device.tags,
            googleUrl: googleUrl,
            deviceLocationMethod: locationMethod
        };

        if(install) {
            integrationData.installerId = device.installedBy;
            integrationData.installerName = formatInstallerName(installerUserObj.firstName, installerUserObj.lastName);
            integrationData.installationDateTime = device.installationDate;
        } else {
            integrationData.removerId = device.installedBy;
            integrationData.removerName = formatInstallerName(installerUserObj.firstName, installerUserObj.lastName);
            integrationData.removalDateTime = device.installationDate;
        }

        if(note) {
            integrationData.installerNote = note;
        }

        return integrationData;
    } catch (error) {
        if(error) {
            logger.error('Error creating Installer webhook integration data object: ', error);
            return error;
        }

    }

}

const sendToWebHook = async (data) => {
    const integrationsObject = {};

    if(!data) {
        logger.error('Error sending to webhook -- no data provided.');
        return;
    }

    const accountObj = await Account.findOne({ _id: new Mongoose.Types.ObjectId(data.accountId)});

    if(accountObj && accountObj.integrations) {
        integrationsObject.integrations = accountObj.integrations;
    } else {
        logger.error('Error sending to webhook -- no account integrations registered.');
        return;
    }

    const integrationData = createIntegrationObject(data, integrationsObject.integrations, {});

    if((loggingLevel && loggingLevel === 'basic') || !loggingLevel){
        logger.info('(sendToWebHook) - Integration Data for Installer - deviceId: ', data && data.deviceId);

    } else if (loggingLevel === 'verbose'){
        logger.info('(sendToWebHook) - Integration Data for Installer: ', integrationData);
    }

    if(integrationData) {
        try {
            //console.log('Sending Integration Data')
            await integrate(integrationData);
        } catch(e) {
            logger.error(`(sendtoWebHook) - Device ${data && data.deviceId} - Error sending data to webhook: ${e}`);
        }
    }
}

module.exports = { createIntegrationObject, combineIntegrationData, sendToWebHook };

