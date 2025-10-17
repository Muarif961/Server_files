const Mongoose = require('mongoose');
const connections = require('../connections/mongoose');

const WakeHistorySchema = new Mongoose.Schema(
    {
        deviceId: String,
        // AccountID required for sorting by locationMethod
        accountId: String,
        groupId: String,
        // Uses the fixtime of either GNSS or LBS (whichever is available first)
        date: Date,
        tamperState: String,
        battery: Number,
        operatingMode: String,
        // LocationMethod is required for sorting by location method type at the front end
        locationMethod: String,
        address: String,
        awsAddress: String,
        wakeupsUserId: String,
        locateUserId: String,
        gnss: {
            type: {
                latitude: Number,
                longitude: Number,
                altitude: Number,
                speed: Number,
                direction: Number,
                GNSSValid: Number,
                GNSSStatus: String,
                fixTime: Date
            }
        },
        lbs: {
            type: {
                latitude: Number,
                longitude: Number,
                signalStrength: String,
                fixTime: Date
            }
        }
    },
    {
        /**
         * @name minimize
         * @member WakeHistorySchema
         * @desc Minimize preserves empty object when saving documents into MongoDB
         * @type {Boolean}
         */
        minimize: false,

        /**
         * @name strict
         * @member WakeHistorySchema
         * @desc Strict allows to skip defining a schema at all... remember MongoDB is schemaless
         * @type {Boolean}
         */
        strict: false,

        /**
         * @name autoIndex
         * @member WakeHistorySchema
         * @desc Tells Mongoose whether to ensure indexes on startup. Problematic for production performance
         * @type {Boolean}
         */
        autoIndex: !!process.env.AUTO_INDEX
}

);

module.exports = Mongoose.model('wakehistory', WakeHistorySchema);
