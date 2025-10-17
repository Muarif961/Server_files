const nodemailer = require('nodemailer');

const host = process.env.EMAIL_HOST;
const port = process.env.EMAIL_PORT;
const accountUser = process.env.EMAIL_USER;
const accountPwd = process.env.EMAIL_PASSWORD;

const sendEmail = async (email) => {
    // Use the dev settings if no email account is set
    let devAccount = !accountUser ? await nodemailer.createTestAccount() : null;

    let transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: false,
        auth: {
            user: devAccount ? devAccount.user : accountUser,
            pass: devAccount ? devAccount.pass : accountPwd
        }
    });

    let info = await transporter.sendMail(email);

    console.log('******** Preview URL is: %s', nodemailer.getTestMessageUrl(info));
};

module.exports = sendEmail;