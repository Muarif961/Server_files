const Mongoose = require('mongoose');
const connections = require('../connections/mongoose');

const ReportSchema = new Mongoose.Schema(
    {
        report: Array,
        accountId: String,
        userId: String,
        name: String,
        category: String,
        type: String,
        url: String,
        fields: Array,
        status: Number,
        date: Date,
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

module.exports = Mongoose.models.report || connections.reports.model('report', ReportSchema);