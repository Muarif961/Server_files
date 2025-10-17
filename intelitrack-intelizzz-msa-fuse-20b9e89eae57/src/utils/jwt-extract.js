const jwt = require('jsonwebtoken');

module.exports = (auth) => {
    return jwt.verify(auth.split(" ")[1], 'YourKey');
};