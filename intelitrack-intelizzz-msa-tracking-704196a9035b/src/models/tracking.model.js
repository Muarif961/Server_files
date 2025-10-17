const Mongoose = require('mongoose');

const TrackingSchema = new Mongoose.Schema(
    {
        _id: String,
        accountId: String,
        groupId: String,
        date: Date,
        startTime: Date,
        locationMethod: String,
        address: String,
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
         * @member TrackingSchema
         * @desc Minimize preserves empty object when saving documents into MongoDB
         * @type {Boolean}
         */
        minimize: false,

        /**
         * @name strict
         * @member TrackingSchema
         * @desc Strict allows to skip defining a schema at all... remember MongoDB is schemaless
         * @type {Boolean}
         */
        strict: false,

        /**
         * @name autoIndex
         * @member TrackingSchema
         * @desc Tells Mongoose whether to ensure indexes on startup. Problematic for production performance
         * @type {Boolean}
         */
        autoIndex: !!process.env.AUTO_INDEX
    }

);

module.exports = Mongoose.model('tracking', TrackingSchema);