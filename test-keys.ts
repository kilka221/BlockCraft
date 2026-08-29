import { parseServiceAccountKey } from './src/server/ydb.js';
console.log(parseServiceAccountKey().privateKey.toString().substring(0, 50));
