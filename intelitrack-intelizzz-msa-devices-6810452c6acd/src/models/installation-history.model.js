const Mongoose = require('mongoose');
const connections = require('../connections/mongoose');

const VehicleData = Mongoose.Schema({
    year: Number,
    make: String,
    model: String,
    manufacturer: String,
    engine: String,
    trim: String,
    transmission: String
}, { _id : false });

const InstallationHistorySchema = new Mongoose.Schema(
    {
        deviceId: String,
        accountId: String,
        groupId: String,
        name: String,
        vin: String,
        plate: String,
        category: String,
        vehicleData: {
            type: VehicleData
        },
        installCode: String,
        installedBy: String,
        installationDate: Date,
        removalDate: Date,
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

module.exports = Mongoose.model('installationhistory', InstallationHistorySchema);
