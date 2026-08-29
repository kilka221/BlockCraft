import ydbSdk from 'ydb-sdk';
import type { Driver } from 'ydb-sdk';

const { Driver: DriverClass, IamAuthService, TypedData, TypedValues } = ydbSdk;

const DATABASE = '/ru-central1/b1guc5cn5a6d63lgsuiq/etnjqd1tqkrk2upndh4i';
const ENDPOINT = 'grpcs://ydb.serverless.yandexcloud.net:2135';

// Service Account SA Key configuration
const saKey = {
  accessKeyId: "ajej8vsdi4dt97luhctd",
  serviceAccountId: "aje30ei8425gdnnqjss3",
  iamEndpoint: "iam.api.cloud.yandex.net:443",
  privateKey: Buffer.from("-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQChw9aC8Cv/q8ln\nK82Qo8yPPkyrx1IdQwgPiIn6wFOm2mWfwARLbf3UlsQ4Xfv7Ri9CCqIPyiZFcr6d\niSyagOnwbxKWzzCS5brC+guCccMr4rUEZOXtdD3v9IaND+Y+ot4ji3OdZCLJgTvr\nJVdYpSEyuIaMt5CYhF9/eAkg8MxW6Hl4byY/jidV70RCnejpvds6Ec9ZHXOguPng\nGciGcqRrlIBTEJrRBc2yL7o1zePEaCtRiMrsLKhBpzZxcjCUskrMRB7khXtvKIRX\nyQI4ptkPjrjriiqXvxOQ06v5mIubNfrHCvkjShzMWR00QuB5pTxce8TJ0fGsChY+\niiIzX1XhAgMBAAECggEAMyF+rVaS4bZ/6595020i3GgZvfY7q0ojwx0qV9rw1f2U\nP6Fm+hyjLc4V6aczXaI6j8pinVENNchmHc9dDN0QlNHW81o8BUKd/MEiYDHrOfTn\nuKLX1m12omENIotTAJtkUaHjgm1DXaP+t33PFRLk4m5XASWIi9zTfqwHXqUeQZ2r\nEO8rAuKvuZyItNpglSCutv0XOHx4FX2HgLiyICUE9y41M6O3nh5jCPIKlpezk26a\nkAzAyS3PKRKHGi5kvElcClmZzkWBIHtLtgz6KWqiIXBb7QQEWKA5Vf2jZRKTcYp4\nij3p1zXypcsc3qgazHVHXESG2KThsFph0+9TpLfE3QKBgQDQVjDxZBnTJStAFxwq\nfIsTpixj2TJe2r1DYWlRZQVGk8+EyAcEYlkG3tcuHmVFxsVEbnr44AG2HqLanxBp\nIXbZiYFlsrRrsgFLUXwkjIQhLPV01neGyhAtX6LEJw0CrE6KhvO/w/zUhiuouVrd\nS1bRjSnc4PW+e9uBXAJ0oMN44wKBgQDGxgxHsMK1mBbfwgdRdUb/4r5tXvmk+CM4\n2757P3GHqRclwrZNdY7xLElwXTqX2NsrODwwwvZ7KnkOEVDsbgc5mmJ50sc+gKFB\n7jr39z0od6g9VIIU4qXj+jWyHgd+Wmi3b+Yi505yHBz8Viprc87PClgVZeQxDB6v\nzA+WF3ElawKBgQCrFgztPtICViS1ZgUIUux3P2B2wreds633Nnihkf8KHXouRYGV\ntRn9DWTSB74M1hXLg5rS5Eojf/cm57c3TnbmYAh2NpH5Wt27N3hmH0qmX+BWiYTw\nmOE+Eap9wL/rcQqyse5bjZwD/wa9cTHQRv1N6sn1DHxiaB4zlhaiJh9AFwKBgQCx\nWsZcNQgWFUTbk3kKInUeHcdBOQvQOSLcOZ1ExL/chm/D3m7gwDKxV42TN2vvTquH\nbZ6u91YLYUMv3R1yR14k9G5HOl1SlFzNwe1VkIE+GT3AsyV50xynRHoimg6fm7Vx\nbuNNY0soH5NxRsSEqYjuTNF5DjfD14eN3apOhk4LTwKBgH3EYRLsGJw9spRiVbC/\nEV/oFn/HHgD9vBDu19KfPS5Q4rtSMVtvHGwfiEAoz8XuzEaMr/nh+rTdarZxtZyF\nyggOTTr3jB8g7XbxRj3BC0qJ4Jde1qsRWYjrkXhlzGYkCSP0eJVL6k9hBlG1B8Nv\n9f8VqF0/K2PMXpparAfT2dsn\n-----END PRIVATE KEY-----\n")
};

