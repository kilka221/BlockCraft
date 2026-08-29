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

// User Helpers
export async function getYdbUser(userId: string) {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session) => {
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
    if (!rows || rows.length === 0) return null;
    return TypedData.createNativeObjects(resultSets[0])[0];
  });
}

export async function upsertYdbUser(userId: string, email: string, displayName: string) {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session) => {
    // Check if exists
    const checkQuery = `
      DECLARE $userId AS Utf8;
      SELECT userId, tokens, email, displayName FROM users WHERE userId = $userId;
    `;
    const prepCheck = await session.prepareQuery(checkQuery);
    const checkRes = await session.executeQuery(prepCheck, {
      $userId: TypedValues.utf8(userId)
    });

    const rows = checkRes.resultSets[0]?.rows;
    let tokensToKeep = 1;

    if (rows && rows.length > 0) {
      const existing = TypedData.createNativeObjects(checkRes.resultSets[0])[0];
      tokensToKeep = Number(existing.tokens) || 1;
    }

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
      $email: TypedValues.utf8(email || ''),
      $displayName: TypedValues.utf8(displayName || 'Пользователь'),
      $tokens: TypedValues.int64(tokensToKeep),
      $createdAt: TypedValues.utf8(new Date().toISOString()),
    });

    console.log(`[YDB] Saved user to Yandex Cloud YDB: userId=${userId}, email=${email}, displayName=${displayName}, tokens=${tokensToKeep}`);
    return { tokens: tokensToKeep };
  });
}

export async function decrementYdbToken(userId: string): Promise<number> {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session) => {
    const user = await getYdbUser(userId);
    const currentTokens = user ? Number(user.tokens) : 1;
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
    return { success: true };
  });
}
