const Mongoose = require('mongoose');
const connections = require('../connections/mongoose');

const VehicleData = Mongoose.Schema({
    year: Number,
    make: String,
    model: String,
    colour: String,
    manufacturer: String,
    engine: String,
    trim: String,
    transmission: String,
    stockNumber: String,
    EquipmentTrimID: String,
    Model: String,
    VIN: String,
    LicensePlateNumber: String,
    RotationMCO: Number,
    RotationEntityCode: Number,
    CurrentMCO: Number,
    CurrentEntityCode: Number,
    OEM: String,
    ManufactureYear: Number,
    responseType: String,
    stockvin: String,
}, { _id : false });

const DeviceSchema = new Mongoose.Schema(
    {
        _id: { type: String, required: true, index: true, unique: true },
        installCode: String,
        accountId: String,
        name: String,
        dateAssigned: Date,
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
        lastTimezone: String,
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
        pendingFrequency: Number,
        frequency: Number,
        tamperState: String,
        pendingTamperState: String,
        configure: Boolean,
        activatedDate: Date,
        retryDate: Date,
        lbsRetry: Boolean,
        recoveryCode: String,
        stolenState: { type: Number, min: 0, max: 2, default: 0},
        lastWakeupTime: Date,
        vin: String,
        plate: String,
        stockNumber: String,
        category: String,
        vehicleData: {
            type: VehicleData
        },
        tags: [String],
        installedBy: String,
        installed: Boolean,
        installationDate: Date,
        locationId: String,
        alert: String,
        alertDate: Date,
        favourite: Boolean,
        wakeupCount: Number,
        wakeupCountThreshold: Number,
        lowThresholdAlert: Boolean,
        endOfLifeAlert: Boolean,
        trackingStartTime: Date,
        hdopProcessEnabled: Boolean,
        gnssQuality: Number,
        gnssHDOP: Number,
        gnssTimeout: Number,
        radioTimeout: Number,
        messageTimeout: Number,
        setHibernate: { type: Boolean, default: false },
        notActivated: { type: Boolean, default: false },
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
        autoIndex: !!process.env.AUTO_INDEX,

        timestamps: true
    }
);

// module.exports = Mongoose.model('unit', DeviceSchema);
module.exports = Mongoose.model('unit', DeviceSchema); // || connections.device.model('unit', DeviceSchema);
