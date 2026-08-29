import ydbSdk from 'ydb-sdk';
import type { Driver } from 'ydb-sdk';
import crypto from 'crypto';

const { Driver: DriverClass, IamAuthService, TypedData, TypedValues, TableDescription, Column, Types } = ydbSdk as any;

const RAW_DATABASE = process.env.YDB_DATABASE || '/ru-central1/b1guc5cn5a6d63lgsuiq/etnjqd1tqkrk2upndh4i';
const RAW_ENDPOINT = process.env.YDB_ENDPOINT || 'grpcs://ydb.serverless.yandexcloud.net:2135';

export const DATABASE = RAW_DATABASE.trim();
export const ENDPOINT = RAW_ENDPOINT.trim();

let driver: Driver | null = null;
let tablesInitialized = false;

export function normalizePrivateKey(pemOrKey: string): string {
  if (!pemOrKey || typeof pemOrKey !== 'string') return '';
  
  const normalized = pemOrKey
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  try {
    const pk = crypto.createPrivateKey(normalized);
    return pk.export({ type: 'pkcs8', format: 'pem' }).toString();
  } catch (_) {}

  let b64 = normalized;
  const beginMarker = '-----BEGIN PRIVATE KEY-----';
  const endMarker = '-----END PRIVATE KEY-----';
  const beginIdx = b64.indexOf(beginMarker);
  const endIdx = b64.indexOf(endMarker);

  if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
    b64 = b64.substring(beginIdx + beginMarker.length, endIdx);
  } else {
    const rsaBegin = '-----BEGIN RSA PRIVATE KEY-----';
    const rsaEnd = '-----END RSA PRIVATE KEY-----';
    const rBeginIdx = b64.indexOf(rsaBegin);
    const rEndIdx = b64.indexOf(rsaEnd);
    if (rBeginIdx !== -1 && rEndIdx !== -1 && rEndIdx > rBeginIdx) {
      b64 = b64.substring(rBeginIdx + rsaBegin.length, rEndIdx);
    }
  }

  b64 = b64.replace(/[^A-Za-z0-9+/=]/g, '');

  let formatted = '-----BEGIN PRIVATE KEY-----\n';
  for (let i = 0; i < b64.length; i += 64) {
    formatted += b64.substring(i, i + 64) + '\n';
  }
  formatted += '-----END PRIVATE KEY-----\n';

  try {
    const pk = crypto.createPrivateKey(formatted);
    return pk.export({ type: 'pkcs8', format: 'pem' }).toString();
  } catch (err: any) {
    return formatted;
  }
}

