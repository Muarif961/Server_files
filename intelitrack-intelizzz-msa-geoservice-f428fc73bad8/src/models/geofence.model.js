const Mongoose = require('mongoose');

const GeofenceSchema = new Mongoose.Schema(
    {
        accountId: String,
        type: String,
        name: String,
        inside: Boolean,
        detail: Object
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

module.exports = Mongoose.model('geofence', GeofenceSchema);