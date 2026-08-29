import { Driver, getCredentialsFromServiceAccountKeyFile, TypedData } from 'ydb-sdk';

const DATABASE = '/ru-central1/b1guc5cn5a6d63lgsuiq/etnjqd1tqkrk2upndh4i';
const ENDPOINT = 'grpcs://ydb.serverless.yandexcloud.net:2135';

// Service Account SA Key configuration
const saKey = {
  id: "ajej8vsdi4dt97luhctd",
  serviceAccountId: "aje30ei8425gdnnqjss3",
  keyAlgorithm: "RSA_2048",
  publicKey: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAocPWgvAr/6vJZyvNkKPM\njz5Mq8dSHUMID4iJ+sBTptpln8AES2391JbEOF37+0YvQgqiD8omRXK+nYksmoDp\n8G8Sls8wkuW6wvoLgnHDK+K1BGTl7XQ97/SGjQ/mPqLeI4tznWQiyYE76yVXWKUh\nMriGjLeQmIRff3gJIPDMVuh5eG8mP44nVe9EQp3o6b3bOhHPWR1zoLj54BnIhnKk\na5SAUxCa0QXNsi+6Nc3jxGgrUYjK7CyoQac2cXIwlLJKzEQe5IV7byiEV8kCOKbZ\nD46464oql78TkNOr+ZiLmzX6xwr5I0oczFkdNELgeaU8XHvEydHxrAoWPooiM19V\n4QIDAQAB\n-----END PUBLIC KEY-----\n",
  privateKey: Buffer.from("-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQChw9aC8Cv/q8ln\nK82Qo8yPPkyrx1IdQwgPiIn6wFOm2mWfwARLbf3UlsQ4Xfv7Ri9CCqIPyiZFcr6d\niSyagOnwbxKWzzCS5brC+guCccMr4rUEZOXtdD3v9IaND+Y+ot4ji3OdZCLJgTvr\nJVdYpSEyuIaMt5CYhF9/eAkg8MxW6Hl4byY/jidV70RCnejpvds6Ec9ZHXOguPng\nGciGcqRrlIBTEJrRBc2yL7o1zePEaCtRiMrsLKhBpzZxcjCUskrMRB7khXtvKIRX\nyQI4ptkPjrjriiqXvxOQ06v5mIubNfrHCvkjShzMWR00QuB5pTxce8TJ0fGsChY+\niiIzX1XhAgMBAAECggEAMyF+rVaS4bZ/6595020i3GgZvfY7q0ojwx0qV9rw1f2U\nP6Fm+hyjLc4V6aczXaI6j8pinVENNchmHc9dDN0QlNHW81o8BUKd/MEiYDHrOfTn\nuKLX1m12omENIotTAJtkUaHjgm1DXaP+t33PFRLk4m5XASWIi9zTfqwHXqUeQZ2r\nEO8rAuKvuZyItNpglSCutv0XOHx4FX2HgLiyICUE9y41M6O3nh5jCPIKlpezk26a\nkAzAyS3PKRKHGi5kvElcClmZzkWBIHtLtgz6KWqiIXBb7QQEWKA5Vf2jZRKTcYp4\nij3p1zXypcsc3qgazHVHXESG2KThsFph0+9TpLfE3QKBgQDQVjDxZBnTJStAFxwq\nfIsTpixj2TJe2r1DYWlRZQVGk8+EyAcEYlkG3tcuHmVFxsVEbnr44AG2HqLanxBp\nIXbZiYFlsrRrsgFLUXwkjIQhLPV01neGyhAtX6LEJw0CrE6KhvO/w/zUhiuouVrd\nS1bRjSnc4PW+e9uBXAJ0oMN44wKBgQDGxgxHsMK1mBbfwgdRdUb/4r5tXvmk+CM4\n2757P3GHqRclwrZNdY7xLElwXTqX2NsrODwwwvZ7KnkOEVDsbgc5mmJ50sc+gKFB\n7jr39z0od6g9VIIU4qXj+jWyHgd+Wmi3b+Yi505yHBz8Viprc87PClgVZeQxDB6v\nzA+WF3ElawKBgQCrFgztPtICViS1ZgUIUux3P2B2wreds633Nnihkf8KHXouRYGV\ntRn9DWTSB74M1hXLg5rS5Eojf/cm57c3TnbmYAh2NpH5Wt27N3hmH0qmX+BWiYTw\nmOE+Eap9wL/rcQqyse5bjZwD/wa9cTHQRv1N6sn1DHxiaB4zlhaiJh9AFwKBgQCx\nWsZcNQgWFUTbk3kKInUeHcdBOQvQOSLcOZ1ExL/chm/D3m7gwDKxV42TN2vvTquH\nbZ6u91YLYUMv3R1yR14k9G5HOl1SlFzNwe1VkIE+GT3AsyV50xynRHoimg6fm7Vx\nbuNNY0soH5NxRsSEqYjuTNF5DjfD14eN3apOhk4LTwKBgH3EYRLsGJw9spRiVbC/\nEV/oFn/HHgD9vBDu19KfPS5Q4rtSMVtvHGwfiEAoz8XuzEaMr/nh+rTdarZxtZyF\nyggOTTr3jB8g7XbxRj3BC0qJ4Jde1qsRWYjrkXhlzGYkCSP0eJVL6k9hBlG1B8Nv\n9f8VqF0/K2PMXpparAfT2dsn\n-----END PRIVATE KEY-----\n")
};

