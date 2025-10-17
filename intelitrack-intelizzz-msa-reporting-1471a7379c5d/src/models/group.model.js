const Mongoose = require('mongoose');
const connections = require('../connections/mongoose');

// Example object
// {
//     "id": 1234,
//     "account": 30,
//     "name": "Amazon"
// }

const GroupSchema = new Mongoose.Schema(
    {
        accountId: String,
        name: { type: String, required: true }
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

module.exports = Mongoose.models.group || connections.user.model('group', GroupSchema);