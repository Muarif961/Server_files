const moment = require('moment');
// const LogAction = require('../models/log-action.model');
const Device = require('../models/device.model');
const DeviceCertificate = require('../models/device-certificate.model');
const DeviceCertificateSequence = require('../models/device-certificate-sequence.model');
const LogAction = require('../models/log-action.model');

const pdfGenerate = require('../utils/pdf-generate');


const Boom = require('@hapi/boom');

// Arbitrary start value for certificate sequence
const startAt = 24400;

const getCertificates = async (ctx) => {
    const [ accountId, userId, parentId ] = ctx.params.jwtdata.split(':');

    if(parentId) {
        throw Boom.forbidden('Unauthorised access to device certificates', { accountId, userId, parentId });
    }

    const devices = await Device.find({ accountId }, { _id: 1, name: 1 });
    const certificates = await DeviceCertificate.find({ accountId }, { _id: 1 });
    const ids = devices && certificates ? devices.map(device => {
        const found = certificates.find(cert => cert._id === device._id);

        return {
            _id: device._id,
            name: device.name,
            certificate: !!found
        }
    }) : [];

    ctx.body = wrapResponse(['ids'], ids);
};

const addCertificate = async (ctx) => {
    const [ accountId, userId, parentId ] = ctx.params.jwtdata.split(':');
    const { deviceId, customerName, vehicleMake, vehicleModel, vehicleRegistration, systemModel, dateInstalled } = ctx.request.body;

    const certificateObject = {
        userId,
        accountId,
        customerName,
        vehicleMake,
        vehicleModel,
        vehicleRegistration,
        systemModel,
        dateInstalled,
        downloaded: false,
        dateCreated: new Date()
    };

    const logActionObj = {
        userId,
        accountId,
        parent: !!!parentId,
        category: 'DEVICE',
        action: 'AddCertificate',
        data: JSON.stringify({
            deviceId,
            customerName,
            vehicleMake,
            vehicleModel,
            vehicleRegistration,
            systemModel,
            dateInstalled
        }),
        date: new Date()
    };

    try {
        await DeviceCertificateSequence.findOneAndUpdate(
            {_id: deviceId},
            {$setOnInsert: {certificateNumber: await DeviceCertificateSequence.countDocuments({}) + startAt + 1}},
            {upsert: true, useFindAndModify: false});

        const options = {upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: false, overwrite: true};

        const certRes = await DeviceCertificate.findOneAndUpdate({_id: deviceId}, certificateObject, options);

        if (!certRes) {
            logger.error(`Device Certificate Creation Error - See logAction - Account ID: ${accountId} | Device ID: ${deviceId} | User ID: ${userId}`);
            logActionObj.error = `Device Certificate Creation Error`;
            logActionObj.success = false;
            await (LogAction.create(logActionObj));
        } else {
            logActionObj.success = true;
            // logger.info(`Created document for device ${deviceId}`);
            await (LogAction.create(logActionObj));
        }
    } catch (error) {
        if(error) logger.error('Mongo Error => ', error);
    }

    ctx.body = wrapResponse(['data'], { deviceId, customerName, vehicleMake, vehicleModel, vehicleRegistration, systemModel, dateInstalled });

};

const simplifyId = (id) => {
    if (!id || (id && id.length < 10)) {
        return id;
    }
    const newId =
        id.slice(id.length - 10, id.length - 5) +
        '-' +
        id.slice(id.length - 5, id.length);

    return newId;
};

const downloadCertificate = async (ctx) => {
    const [ deviceId ] = ctx.params.deviceId.split(':');
    const [ accountId, userId, parentId ] = ctx.params.jwtdata.split(':');

    // B2C only at this stage. All B2C users are the parent user, so nobody else should be accessing the file
    if(parentId) {
        throw Boom.forbidden('Unauthorised to download the certificate', { deviceId, accountId, userId, parentId })
    }
    const logActionObj = {
        userId,
        accountId,
        parent: !!!parentId,
        category: 'DEVICE',
        action: 'DownloadCertificate',
        data: JSON.stringify({
            deviceId,
            accountId,
            userId
        }),
        date: new Date()
    };

    const doc = await DeviceCertificate.findOneAndUpdate({ _id: deviceId, accountId }, { $set: { downloaded: true}}, { useFindAndModify: false, overwrite: true });
    const sequence = await DeviceCertificateSequence.findOne({ _id: deviceId });

    if(doc) {
        // Get Certificate Details
        const pdfDetails = [
            doc.customerName,
            doc.vehicleMake,
            doc.vehicleModel,
            doc.vehicleRegistration,
            simplifyId(doc._id),
            doc.systemModel,
            moment(doc.dateInstalled).format('DD MMMM YYYY')
        ];

        // Generate the PDF from combined user and device details (arrange into an array)
        const pdfBuffer = await pdfGenerate.generateThatchamPDF(pdfDetails, sequence.certificateNumber);

        // Download the certificate
        logActionObj.success = true;
        await(LogAction.create(logActionObj));

        ctx.set('Content-disposition', 'attachment; filename=' + doc._id + '_thatcham_certificate.pdf');
        ctx.set('Content-type', 'application/octet-stream');
        // ctx.set('Content-type', 'application/pdf');
        ctx.status = 200;
        ctx.body = Buffer.concat([pdfBuffer]);
    } else {
        logActionObj.error = `Device Certificate Not Found`;
        logActionObj.success = false;
        await(LogAction.create(logActionObj));
        ctx.body = { 'message': 'No certificate found.', status: 'error' };
    }
};

const deleteCertificates = async (ctx, next) => {
    const [ accountId, userId ] = ctx.params.jwtdata.split(':');
    const deviceIds = ctx.request.body.ids;

    const DBObj = deviceIds.length > 0 ? await DeviceCertificate.remove({ accountId, _id: { $in: deviceIds }}) : [];

    ctx.body = {
        ids: deviceIds,
        status: 'success'
    }
};

const wrapResponse = (responseName, response) => {
    return {
        [responseName]: response,
        status: 'success'
    }
};

module.exports = {
    downloadCertificate,
    addCertificate,
    getCertificates,
    deleteCertificates
};