export function parseServiceAccountKey() {
  const rawKey = process.env.YDB_SA_KEY;
  if (rawKey && rawKey.trim()) {
    try {
      const trimmed = rawKey.trim();
      const jsonStr = trimmed.startsWith('{')
        ? trimmed
        : Buffer.from(trimmed, 'base64').toString('utf-8');
      const parsed = JSON.parse(jsonStr);

      const privKeyStr = parsed.private_key || parsed.privateKey || '';
      const normalizedKey = normalizePrivateKey(privKeyStr);

      return {
        serviceAccountId: parsed.service_account_id || parsed.serviceAccountId || '',
        accessKeyId: parsed.id || parsed.accessKeyId || '',
        iamEndpoint: parsed.iamEndpoint || 'iam.api.cloud.yandex.net:443',
        privateKey: Buffer.from(normalizedKey),
      };
    } catch (err: any) {
      console.error('Failed to parse YDB_SA_KEY:', err.message);
    }
  }

  const privKey = process.env.YDB_PRIVATE_KEY;
  if (privKey && privKey.trim()) {
    return {
      serviceAccountId: process.env.YDB_SERVICE_ACCOUNT_ID || '',
      accessKeyId: process.env.YDB_ACCESS_KEY_ID || '',
      iamEndpoint: process.env.YDB_IAM_ENDPOINT || 'iam.api.cloud.yandex.net:443',
      privateKey: Buffer.from(normalizePrivateKey(privKey)),
    };
  }

  // Fallback credentials for local dev
  return {
    serviceAccountId: 'ajeiklia1abr0r2hkj9l',
    accessKeyId: 'ajenr8ku9h3c3m6c3ern',
    iamEndpoint: 'iam.api.cloud.yandex.net:443',
    privateKey: Buffer.from(
      normalizePrivateKey(
        '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCcS3o+b0um91Pu\nOO2xWsAEi4sxk0vTiY7CJLxch3uCjFjjMSDWEvHOROaNFwrpWaaSL14ZjIBoaBLR\nqEejoxrK6/rsfn9y1q+pZDUvFCXt9mJEPwoEsuRv9Im8okVqTuzPXncrAl9+qa4b\nrKgzI21BMYU8kOljQEKEaDa3aYgtAXQW+K5p0WNBGcFhOqpyxwsK1C7bID/rbj4q\nymkLwmjshQkpu7z59FcepzjjA5XE7274d9HwB/sbyBM1u+UaaI7rphC+bVMTzcCw\ngzVQ80jSFrfoGnvvJvwGA4IW/YzwLT7zzec0UYsFwHuQJEuRpHV40PfVpyshyxQ+\njnwA15uJAgMBAAECggEAR9hyUyz6C8B5tnI44WQkDHLRA3MAUjdThm84nxgwcGxv\nl9BHleCTgwwtJwJGo8nwRha8HOZ3SIc+z12ZwOEDOfCMIhZsI7AIg8dqoz+Rx/eQ\naGrKAirx030Hq8y0OBAbz59PDFhE6Ya6YEJX91n7qRJIevTqNBOgABmfvWQnkvf1\n5prOwylA1OoTc7rwug+A3ytOUdA3Se4RoHU8BBbuQCESXSeVkrMKZLJKGJeq2TM2\n1sCMBKJ7veLNcFehvtZyT4bPdzLMUpzKeemQo7WfnB2ijSlKfsqub57TzJIYHfap\nToNXmZXvCsFWQIUW61zahmTXYtKojMd0YfbL3uOSOQKBgQC9Zgk+2LHfMusH5tNj\n5zIlHiT91LJaCQIlXE/7O8zmiYrhkhKsvpZE4pgq3vxS3MFSoRjAcQW4TlekbNfl\nu2Uadjrx2FldV5gJpieDeYF5QZUO7lJF51Z6H3tlm5DJwE7lfpNX0RqeAQ/AC3gU\nUps7PuQzv+f6QwxvSiryyTTsuwKBgQDTQWOjUVtOKXPF9E6pmi26lLK/c/5MLYem\naCRtxGCPS0ZFuR/jZVuL8KlzP8kqUwvDTaNmXEzZnZNqL6+eCP+sFZ+cV0OrdCyh\nWTdJPePSKr7AoFqt6iF2aL0kOFhpypHthyLifJNS6oxjVLe1mjNgcCUs2MRyoTAP\nnzt/G5kWiwKBgCFpI45jmZUfHVjqfjXsbesgUzQ31jKNzkQa8b0HApFUiBxcsVCp\n2kZSlrdRWL+hU7Uo1/3ysiieIVXPIZLUKPSvEJzjJniR4C8rkWLfB1kFma7lmbvd\nIGMwtIrrE3KTqxdO6d0e9QwUcdvV6hvjqqCb6pO6ccizFTl4ovTrS5vLAoGAQ/xg\nN3gAPVhDxOoJwrU2kDw4hjqrFRL1+8y6JIU1WggsllWseH7vBksuDUPy1mchevnq\nYw/DP6lhfqPYDbDxrwzKcAL5aR0bG9XdX/nF7qYI+27fn+agXD362MQ1V950Ng/u\nXxseQmnvQixKbuwwKpIMtLESD53mHLDu8coM618CgYARaQxQs7gZPxSIbw167hL3\n8qb+cwkg29wlCUgMZfFOsuXEoJhl1rTtTxC0ruQfRSVJ/G3XM4C4hUA1/BHta6TP\nWio1eSh9E5g85iTZJN74I5I73OZAfQ4XJ9mK/jazjFjs5M2Gv/dFTEcxO6kccTY4\n7S5DS7gR9NHQI8dCQ0G8FA==\n-----END PRIVATE KEY-----\n'
      )
    ),
  };
}

