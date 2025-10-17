const Mongoose = require('mongoose');
const connections = require('../connections/mongoose');

const DeviceSchema = new Mongoose.Schema(
    {
        _id: { type: String, required: true, index: true, unique: true },
        accountId: String,
        name: String,
        containerValue: Number,
        wakeupTimes: [String],
        wakeupDays: { type: String, minlength: 7, maxlength: 7 },
        pendingWakeupTimes: [String],
        pendingWakeupDays: { type: String, minlength: 7, maxlength: 7 },
        battery: Number,
        simiccid: String,
        simmsisdn: String,
        imei: String,
        timezone: String,
        groupId: String,
        locked: Boolean,
        serverAddress: String,
        apn: String,
        gnssStatus: String,
        radioStatus: String,
        model: String,
        fwVersion: String,
        productionDate: String,
        operatingMode: String,
        pendingOperatingMode: String,
        tamperState: String,
        pendingTamperState: String
    },
    {
        /**
         * @name minimize
         * @member DeviceSchema
         * @desc Minimize preserves empty object when saving documents into MongoDB
         * @type {Boolean}
         */
        minimize: false,

        /**
         * @name strict
         * @member DeviceSchema
         * @desc Strict allows to skip defining a schema at all... remember MongoDB is schemaless
         * @type {Boolean}
         */
        strict: false,

        /**
         * @name autoIndex
         * @member DeviceSchema
         * @desc Tells Mongoose whether to ensure indexes on startup. Problematic for production performance
         * @type {Boolean}
         */
        autoIndex: !!process.env.AUTO_INDEX
    }
);

module.exports = Mongoose.models.unit || connections.device.model('unit', DeviceSchema);