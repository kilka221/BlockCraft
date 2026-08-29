const crypto = require('crypto');
const privKey = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCcS3o+b0um91Pu\nOO2xWsAEi4sxk0vTiY7CJLxch3uCjFjjMSDWEvHOROaNFwrpWaaSL14ZjIBoaBLR\nqEejoxrK6/rsfn9y1q+pZDUvFCXt9mJEPwoEsuRv9Im8okVqTuzPXncrAl9+qa4b\nrKgzI21BMYU8kOljQEKEaDa3aYgtAXQW+K5p0WNBGcFhOqpyxwsK1C7bID/rbj4q\nymkLwmjshQkpu7z59FcepzjjA5XE7274d9HwB/sbyBM1u+UaaI7rphC+bVMTzcCw\ngzVQ80jSFrfoGnvvJvwGA4IW/YzwLT7zzec0UYsFwHuQJEuRpHV40PfVpyshyxQ+\njnwA15uJAgMBAAECggEAR9hyUyz6C8B5tnI44WQkDHLRA3MAUjdThm84nxgwcGxv\nl9BHleCTgwwtJwJGo8nwRha8HOZ3SIc+z12ZwOEDOfCMIhZsI7AIg8dqoz+Rx/eQ\naGrKAirx030Hq8y0OBAbz59PDFhE6Ya6YEJX91n7qRJIevTqNBOgABmfvWQnkvf1\n5prOwylA1OoTc7rwug+A3ytOUdA3Se4RoHU8BBbuQCESXSeVkrMKZLJKGJeq2TM2\n1sCMBKJ7veLNcFehvtZyT4bPdzLMUpzKeemQo7WfnB2ijSlKfsqub57TzJIYHfap\nToNXmZXvCsFWQIUW61zahmTXYtKojMd0YfbL3uOSOQKBgQC9Zgk+2LHfMusH5tNj\n5zIlHiT91LJaCQIlXE/7O8zmiYrhkhKsvpZE4pgq3vxS3MFSoRjAcQW4TlekbNfl\nu2Uadjrx2FldV5gJpieDeYF5QZUO7lJF51Z6H3tlm5DJwE7lfpNX0RqeAQ/AC3gU\nUps7PuQzv+f6QwxvSiryyTTsuwKBgQDTQWOjUVtOKXPF9E6pmi26lLK/c/5MLYem\naCRtxGCPS0ZFuR/jZVuL8KlzP8kqUwvDTaNmXEzZnZNqL6+eCP+sFZ+cV0OrdCyh\nWTdJPePSKr7AoFqt6iF2aL0kOFhpypHthyLifJNS6oxjVLe1mjNgcCUs2MRyoTAP\nnzt/G5kWiwKBgCFpI45jmZUfHVjqfjXsbesgUzQ31jKNzkQa8b0HApFUiBxcsVCp\n2kZSlrdRWL+hU7Uo1/3ysiieIVXPIZLUKPSvEJzjJniR4C8rkWLfB1kFma7lmbvd\nIGMwtIrrE3KTqxdO6d0e9QwUcdvV6hvjqqCb6pO6ccizFTl4ovTrS5vLAoGAQ/xg\nN3gAPVhDxOoJwrU2kDw4hjqrFRL1+8y6JIU1WggsllWseH7vBksuDUPy1mchevnq\nYw/DP6lhfqPYDbDxrwzKcAL5aR0bG9XdX/nF7qYI+27fn+agXD362MQ1V950Ng/u\nXxseQmnvQixKbuwwKpIMtLESD53mHLDu8coM618CgYARaQxQs7gZPxSIbw167hL3\n8qb+cwkg29wlCUgMZfFOsuXEoJhl1rTtTxC0ruQfRSVJ/G3XM4C4hUA1/BHta6TP\nWio1eSh9E5g85iTZJN74I5I73OZAfQ4XJ9mK/jazjFjs5M2Gv/dFTEcxO6kccTY4\n7S5DS7gR9NHQI8dCQ0G8FA==\n-----END PRIVATE KEY-----\n`;

function fixPem(pem) {
  let cleaned = pem.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  let formatted = `-----BEGIN PRIVATE KEY-----\n`;
  for (let i = 0; i < cleaned.length; i += 64) {
    formatted += cleaned.substring(i, i + 64) + '\n';
  }
  formatted += `-----END PRIVATE KEY-----\n`;
  return formatted;
}

try {
  const pk = crypto.createPrivateKey({ key: fixPem(privKey), format: 'pem' });
  console.log("Parse Success!");
} catch (e) {
  console.log("Parse Error:", e);
}

const { IamAuthService } = require('ydb-sdk');
try {
  const auth = new IamAuthService({
    accessKeyId: 'ajenr8ku9h3c3m6c3ern',
    serviceAccountId: 'ajeiklia1abr0r2hkj9l',
    iamEndpoint: 'iam.api.cloud.yandex.net:443',
    privateKey: Buffer.from(fixPem(privKey))
  });
  auth.getToken().then(t => console.log("Token success", t)).catch(e => console.log("Token error", e));
} catch (e) {
  console.log("Auth Error:", e);
}
