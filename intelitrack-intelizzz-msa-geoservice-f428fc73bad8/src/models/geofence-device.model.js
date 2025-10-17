const Mongoose = require('mongoose');

const GeofenceDeviceSchema = new Mongoose.Schema(
    {
        deviceId: String,
        accountId: String,
        geofenceId: String
    },
    {
        /**
         * @name minimize
         * @member UserSchema
         * @desc Minimize preserves empty object when saving documents into MongoDB
         * @type {Boolean}
         */
        minimize: false,

        /**
         * @name strict
         * @member UserSchema
         * @desc Strict allows to skip defining a schema at all... remember MongoDB is schemaless
         * @type {Boolean}
         */
        strict: false,

        /**
         * @name autoIndex
         * @member UserSchema
         * @desc Tells Mongoose whether to ensure indexes on startup. Problematic for production performance
         * @type {Boolean}
         */
        autoIndex: !!process.env.AUTO_INDEX
    }
);

GeofenceDeviceSchema.index({ deviceId: 1, accountId: 1, geofenceId: 1}, { expires: '', unique: false, dropDups: true });

module.exports = Mongoose.model('geofencedevice', GeofenceDeviceSchema);