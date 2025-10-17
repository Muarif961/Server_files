const Mongoose = require('mongoose');
const connections = require('../connections/mongoose');

const DeviceCertificateSchema = new Mongoose.Schema(
    {
        _id: String,
        accountId: String,
        userId: String,
        customerName: String,
        vehicleMake: String,
        vehicleModel: String,
        vehicleRegistration: String,
        systemModel: String,
        dateInstalled: Date,
        dateCreated: Date,
        downloaded: Boolean
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

module.exports = Mongoose.model('devicecertificate', DeviceCertificateSchema);