export async function getYdbDriver(): Promise<Driver> {
  if (driver) {
    return driver;
  }

  const saKey = parseServiceAccountKey();
  const authService = new IamAuthService(saKey as any);

  const cleanEndpoint = ENDPOINT.replace(/^(grpcs?|https?):\/\//, '').replace(/\/.*$/, '');
  const isSecure = !ENDPOINT.startsWith('grpc://') && !ENDPOINT.startsWith('http://');
  const dbPath = DATABASE.startsWith('/') ? DATABASE : `/${DATABASE}`;
  const connectionString = `${isSecure ? 'grpcs' : 'grpc'}://${cleanEndpoint}${dbPath}`;

  delete process.env.YDB_ENDPOINT;
  console.log('[YDB] Using connection string:', connectionString);
  console.log('[YDB] Sanitized process.env.YDB_ENDPOINT:', process.env.YDB_ENDPOINT);

  driver = new DriverClass({
    connectionString,
    authService,
    poolSettings: {
      minLimit: 1,
      maxLimit: 10,
    },
  });

  const isReady = await driver.ready(5000);
  if (!isReady) {
    driver = null;
    throw new Error('YDB Driver connection timeout (5000ms)');
  }

  if (!tablesInitialized) {
    try {
      await initTables(driver);
      tablesInitialized = true;
    } catch (e: any) {
      console.warn('[YDB] initTables notice:', e.message);
    }
  }

  return driver;
}

async function initTables(d: Driver) {
  await d.tableClient.withSession(async (session: any) => {
    // 1. Table users
    try {
      await session.createTable(
        'users',
        new TableDescription()
          .withColumn(new Column('userId', Types.UTF8))
          .withColumn(new Column('email', Types.optional(Types.UTF8)))
          .withColumn(new Column('displayName', Types.optional(Types.UTF8)))
          .withColumn(new Column('passwordHash', Types.optional(Types.UTF8)))
          .withColumn(new Column('tokens', Types.INT64))
          .withColumn(new Column('authType', Types.optional(Types.UTF8)))
          .withColumn(new Column('createdAt', Types.UTF8))
          .withColumn(new Column('emailVerified', Types.optional(Types.BOOL)))
          .withColumn(new Column('verificationCode', Types.optional(Types.UTF8)))
          .withPrimaryKey('userId')
      );
      console.log('✅ Created table `users` in YDB');
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        console.warn('Init table users notice:', e.message);
      }
    }

    // Safely add columns to existing table if they don't exist yet
    try {
      await session.executeQuery('ALTER TABLE users ADD COLUMN emailVerified Bool;');
      console.log('✅ Added `emailVerified` column to `users` table via ALTER');
    } catch (_) {}

    try {
      await session.executeQuery('ALTER TABLE users ADD COLUMN verificationCode Utf8;');
      console.log('✅ Added `verificationCode` column to `users` table via ALTER');
    } catch (_) {}

    // 2. Table diagrams
    try {
      await session.createTable(
        'diagrams',
        new TableDescription()
          .withColumn(new Column('userId', Types.UTF8))
          .withColumn(new Column('id', Types.UTF8))
          .withColumn(new Column('title', Types.optional(Types.UTF8)))
          .withColumn(new Column('code', Types.optional(Types.UTF8)))
          .withColumn(new Column('language', Types.optional(Types.UTF8)))
          .withColumn(new Column('isPinned', Types.optional(Types.BOOL)))
          .withColumn(new Column('createdAt', Types.UTF8))
          .withColumn(new Column('updatedAt', Types.UTF8))
          .withPrimaryKeys('userId', 'id')
      );
      console.log('✅ Created table `diagrams` in YDB');
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        console.warn('Init table diagrams notice:', e.message);
      }
    }
  });
}

