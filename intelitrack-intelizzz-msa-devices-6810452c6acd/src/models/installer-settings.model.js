const Mongoose = require('mongoose');
const connections = require('../connections/mongoose');

const InstallerSettingModel = new Mongoose.Schema(
    {
        accountId: String,
        defaultInstallationGroup: String,
    },
    {
        /**
         * @name minimize
         * @member LogActionModel
         * @desc Minimize preserves empty object when saving documents into MongoDB
         * @type {Boolean}
         */
        minimize: false,

        /**
         * @name strict
         * @member LogActionModel
         * @desc Strict allows to skip defining a schema at all... remember MongoDB is schemaless
         * @type {Boolean}
         */
        strict: false,

        /**
         * @name autoIndex
         * @member LogActionModel
         * @desc Tells Mongoose whether to ensure indexes on startup. Problematic for production performance
         * @type {Boolean}
         */
        autoIndex: !!process.env.AUTO_INDEX
    }
);

module.exports = Mongoose.model('installersetting', InstallerSettingModel);