let ydbDriver: Driver | null = null;

export async function getYdbDriver(): Promise<Driver> {
  if (!ydbDriver) {
    const authService = getCredentialsFromServiceAccountKeyFile(saKey as any);
    ydbDriver = new Driver({
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
      $userId: TypedData.utf8(userId)
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
      SELECT tokens FROM users WHERE userId = $userId;
    `;
    const preparedCheck = await session.prepareQuery(checkQuery);
    const checkRes = await session.executeQuery(preparedCheck, {
      $userId: TypedData.utf8(userId)
    });

    const exists = (checkRes.resultSets[0]?.rows?.length ?? 0) > 0;

    if (!exists) {
      const insertQuery = `
        DECLARE $userId AS Utf8;
        DECLARE $email AS Utf8;
        DECLARE $displayName AS Utf8;
        DECLARE $tokens AS Int64;
        DECLARE $createdAt AS Utf8;

        UPSERT INTO users (userId, email, displayName, tokens, createdAt)
        VALUES ($userId, $email, $displayName, $tokens, $createdAt);
      `;
      const preparedInsert = await session.prepareQuery(insertQuery);
      await session.executeQuery(preparedInsert, {
        $userId: TypedData.utf8(userId),
        $email: TypedData.utf8(email || ''),
        $displayName: TypedData.utf8(displayName || 'Пользователь Яндекс'),
        $tokens: TypedData.int64(1),
        $createdAt: TypedData.utf8(new Date().toISOString()),
      });
      return { userId, email, displayName, tokens: 1 };
    } else {
      return { userId, email, displayName };
    }
  });
}

export async function decrementYdbToken(userId: string): Promise<number | null> {
  const driver = await getYdbDriver();
  return await driver.tableClient.withSession(async (session) => {
    const query = `
      DECLARE $userId AS Utf8;
      SELECT tokens FROM users WHERE userId = $userId;
    `;
    const prep = await session.prepareQuery(query);
    const res = await session.executeQuery(prep, {
      $userId: TypedData.utf8(userId)
    });

    const rows = res.resultSets[0]?.rows;
    if (!rows || rows.length === 0) return null;
    
    // Get current tokens
    const currentTokens = Number((rows[0].items as any)?.[0]?.int64Value || 1);
    if (currentTokens <= 0) {
      return 0;
    }

    const newTokens = currentTokens - 1;
    const updateQuery = `
      DECLARE $userId AS Utf8;
      DECLARE $tokens AS Int64;
      UPDATE users SET tokens = $tokens WHERE userId = $userId;
    `;
    const prepUpdate = await session.prepareQuery(updateQuery);
    await session.executeQuery(prepUpdate, {
      $userId: TypedData.utf8(userId),
      $tokens: TypedData.int64(newTokens)
    });

    return newTokens;
  });
}

// Diagrams Helpers
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
      $userId: TypedData.utf8(userId)
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
      $userId: TypedData.utf8(userId),
      $id: TypedData.utf8(diagram.id),
      $title: TypedData.utf8(diagram.title || 'Схема по ГОСТ 19.701-90'),
      $code: TypedData.utf8(diagram.code || ''),
      $language: TypedData.utf8(diagram.language || 'c_cpp'),
      $isPinned: TypedData.bool(!!diagram.isPinned),
      $createdAt: TypedData.utf8(diagram.createdAt || new Date().toISOString()),
      $updatedAt: TypedData.utf8(new Date().toISOString()),
    });
    return { success: true };
  });
}