export function toJsNumber(val: any, fallback = 1): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'bigint') return Number(val);
  if (typeof val === 'string') {
    const p = parseInt(val, 10);
    return isNaN(p) ? fallback : p;
  }
  if (typeof val === 'object') {
    if (typeof val.toNumber === 'function') {
      try { return val.toNumber(); } catch {}
    }
    if ('low' in val && typeof val.low === 'number') {
      return val.low;
    }
  }
  const p = Number(val);
  return isNaN(p) ? fallback : p;
}

function hashPassword(password: string): string {
  const salt = process.env.PASSWORD_SALT || 'schemator_super_secret_salt_2026';
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// User Helpers
export async function getYdbUser(userId: string, email?: string) {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session: any) => {
    // 1. Try by userId
    const query = `
      DECLARE $userId AS Utf8;
      SELECT userId, email, displayName, tokens, createdAt
      FROM users
      WHERE userId = $userId;
    `;
    const preparedQuery = await session.prepareQuery(query);
    const { resultSets } = await session.executeQuery(preparedQuery, {
      $userId: TypedValues.utf8(userId),
    });

    const rows = resultSets[0]?.rows;
    if (rows && rows.length > 0) {
      const obj = TypedData.createNativeObjects(resultSets[0])[0];
      if (obj) obj.tokens = toJsNumber(obj.tokens, 1);
      return obj;
    }

    // 2. Fallback: Try by email if provided
    const cleanEmail = (email || (userId.includes('@') ? userId : '')).toLowerCase().trim();
    if (cleanEmail) {
      const emailQuery = `
        DECLARE $email AS Utf8;
        SELECT userId, email, displayName, tokens, createdAt
        FROM users
        WHERE email = $email;
      `;
      const prepEmail = await session.prepareQuery(emailQuery);
      const emailRes = await session.executeQuery(prepEmail, {
        $email: TypedValues.utf8(cleanEmail),
      });
      const eRows = emailRes.resultSets[0]?.rows;
      if (eRows && eRows.length > 0) {
        const obj = TypedData.createNativeObjects(emailRes.resultSets[0])[0];
        if (obj) obj.tokens = toJsNumber(obj.tokens, 1);
        return obj;
      }
    }

    return null;
  });
}

export async function upsertYdbUser(userId: string, email: string, displayName: string, hintTokens?: number) {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session: any) => {
    let tokensToKeep = typeof hintTokens === 'number' && !isNaN(hintTokens) && hintTokens > 0 ? hintTokens : 1;
    const cleanEmail = (email || '').toLowerCase().trim();

    // 1. Check existing tokens by userId
    const checkUserQuery = `
      DECLARE $userId AS Utf8;
      SELECT tokens FROM users WHERE userId = $userId;
    `;
    const prepCheck = await session.prepareQuery(checkUserQuery);
    const checkUserRes = await session.executeQuery(prepCheck, {
      $userId: TypedValues.utf8(userId),
    });
    const userRows = checkUserRes.resultSets[0]?.rows;
    if (userRows && userRows.length > 0) {
      const existing = TypedData.createNativeObjects(checkUserRes.resultSets[0])[0];
      const t = toJsNumber(existing?.tokens, 1);
      if (t > tokensToKeep) tokensToKeep = t;
    }

    // 2. Check existing tokens by email across all accounts
    if (cleanEmail) {
      const checkEmailQuery = `
        DECLARE $email AS Utf8;
        SELECT userId, tokens, email FROM users WHERE email = $email;
      `;
      const prepEmail = await session.prepareQuery(checkEmailQuery);
      const checkEmailRes = await session.executeQuery(prepEmail, {
        $email: TypedValues.utf8(cleanEmail),
      });
      const emailRows = checkEmailRes.resultSets[0]?.rows;
      if (emailRows && emailRows.length > 0) {
        const nativeEmailRows = TypedData.createNativeObjects(checkEmailRes.resultSets[0]);
        for (const row of nativeEmailRows) {
          const t = toJsNumber(row?.tokens, 1);
          if (t > tokensToKeep) {
            tokensToKeep = t;
          }
        }
      }
    }

    // 3. Upsert into users for current userId
    const upsertQuery = `
      DECLARE $userId AS Utf8;
      DECLARE $email AS Utf8;
      DECLARE $displayName AS Utf8;
      DECLARE $tokens AS Int64;
      DECLARE $createdAt AS Utf8;

      UPSERT INTO users (userId, email, displayName, tokens, createdAt)
      VALUES ($userId, $email, $displayName, $tokens, $createdAt);
    `;
    const prepUpsert = await session.prepareQuery(upsertQuery);
    await session.executeQuery(prepUpsert, {
      $userId: TypedValues.utf8(userId),
      $email: TypedValues.utf8(cleanEmail),
      $displayName: TypedValues.utf8(displayName || 'Пользователь'),
      $tokens: TypedValues.int64(tokensToKeep),
      $createdAt: TypedValues.utf8(new Date().toISOString()),
    });

    return { tokens: tokensToKeep };
  });
}

