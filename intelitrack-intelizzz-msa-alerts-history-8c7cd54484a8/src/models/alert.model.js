const Mongoose = require('mongoose');

const AlertHistorySchema = new Mongoose.Schema(
    {
        deviceId: { type: String, required: true },
        accountId: { type: String, required: true },
        groupId: String,
        type: { type: String, required: true },
        dateTime: { type: Date, required: true },
        tamperState: String,
        batteryLevel: String,
        latitude: String,
        longitude: String,
        /**
         * Location in stringified format for display
         */
        location: String

    },
    {
        /**
         * @name minimize
         * @member AlertHistorySchema
         * @desc Minimize preserves empty object when saving documents into MongoDB
         * @type {Boolean}
         */
        minimize: false,

        /**
         * @name strict
         * @member AlertHistorySchema
         * @desc Strict allows to skip defining a schema at all... remember MongoDB is schemaless
         * @type {Boolean}
         */
        strict: false,

        /**
         * @name autoIndex
         * @member AlertHistorySchema
         * @desc Tells Mongoose whether to ensure indexes on startup. Problematic for production performance
         * @type {Boolean}
         */
        autoIndex: !!process.env.AUTO_INDEX
    }
);

module.exports = Mongoose.model('alert', AlertHistorySchema);