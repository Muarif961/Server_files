const Mongoose = require('mongoose');
const connections = require('../connections/mongoose');

const LocatorFoundSchema = new Mongoose.Schema(
    {
        deviceId: String,
        assigneeId: String,
        accountId: String,
        crimeReference: String,
        userLocation: String,
        dateAssigned: Date,
        dateCreated: Date,
        foundDate: Date,
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

module.exports = Mongoose.model('found', LocatorFoundSchema);
