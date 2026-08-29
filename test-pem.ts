const privKeyStr = `-----BEGIN PRIVATE KEY-----MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCcS3o+b0um91PuOO2xWsAEi4sxk0vTiY7CJLxch3uCjFjjMSDWEvHOROaNFwrpWaaSL14ZjIBoaBLRqEejoxrK6/rsfn9y1q+pZDUvFCXt9mJEPwoEsuRv9Im8okVqTuzPXncrAl9+qa4brKgzI21BMYU8kOljQEKEaDa3aYgtAXQW+K5p0WNBGcFhOqpyxwsK1C7bID/rbj4qymkLwmjshQkpu7z59FcepzjjA5XE7274d9HwB/sbyBM1u+UaaI7rphC+bVMTzcCwgzVQ80jSFrfoGnvvJvwGA4IW/YzwLT7zzec0UYsFwHuQJEuRpHV40PfVpyshyxQ+jnwA15uJAgMBAAECggEAR9hyUyz6C8B5tnI44WQkDHLRA3MAUjdThm84nxgwcGxvl9BHleCTgwwtJwJGo8nwRha8HOZ3SIc+z12ZwOEDOfCMIhZsI7AIg8dqoz+Rx/eQaGrKAirx030Hq8y0OBAbz59PDFhE6Ya6YEJX91n7qRJIevTqNBOgABmfvWQnkvf15prOwylA1OoTc7rwug+A3ytOUdA3Se4RoHU8BBbuQCESXSeVkrMKZLJKGJeq2TM21sCMBKJ7veLNcFehvtZyT4bPdzLMUpzKeemQo7WfnB2ijSlKfsqub57TzJIYHfapToNXmZXvCsFWQIUW61zahmTXYtKojMd0YfbL3uOSOQKBgQC9Zgk+2LHfMusH5tNj5zIlHiT91LJaCQIlXE/7O8zmiYrhkhKsvpZE4pgq3vxS3MFSoRjAcQW4TlekbNflu2Uadjrx2FldV5gJpieDeYF5QZUO7lJF51Z6H3tlm5DJwE7lfpNX0RqeAQ/AC3gUUps7PuQzv+f6QwxvSiryyTTsuwKBgQDTQWOjUVtOKXPF9E6pmi26lLK/c/5MLYemaCRtxGCPS0ZFuR/jZVuL8KlzP8kqUwvDTaNmXEzZnZNqL6+eCP+sFZ+cV0OrdCyhWTdJPePSKr7AoFqt6iF2aL0kOFhpypHthyLifJNS6oxjVLe1mjNgcCUs2MRyoTAPnzt/G5kWiwKBgCFpI45jmZUfHVjqfjXsbesgUzQ31jKNzkQa8b0HApFUiBxcsVCp2kZSlrdRWL+hU7Uo1/3ysiieIVXPIZLUKPSvEJzjJniR4C8rkWLfB1kFma7lmbvdIGMwtIrrE3KTqxdO6d0e9QwUcdvV6hvjqqCb6pO6ccizFTl4ovTrS5vLAoGAQ/xgN3gAPVhDxOoJwrU2kDw4hjqrFRL1+8y6JIU1WggsllWseH7vBksuDUPy1mchevnqYw/DP6lhfqPYDbDxrwzKcAL5aR0bG9XdX/nF7qYI+27fn+agXD362MQ1V950Ng/uXxseQmnvQixKbuwwKpIMtLESD53mHLDu8coM618CgYARaQxQs7gZPxSIbw167hL38qb+cwkg29wlCUgMZfFOsuXEoJhl1rTtTxC0ruQfRSVJ/G3XM4C4hUA1/BHta6TPWio1eSh9E5g85iTZJN74I5I73OZAfQ4XJ9mK/jazjFjs5M2Gv/dFTEcxO6kccTY47S5DS7gR9NHQI8dCQ0G8FA==-----END PRIVATE KEY-----`;

function fixPem(pem) {
  let cleaned = pem.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  let formatted = `-----BEGIN PRIVATE KEY-----\n`;
  for (let i = 0; i < cleaned.length; i += 64) {
    formatted += cleaned.substring(i, i + 64) + '\n';
  }
  formatted += `-----END PRIVATE KEY-----\n`;
  return formatted;
}

console.log(fixPem(privKeyStr));