export async function decrementYdbToken(userId: string): Promise<number> {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session: any) => {
    const user = await getYdbUser(userId);
    const currentTokens = user ? toJsNumber(user.tokens, 1) : 1;
    const newTokens = Math.max(0, currentTokens - 1);

    const updateQuery = `
      DECLARE $userId AS Utf8;
      DECLARE $tokens AS Int64;
      UPDATE users SET tokens = $tokens WHERE userId = $userId;
    `;
    const prep = await session.prepareQuery(updateQuery);
    await session.executeQuery(prep, {
      $userId: TypedValues.utf8(userId),
      $tokens: TypedValues.int64(newTokens),
    });

    return newTokens;
  });
}

export async function registerYdbUser(email: string, pass: string, displayName: string) {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session: any) => {
    const cleanEmail = email.toLowerCase().trim();
    const userId = `email_${Buffer.from(cleanEmail).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;

    const checkQuery = `
      DECLARE $userId AS Utf8;
      SELECT userId, email FROM users WHERE userId = $userId;
    `;
    const prepCheck = await session.prepareQuery(checkQuery);
    const checkRes = await session.executeQuery(prepCheck, {
      $userId: TypedValues.utf8(userId),
    });

    const rows = checkRes.resultSets[0]?.rows;
    if (rows && rows.length > 0) {
      throw new Error('Пользователь с таким email уже зарегистрирован. Войдите.');
    }

    const passwordHash = hashPassword(pass);
    const finalName = displayName.trim() || cleanEmail.split('@')[0];

    const upsertQuery = `
      DECLARE $userId AS Utf8;
      DECLARE $email AS Utf8;
      DECLARE $displayName AS Utf8;
      DECLARE $tokens AS Int64;
      DECLARE $createdAt AS Utf8;
      DECLARE $passwordHash AS Utf8;
      DECLARE $authType AS Utf8;

      UPSERT INTO users (userId, email, displayName, tokens, createdAt, passwordHash, authType)
      VALUES ($userId, $email, $displayName, $tokens, $createdAt, $passwordHash, $authType);
    `;
    const prepUpsert = await session.prepareQuery(upsertQuery);
    await session.executeQuery(prepUpsert, {
      $userId: TypedValues.utf8(userId),
      $email: TypedValues.utf8(cleanEmail),
      $displayName: TypedValues.utf8(finalName),
      $tokens: TypedValues.int64(1),
      $createdAt: TypedValues.utf8(new Date().toISOString()),
      $passwordHash: TypedValues.utf8(passwordHash),
      $authType: TypedValues.utf8('local'),
    });

    console.log(`[YDB] Registered new user in YDB: ${userId} (${cleanEmail})`);

    return {
      uid: userId,
      email: cleanEmail,
      displayName: finalName,
      tokens: 1,
    };
  });
}

export async function loginYdbUser(email: string, pass: string) {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session: any) => {
    const cleanEmail = email.toLowerCase().trim();
    const userId = `email_${Buffer.from(cleanEmail).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;

    const query = `
      DECLARE $userId AS Utf8;
      SELECT userId, email, displayName, tokens, passwordHash FROM users WHERE userId = $userId;
    `;
    const prep = await session.prepareQuery(query);
    const res = await session.executeQuery(prep, {
      $userId: TypedValues.utf8(userId),
    });

    const rows = res.resultSets[0]?.rows;
    if (!rows || rows.length === 0) {
      throw new Error('Пользователь не найден. Пожалуйста, пройдите регистрацию.');
    }

    const userObj = TypedData.createNativeObjects(res.resultSets[0])[0];

    const inputHash = hashPassword(pass);
    const legacyHash = Buffer.from(pass).toString('base64');

    if (userObj.passwordHash && String(userObj.passwordHash) !== inputHash && String(userObj.passwordHash) !== legacyHash) {
      throw new Error('Неверный пароль.');
    }

    return {
      uid: String(userObj.userId),
      email: String(userObj.email || cleanEmail),
      displayName: String(userObj.displayName || cleanEmail.split('@')[0]),
      tokens: toJsNumber(userObj.tokens, 1),
    };
  });
}