let ydbDriver: Driver | null = null;

export async function getYdbDriver(): Promise<Driver> {
  if (!ydbDriver) {
    const authService = new IamAuthService(saKey as any);
    ydbDriver = new DriverClass({
      endpoint: ENDPOINT,
      database: DATABASE,
      authService,
    });

    const ready = await ydbDriver.ready(5000);
    if (!ready) {
      console.error('YDB Driver failed to connect');
    } else {
      console.log('✅ Successfully connected to Yandex Database (YDB Serverless)!');
    }
  }
  return ydbDriver;
}

// Helper to safely convert YDB Int64 (which ydb-sdk returns as Long/BigInt/object) to a JS number
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

// User Helpers
export async function getYdbUser(userId: string, email?: string) {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session) => {
    // 1. Try by userId
    const query = `
      DECLARE $userId AS Utf8;
      SELECT userId, email, displayName, tokens, createdAt
      FROM users
      WHERE userId = $userId;
    `;
    const preparedQuery = await session.prepareQuery(query);
    const { resultSets } = await session.executeQuery(preparedQuery, {
      $userId: TypedValues.utf8(userId)
    });

    const rows = resultSets[0]?.rows;
    if (rows && rows.length > 0) {
      const obj = TypedData.createNativeObjects(resultSets[0])[0];
      if (obj) obj.tokens = toJsNumber(obj.tokens, 1);
      return obj;
    }

    // 2. Fallback: Try by email if provided or if userId looks like an email
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
        $email: TypedValues.utf8(cleanEmail)
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
  return await driver.tableClient.withSession(async (session) => {
    let tokensToKeep = typeof hintTokens === 'number' && !isNaN(hintTokens) && hintTokens > 0 ? hintTokens : 1;
    const cleanEmail = (email || '').toLowerCase().trim();

    // 1. Check existing tokens by userId
    const checkUserQuery = `
      DECLARE $userId AS Utf8;
      SELECT userId, tokens, email FROM users WHERE userId = $userId;
    `;
    const prepCheckUser = await session.prepareQuery(checkUserQuery);
    const checkUserRes = await session.executeQuery(prepCheckUser, {
      $userId: TypedValues.utf8(userId)
    });
    const userRows = checkUserRes.resultSets[0]?.rows;
    if (userRows && userRows.length > 0) {
      const existing = TypedData.createNativeObjects(checkUserRes.resultSets[0])[0];
      const t = toJsNumber(existing?.tokens, 1);
      if (t > tokensToKeep) tokensToKeep = t;
    }

    // 2. Check existing tokens by email across all accounts for this email
    if (cleanEmail) {
      const checkEmailQuery = `
        DECLARE $email AS Utf8;
        SELECT userId, tokens, email FROM users WHERE email = $email;
      `;
      const prepCheckEmail = await session.prepareQuery(checkEmailQuery);
      const checkEmailRes = await session.executeQuery(prepCheckEmail, {
        $email: TypedValues.utf8(cleanEmail)
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

    // 4. Update all accounts linked to this email to have at least tokensToKeep
    if (cleanEmail) {
      const updateOtherQuery = `
        DECLARE $email AS Utf8;
        DECLARE $tokens AS Int64;
        UPDATE users SET tokens = $tokens WHERE email = $email;
      `;
      const prepUpdateOther = await session.prepareQuery(updateOtherQuery);
      await session.executeQuery(prepUpdateOther, {
        $email: TypedValues.utf8(cleanEmail),
        $tokens: TypedValues.int64(tokensToKeep)
      });
    }

    console.log(`[YDB] Saved user to Yandex Cloud YDB: userId=${userId}, email=${cleanEmail}, displayName=${displayName}, tokens=${tokensToKeep}`);
    return { tokens: tokensToKeep };
  });
}

export async function decrementYdbToken(userId: string): Promise<number> {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session) => {
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
      $tokens: TypedValues.int64(newTokens)
    });

    return newTokens;
  });
}

