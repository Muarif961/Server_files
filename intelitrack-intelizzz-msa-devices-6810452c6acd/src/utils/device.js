function validateEmail(email) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

const simplifyId = id => {
  if (!id || (id && id.length < 10)) {
    return id;
  }
  const newId =
    id.slice(id.length - 10, id.length - 5) +
    '-' +
    id.slice(id.length - 5, id.length);

  return newId;
};

const validDeviceId = id => {
  if (!id || id.length !== 19) {
    return false;
  }
  const re = /^-?\d+\.?\d*$/;
  return re.test(String(id));
};

const validInstallationCode = id => {
  if (!id || id.length !== 9) {
    return false;
  }
  const re = /^[0-9]+(-[0-9]+)+$/;
  return re.test(String(id));
};

const passwordValid = pwd => {
  const match =
    /(?=.{8,})((?=.*\d)(?=.*[a-z])(?=.*[A-Z])|(?=.*\d)(?=.*[a-zA-Z])(?=.*[\W_])|(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_])).*/;
  return pwd ? !pwd.search(match) : false;
};

const vinType = input => {
  if (input.length >= 17) {
    input = input.substring(0, 17);
  }

  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;

  return vinRegex.test(input) ? input : null;
};

const identifyDataType = input => {
  // Check if input contains commas and split if it does
  if (input.includes(',')) {
    input = input.split(',')[0];
  }

  const deviceIdRegex = /^\d{19}$/;
  const stockCodeRegex = /^[A-Z0-9]+$/i;
  const licensePlateRegex = /^[A-Z0-9]{5,8}$/i;

  const typed = {id: input};

  const vin = vinType(input);

  if (deviceIdRegex.test(input)) {
    typed.type = 'deviceId';
  } else if (vin) {
    typed.type = 'vin';
    typed.id = vin;
  } else if (stockCodeRegex.test(input)) {
    typed.type = 'stockCode';
  } else if (licensePlateRegex.test(input)) {
    typed.type = 'plate';
  } else {
    typed.type = 'unknown';
  }

  //console.log(typed);

  return typed;
};

const getLastFiveDigits = code => {
  return code ? code.substring(code.length - 5) : '';
};

module.exports = { simplifyId }
