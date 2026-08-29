const ydbSdk = require('ydb-sdk');
const { Driver, IamAuthService } = ydbSdk;

process.env.YDB_ENDPOINT = "grpcs://ydb.serverless.yandexcloud.net:2135";

const key = {
  "id": "ajenr8ku9h3c3m6c3ern",
  "service_account_id": "ajeiklia1abr0r2hkj9l",
  "created_at": "2026-08-29T15:07:55.455249353Z",
  "key_algorithm": "RSA_2048",
  "public_key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnEt6Pm9LpvdT7jjtsVrA\nBIuLMZNL04mOwiS8XId7goxY4zEg1hLxzkTmjRcK6Vmmki9eGYyAaGgS0ahHo6Ma\nyuv67H5/ctavqWQ1LxQl7fZiRD8KBLLkb/SJvKJFak7sz153KwJffqmuG6yoMyNt\nQTGFPJDpY0BChGg2t2mILQF0FviuadFjQRnBYTqqcscLCtQu2yA/624+KsppC8Jo\n7IUJKbu8+fRXHqc44wOVxO9u+HfR8Af7G8gTNbvlGmiO66YQvm1TE83AsIM1UPNI\n0ha36Bp77yb8BgOCFv2M8C0+883nNFGLBcB7kCRLkaR1eND31acrIcsUPo58ANeb\niQIDAQAB\n-----END PUBLIC KEY-----\n",
  "private_key": "PLEASE DO NOT REMOVE THIS LINE! Yandex.Cloud SA Key ID <ajenr8ku9h3c3m6c3ern>\n-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCcS3o+b0um91Pu\nOO2xWsAEi4sxk0vTiY7CJLxch3uCjFjjMSDWEvHOROaNFwrpWaaSL14ZjIBoaBLR\nqEejoxrK6/rsfn9y1q+pZDUvFCXt9mJEPwoEsuRv9Im8okVqTuzPXncrAl9+qa4b\nrKgzI21BMYU8kOljQEKEaDa3aYgtAXQW+K5p0WNBGcFhOqpyxwsK1C7bID/rbj4q\nymkLwmjshQkpu7z59FcepzjjA5XE7274d9HwB/sbyBM1u+UaaI7rphC+bVMTzcCw\ngzVQ80jSFrfoGnvvJvwGA4IW/YzwLT7zzec0UYsFwHuQJEuRpHV40PfVpyshyxQ+\njnwA15uJAgMBAAECggEAR9hyUyz6C8B5tnI44WQkDHLRA3MAUjdThm84nxgwcGxv\nl9BHleCTgwwtJwJGo8nwRha8HOZ3SIc+z12ZwOEDOfCMIhZsI7AIg8dqoz+Rx/eQ\naGrKAirx030Hq8y0OBAbz59PDFhE6Ya6YEJX91n7qRJIevTqNBOgABmfvWQnkvf1\n5prOwylA1OoTc7rwug+A3ytOUdA3Se4RoHU8BBbuQCESXSeVkrMKZLJKGJeq2TM2\n1sCMBKJ7veLNcFehvtZyT4bPdzLMUpzKeemQo7WfnB2ijSlKfsqub57TzJIYHfap\nToNXmZXvCsFWQIUW61zahmTXYtKojMd0YfbL3uOSOQKBgQC9Zgk+2LHfMusH5tNj\n5zIlHiT91LJaCQIlXE/7O8zmiYrhkhKsvpZE4pgq3vxS3MFSoRjAcQW4TlekbNfl\nu2Uadjrx2FldV5gJpieDeYF5QZUO7lJF51Z6H3tlm5DJwE7lfpNX0RqeAQ/AC3gU\nUps7PuQzv+f6QwxvSiryyTTsuwKBgQDTQWOjUVtOKXPF9E6pmi26lLK/c/5MLYem\naCRtxGCPS0ZFuR/jZVuL8KlzP8kqUwvDTaNmXEzZnZNqL6+eCP+sFZ+cV0OrdCyh\nWTdJPePSKr7AoFqt6iF2aL0kOFhpypHthyLifJNS6oxjVLe1mjNgcCUs2MRyoTAP\nnzt/G5kWiwKBgCFpI45jmZUfHVjqfjXsbesgUzQ31jKNzkQa8b0HApFUiBxcsVCp\n2kZSlrdRWL+hU7Uo1/3ysiieIVXPIZLUKPSvEJzjJniR4C8rkWLfB1kFma7lmbvd\nIGMwtIrrE3KTqxdO6d0e9QwUcdvV6hvjqqCb6pO6ccizFTl4ovTrS5vLAoGAQ/xg\nN3gAPVhDxOoJwrU2kDw4hjqrFRL1+8y6JIU1WggsllWseH7vBksuDUPy1mchevnq\nYw/DP6lhfqPYDbDxrwzKcAL5aR0bG9XdX/nF7qYI+27fn+agXD362MQ1V950Ng/u\nXxseQmnvQixKbuwwKpIMtLESD53mHLDu8coM618CgYARaQxQs7gZPxSIbw167hL3\n8qb+cwkg29wlCUgMZfFOsuXEoJhl1rTtTxC0ruQfRSVJ/G3XM4C4hUA1/BHta6TP\nWio1eSh9E5g85iTZJN74I5I73OZAfQ4XJ9mK/jazjFjs5M2Gv/dFTEcxO6kccTY4\n7S5DS7gR9NHQI8dCQ0G8FA==\n-----END PRIVATE KEY-----\n"
};
const pemMatch = key.private_key.match(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/);
const privateKeyBuf = Buffer.from(pemMatch ? pemMatch[0] : key.private_key);
const authService = new IamAuthService({
  accessKeyId: key.id,
  serviceAccountId: key.service_account_id,
  iamEndpoint: 'iam.api.cloud.yandex.net:443',
  privateKey: privateKeyBuf
});
const d = new Driver({
  connectionString: "grpcs://ydb.serverless.yandexcloud.net:2135/ru-central1/b1guc5cn5a6d63lgsuiq/etnjqd1tqkrk2upndh4i",
  authService
});
async function run() {
  await d.ready(5000);
  await d.tableClient.withSession(async (session) => {
    try {
      await session.executeSchemeQuery('ALTER TABLE `users` ADD COLUMN authType Utf8;');
      console.log("Added authType to users");
    } catch(e) { console.error("Error adding authType:", e.message); }
    
    try {
      await session.executeSchemeQuery('ALTER TABLE `users` ADD COLUMN passwordHash Utf8;');
      console.log("Added passwordHash to users");
    } catch(e) { console.error("Error adding passwordHash:", e.message); }
  });
}
run().catch(console.error).finally(() => process.exit(0));
