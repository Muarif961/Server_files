const Mongoose = require('mongoose');
const connections = require('../connections/mongoose');

// Example object
// {
//     "id": 123456,
//     "username": "SomeUser",
//     "firstName": "Peter",
//     "lastName": "Parker",
//     "account": 30,
//     "address1": "123 Some Road"
//     "address2": ""
//     "address3": "Some Town"
//     "address4": "Some County"
//     "postcode": "S1 1DA",
//     "email": "peter.parker@spidey.com",
//     "contactNumber": "+441253123123",
//     "groups": [1234, 1235],
//     "roles": [ "admin" ]
// }

/**
 * Allows empty strings on document creation
 * @returns {boolean}
 */
function firstNameCheck () {
    return typeof !this.firstName === 'string';
}

/**
 * Allows empty strings on document creation
 * @returns {boolean}
 */
function lastNameCheck () {
    return typeof !this.lastName === 'string';
}

const UserSchema = new Mongoose.Schema(
    {
        // _id: { type: String, required: true, index: true, unique: true },
        username: { type: Mongoose.Schema.Types.String, required: true, unique: true },
        password: { type: String, required: true },
        firstName: { type: String, required: firstNameCheck },
        lastName: { type: String, required: lastNameCheck },
        accountId: { type: String, required: true },
        address1: { type: String, required: false },
        address2: { type: String, required: false },
        address3: { type: String, required: false },
        address4: { type: String, required: false },
        postcode: { type: String, required: false },
        country: { type: String, required: false },
        email: { type: String, required: true },
        contactNumber: { type: String, required: false },
        alertsNumber: { type: String, required: false },
        groups: { type: Array, required: false },
        roles: { type: Array, required: true },
        parentId: { type: String, required: false },
        deleted: { type: Boolean, required: false },
        userStatus: String,
        token: String
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

module.exports = Mongoose.models.user || connections.user.model('user', UserSchema);