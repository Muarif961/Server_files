const Mongoose = require('mongoose');

const StolenHistorySchema = new Mongoose.Schema(
    {
        _id: false,
        deviceId: { type: String, required: true },
        accountId: { type: String, required: true },
        dateTime: { type: String, required: true },
        recovered: { type: Boolean },
        value: { type: Number, required: true }

    },
    {
        /**
         * @name minimize
         * @member StolenHistorySchema
         * @desc Minimize preserves empty object when saving documents into MongoDB
         * @type {Boolean}
         */
        minimize: false,

        /**
         * @name strict
         * @member StolenHistorySchema
         * @desc Strict allows to skip defining a schema at all... remember MongoDB is schemaless
         * @type {Boolean}
         */
        strict: false,

        /**
         * @name autoIndex
         * @member StolenHistorySchema
         * @desc Tells Mongoose whether to ensure indexes on startup. Problematic for production performance
         * @type {Boolean}
         */
        autoIndex: !!process.env.AUTO_INDEX
    }
);

module.exports = Mongoose.model('stolen', StolenHistorySchema);