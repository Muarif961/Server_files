const nodemailer = require('nodemailer');
const moment = require('moment');
async function sendEmail(
  emailAddress,
  vehicleIdNumber,
  lastKnownLocation,
  nextWakeUpTime,
  deviceName,
  timezone
) {
  const transporter = nodemailer.createTransport({
    tls: { rejectUnauthorized: false, ciphers: 'SSLv3' },
    host: 'mail.intelitrack.co.uk',
    secureConnection: false,
    port: 587,
    auth: {
      user: 'tracker@intelitrack.co.uk',
      pass: 'n0JDk3j2Y7mXd6NYm8'
    }
  });
  let authCode =
    Math.floor(100 + Math.random() * 900) +
    '-' +
    Math.floor(100 + Math.random() * 900);
  let timeFormatted = moment(nextWakeUpTime); //.tz(timezone);
  const mailOptions = {
    from: 'tracker@intelitrack.co.uk',
    to: [emailAddress, 'tracker@intelitrack.co.uk'],
    subject: 'Auth Code ' + authCode,
    html: `Device Name: ${deviceName} <br/>
      Vehicle ID Number: ${vehicleIdNumber} <br/>
      Last Known Location: ${lastKnownLocation} <br/>
      Next WakeUp: ${timeFormatted.format(
        'YYYY-MM-DD'
      )} Time: ${timeFormatted.format('HH:mm')} ${timezone}<br/>
      Auth Code: ${authCode}`
  };
  return transporter
    .sendMail(mailOptions)
    .then(resp => {
      console.log(resp);
    })
    .catch(err => console.log(err))
    .finally(e => {
      transporter.close();
    });
}

module.exports = { sendEmail };

// sendEmail('petrovski.k@gmail.com', '12313', 'tetwe', '12:00');
