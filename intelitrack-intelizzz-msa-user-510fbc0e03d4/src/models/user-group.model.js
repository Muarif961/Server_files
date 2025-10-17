const Mongoose = require('mongoose');

const UserGroupSchema = new Mongoose.Schema(
    {
        userId: String,
        groupId: String,
        accountId: String
    },
    {
        /**
         * @name minimize
         * @member GroupSchema
         * @desc Minimize preserves empty object when saving documents into MongoDB
         * @type {Boolean}
         */
        minimize: false,

        /**
         * @name strict
         * @member GroupSchema
         * @desc Strict allows to skip defining a schema at all... remember MongoDB is schemaless
         * @type {Boolean}
         */
        strict: false,

        /**
         * @name autoIndex
         * @member GroupSchema
         * @desc Tells Mongoose whether to ensure indexes on startup. Problematic for production performance
         * @type {Boolean}
         */
        autoIndex: !!process.env.AUTO_INDEX
    }
);

UserGroupSchema.index({ userId: 1, groupId: 1, accountId: 1}, { expires: '', unique: false, dropDups: true });

module.exports = Mongoose.model('usergroup', UserGroupSchema);