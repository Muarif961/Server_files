const Mongoose = require('mongoose');
const connections = require('../connections/mongoose');

// Example object
// {
//     "id": 1234,
//     "account": 30,
//     "name": "Amazon"
// }

const AccountSchema = new Mongoose.Schema(
    {
        name: { type: String, required: true },
        country: String,
        webId: String,
        installerURL: String,
        host: String,
        integrations: Array,
    },
    {
        /**
         * @name minimize
         * @member AccountSchema
         * @desc Minimize preserves empty object when saving documents into MongoDB
         * @type {Boolean}
         */
        minimize: false,

        /**
         * @name strict
         * @member AccountSchema
         * @desc Strict allows to skip defining a schema at all... remember MongoDB is schemaless
         * @type {Boolean}
         */
        strict: false,

        /**
         * @name autoIndexß
         * @member AccountSchema
         * @desc Tells Mongoose whether to ensure indexes on startup. Problematic for production performance
         * @type {Boolean}
         */
        autoIndex: !!process.env.AUTO_INDEX
    }
);

// const autoPopulateChildren = function (next) {
//     this.populate('children');
//     next();
// };
//
// GroupSchema
//     .pre('findOne', autoPopulateChildren)
//     .pre('find', autoPopulateChildren);

module.exports = Mongoose.model('account', AccountSchema);
