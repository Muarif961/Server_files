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
        name: { type: String, required: true },
        parentId: String,
        children: [String],
        typeLabel: String,
        type: Number, // null or 0: normal subgroup / 1: dealer manager group / 2: dealer / 3: site
        categories: [String],
        iNetwork: Boolean, // Is this group a part of the installation network (also needs to be type 2 - dealer)
        address: String, // Currently just a freeform field to enter an address (to help installers locate the correct dealership)
        country: String, // Needed to display the right UI components
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

// const autoPopulateChildren = function (next) {
//     this.populate('children');
//     next();
// };
//
// GroupSchema
//     .pre('findOne', autoPopulateChildren)
//     .pre('find', autoPopulateChildren);

module.exports =Mongoose.model('group', GroupSchema);