export async function getYdbDiagrams(userId: string) {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session) => {
    const query = `
      DECLARE $userId AS Utf8;
      SELECT id, title, code, language, isPinned, createdAt, updatedAt
      FROM diagrams
      WHERE userId = $userId;
    `;
    const prep = await session.prepareQuery(query);
    const res = await session.executeQuery(prep, {
      $userId: TypedValues.utf8(userId)
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
  return await driver.tableClient.withSession(async (session) => {
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

export async function registerYdbUser(email: string, pass: string, displayName: string) {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session) => {
    const checkQuery = `
      DECLARE $userId AS Utf8;
      SELECT userId, email, displayName FROM users WHERE userId = $userId;
    `;
    const cleanEmail = email.toLowerCase().trim();
    const userId = `email_${Buffer.from(cleanEmail).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;
    
    const prepCheck = await session.prepareQuery(checkQuery);
    const checkRes = await session.executeQuery(prepCheck, {
      $userId: TypedValues.utf8(userId)
    });

    const rows = checkRes.resultSets[0]?.rows;
    if (rows && rows.length > 0) {
      throw new Error('Пользователь с таким email уже зарегистрирован.');
    }

    const passwordHash = Buffer.from(pass).toString('base64');
    const finalName = displayName.trim() || cleanEmail.split('@')[0];

    const upsertQuery = `
      DECLARE $userId AS Utf8;
      DECLARE $email AS Utf8;
      DECLARE $displayName AS Utf8;
      DECLARE $tokens AS Int64;
      DECLARE $createdAt AS Utf8;
      DECLARE $passwordHash AS Utf8;

      UPSERT INTO users (userId, email, displayName, tokens, createdAt, passwordHash)
      VALUES ($userId, $email, $displayName, $tokens, $createdAt, $passwordHash);
    `;
    const prepUpsert = await session.prepareQuery(upsertQuery);
    await session.executeQuery(prepUpsert, {
      $userId: TypedValues.utf8(userId),
      $email: TypedValues.utf8(cleanEmail),
      $displayName: TypedValues.utf8(finalName),
      $tokens: TypedValues.int64(1),
      $createdAt: TypedValues.utf8(new Date().toISOString()),
      $passwordHash: TypedValues.utf8(passwordHash),
    });

    console.log(`[YDB] Registered new user in YDB: ${userId} (${cleanEmail})`);

    return {
      uid: userId,
      email: cleanEmail,
      displayName: finalName,
      tokens: 1
    };
  });
}

export async function loginYdbUser(email: string, pass: string) {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session) => {
    const cleanEmail = email.toLowerCase().trim();
    const userId = `email_${Buffer.from(cleanEmail).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;

    const query = `
      DECLARE $userId AS Utf8;
      SELECT userId, email, displayName, tokens, passwordHash FROM users WHERE userId = $userId;
    `;
    const prep = await session.prepareQuery(query);
    const res = await session.executeQuery(prep, {
      $userId: TypedValues.utf8(userId)
    });

    const rows = res.resultSets[0]?.rows;
    if (!rows || rows.length === 0) {
      throw new Error('Пользователь с таким email не найден. Пройдите регистрацию.');
    }

    const userObj = TypedData.createNativeObjects(res.resultSets[0])[0];
    const expectedHash = Buffer.from(pass).toString('base64');
    
    if (userObj.passwordHash && String(userObj.passwordHash) !== expectedHash) {
      throw new Error('Неверный пароль.');
    }

    return {
      uid: String(userObj.userId),
      email: String(userObj.email || cleanEmail),
      displayName: String(userObj.displayName || cleanEmail.split('@')[0]),
      tokens: toJsNumber(userObj.tokens, 1)
    };
  });
}

export async function deleteYdbDiagram(userId: string, diagramId: string) {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session) => {
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

