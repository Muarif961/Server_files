const Mongoose = require('mongoose');

const AccountSchema = new Mongoose.Schema(
    {
        name: { type: String, required: true },
        // address1: { type: String, required: false },
        // address2: { type: String, required: false },
        // address3: { type: String, required: false },
        // address4: { type: String, required: false },
        // postcode: { type: String, required: false },
        // email: { type: String, required: true },
        // contactNumber: { type: String, required: false }
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

module.exports = Mongoose.model('account', AccountSchema)