export async function getYdbDiagrams(userId: string) {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session: any) => {
    const query = `
      DECLARE $userId AS Utf8;
      SELECT id, title, code, language, isPinned, createdAt, updatedAt
      FROM diagrams
      WHERE userId = $userId;
    `;
    const prep = await session.prepareQuery(query);
    const res = await session.executeQuery(prep, {
      $userId: TypedValues.utf8(userId),
    });

    const rows = res.resultSets[0]?.rows || [];
    return rows.map((r: any) => ({
      id: r.items?.[0]?.textValue || r.items?.[0]?.utf8Value,
      title: r.items?.[1]?.textValue || r.items?.[1]?.utf8Value,
      code: r.items?.[2]?.textValue || r.items?.[2]?.utf8Value,
      language: r.items?.[3]?.textValue || r.items?.[3]?.utf8Value,
      isPinned: r.items?.[4]?.boolValue || false,
      createdAt: r.items?.[5]?.textValue || r.items?.[5]?.utf8Value,
      updatedAt: r.items?.[6]?.textValue || r.items?.[6]?.utf8Value,
    }));
  });
}

export async function saveYdbDiagram(userId: string, diagram: any) {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session: any) => {
    const query = `
      DECLARE $userId AS Utf8;
      DECLARE $id AS Utf8;
      DECLARE $title AS Utf8;
      DECLARE $code AS Utf8;
      DECLARE $language AS Utf8;
      DECLARE $isPinned AS Bool;
      DECLARE $createdAt AS Utf8;
      DECLARE $updatedAt AS Utf8;

      UPSERT INTO diagrams (userId, id, title, code, language, isPinned, createdAt, updatedAt)
      VALUES ($userId, $id, $title, $code, $language, $isPinned, $createdAt, $updatedAt);
    `;
    const prep = await session.prepareQuery(query);
    await session.executeQuery(prep, {
      $userId: TypedValues.utf8(userId),
      $id: TypedValues.utf8(diagram.id),
      $title: TypedValues.utf8(diagram.title || 'Схема по ГОСТ 19.701-90'),
      $code: TypedValues.utf8(diagram.code || ''),
      $language: TypedValues.utf8(diagram.language || 'c_cpp'),
      $isPinned: TypedValues.bool(!!diagram.isPinned),
      $createdAt: TypedValues.utf8(diagram.createdAt || new Date().toISOString()),
      $updatedAt: TypedValues.utf8(new Date().toISOString()),
    });
  });
}

export async function deleteYdbDiagram(userId: string, diagramId: string) {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session: any) => {
    const query = `
      DECLARE $userId AS Utf8;
      DECLARE $id AS Utf8;
      DELETE FROM diagrams WHERE userId = $userId AND id = $id;
    `;
    const prep = await session.prepareQuery(query);
    await session.executeQuery(prep, {
      $userId: TypedValues.utf8(userId),
      $id: TypedValues.utf8(diagramId),
    });
    return { success: true };
  });
}
