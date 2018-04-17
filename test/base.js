import { expect } from 'chai';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function select(...fns) {
  return Promise.race(
    fns.map(fn => fn())
  );
}

async function testPutGetDeleteExists(kv) {
  try {
    await kv.get('testPutGetDelete_not_exist_key');
  } catch(err) {
    expect(err).to.be.an('error');
    expect(err.code).to.equal('KeyNotFound');
  }
  const value = 'bar';
  const keys = [
    'testPutGetDeleteExists',
    'testPutGetDeleteExists/',
    'testPutGetDeleteExists/testbar/',
    'testPutGetDeleteExists/testbar/testfoobar'
  ];
  for (const key of keys) {
    let success;
    success = await kv.put(key, value);
    expect(success).to.be.true;

    const pair = await kv.get(key);
    expect(pair.value).to.equal(value);
    expect(pair.lastIndex).to.not.equal(0);

    const exists = await kv.exists(key);
    expect(exists).to.be.true;

    success = await kv.delete(key);
    // expect(success).to.be.true;
    try {
      await kv.get(key);
    } catch(err) {
      expect(err).to.be.an('error');
      expect(err.code).to.equal('KeyNotFound');
    }

    const has = await kv.exists(key);
    expect(has).to.be.false;
  }
}

async function testList(kv) {
  const prefix = 'testList';
  const k1 = 'testList/first';
  const v1 = 'first';
  const k2 = 'testList/second';
  const v2 = 'second';

  await kv.put(k1, v1);
  await kv.put(k2, v2);

  for (const parent of [prefix, `${prefix}/`]) {
    const pairs = await kv.list(parent);
    expect(pairs).to.have.lengthOf(2);
    for (const pair of pairs) {
      if (pair.key === k1) {
        expect(pair.value).to.equal(v1);
      }
      if (pair.key === k2) {
        expect(pair.value).to.equal(v2);
      }
    }
  }

  try {
    await kv.list('idontexist');
  } catch(err) {
    expect(err).to.be.an('error');
    expect(err.code).to.equal('KeyNotFound');
  }
}

async function testDeleteTree(kv) {
  const prefix = 'testDeleteTree';
  const k1 = 'testDeleteTree/first';
  const v1 = 'first';
  const k2 = 'testDeleteTree/second';
  const v2 = 'second';

  await kv.put(k1, v1);
  await kv.put(k2, v2);

  const p1 = await kv.get(k1);
  expect(p1.value).to.equal(v1);
  expect(p1.lastIndex).to.not.equal(0);

  const p2 = await kv.get(k2);
  expect(p2.value).to.equal(v2);
  expect(p2.lastIndex).to.not.equal(0);

  const success = await kv.deleteTree(prefix);
  // expect(success).to.be.true;
  try {
    await kv.get(k1);
  } catch(err) {
    expect(err).to.be.an('error');
    expect(err.code).to.equal('KeyNotFound');
  }
  try {
    await kv.get(k2);
  } catch(err) {
    expect(err).to.be.an('error');
    expect(err.code).to.equal('KeyNotFound');
  }
}

async function testAtomicPut(kv) {
  const key = 'testAtomicPut';
  const value = 'world';

  await kv.put(key, value);

  const pair = await kv.get(key);
  expect(pair.value).to.equal(value);
  expect(pair.lastIndex).to.not.equal(0);

  let success;
  success = await kv.atomicPut(key, 'WORLD');
  expect(success).to.be.false;

  success = await kv.atomicPut(key, 'WORLD', pair);
  expect(success).to.be.true;

  pair.lastIndex = 6744;
  success = await kv.atomicPut(key, 'WORLD', pair);
  expect(success).to.be.false;
}

async function testAtomicPutCreate(kv) {
  const key = 'testAtomicPutCreate/create';
  const value = 'putcreate';

  let success;
  success = await kv.atomicPut(key, value);
  expect(success).to.be.true;

  const pair = await kv.get(key);
  expect(pair.value).to.equal(value);

  success = await kv.atomicPut(key, value);
  expect(success).to.be.false;

  success = await kv.atomicPut(key, 'PUTCREATE', pair);
  expect(success).to.be.true;
}

async function testAtomicPutWithSlashSuffixKey(kv) {
  const key = 'testAtomicPutWithSlashSuffixKey/key/';
  const success = await kv.atomicPut(key);
  expect(success).to.be.true;
  const pair = await kv.get(key);
  expect(pair.value).to.be.null;
}

async function testAtomicDelete(kv) {
  const key = 'testAtomicDelete';
  const value = 'world';

  await kv.put(key, value);
  const pair = await kv.get(key);
  expect(pair.value).to.equal(value);
  expect(pair.lastIndex).to.not.equal(0);

  const tmp = pair.lastIndex;
  pair.lastIndex = 6744;

  let success;
  success = await kv.atomicDelete(key, pair);
  // expect(success).to.be.false;

  pair.lastIndex = tmp;
  success = await kv.atomicDelete(key, pair);
  // expect(success).to.be.true;
}

async function testWatch(kv) {
  const key = 'testWatch';
  const value = 'world';

  await kv.put(key, value);

  let index = 1;
  function step() {
    setTimeout(() => {
      kv.put(key, value + index).then(() => {
        if (index < 4) {
          step();
        }
        index++;
      });
    }, 250);
  }

  step();

  const watcher = kv.watch(key);
  await new Promise(resolve => {
    let count = 0;
    watcher.on('change', (err, pair) => {
      expect(err).to.be.null;
      expect(pair.key).to.equal(key);

      if (count === 0) {
        expect(pair.value).to.equal(value);
      } else {
        expect(pair.value).to.equal(value + count);
      }

      count++;
      if (count > 4) {
        watcher.end();
        resolve();
      }
    });
  });
}

async function testWatchTree(kv) {
  const dir = 'testWatchTree';
  const node1 = 'testWatchTree/node1';
  const value1 = 'node1';
  const node2 = 'testWatchTree/node2';
  const value2 = 'node2';
  const node3 = 'testWatchTree/node3';
  const value3 = 'node3';

  await kv.put(node1, value1);
  await kv.put(node2, value2);
  await kv.put(node3, value3);

  setTimeout(() => {
    kv.delete(node3);
  }, 500);

  const watcher = kv.watchTree(dir);
  await new Promise(resolve => {
    let count = 0;
    watcher.on('change', (err, pairs) => {
      expect(err).to.be.null;
      if (count === 0) {
        expect(pairs.length).to.equal(3);
      } else {
        expect(pairs.length).to.equal(2);
      }

      count++;
      if (count > 1) {
        watcher.end();
        resolve();
      }
    });
  });
}

async function testLockUnlock(kv) {
  const key = 'testLockUnlock';
  const value = 'bar';
  const lock = kv.lock(key, { value, ttl: 2 });

  let pair;

  await lock.acquire();
  pair = await kv.get(key);
  expect(pair.value).to.equal(value);
  expect(pair.lastIndex).to.not.equal(0);
  await lock.release();

  await lock.acquire();
  pair = await kv.get(key);
  expect(pair.value).to.equal(value);
  expect(pair.lastIndex).to.not.equal(0);
  await lock.release();

  pair = await lock.done(async () => {
    return await kv.get(key);
  });

  expect(pair.value).to.equal(value);
  expect(pair.lastIndex).to.not.equal(0);
}

async function testLockTTL(kv, backup) {
  const key = 'testLockTTL';
  let value = 'bar';

  let lock = backup.lock(key, { value, ttl: 3 });
  await lock.acquire();
  let pair = await backup.get(key);
  expect(pair.value).to.equal(value);
  expect(pair.lastIndex).to.not.equal(0);

  await sleep(1000);

  value = 'foobar';
  const lock2 = kv.lock(key, { value, ttl: 3 });
  await select(
    async () => {
      await lock2.acquire();
      throw new Error('The lock should not acquire');
    },
    async () => {
      await sleep(1500);
      await lock2.release();
    }
  );

  await backup.close();
  await lock.release();

  await lock2.acquire();
  pair = await kv.get(key);
  expect(pair.value).to.equal(value);
  expect(pair.lastIndex).to.not.equal(0);
  await lock2.release();
}

async function testLockWait(kv, backup) {
  const key = 'testLockWait';
  const lock1 = kv.lock(key, { ttl: 3 });
  const lock2 = kv.lock(key, { ttl: 3 });

  await lock1.acquire();
  await select(
    async () => {
      const t1 = Date.now();
      await lock2.acquire();
      const t2 = Date.now();
      await lock2.release();
      expect(t2 - t1 < 7000).to.be.true;
    },
    async () => {
      await sleep(2000);
      await lock1.release();
      await sleep(5000);
      throw new Error('Lock2 should acquire before');
    }
  );
}

async function testPutTTL(kv, backup) {
  const key1 = 'testPutTTL/first';
  const value1 = 'foo';
  const key2 = 'testPutTTL/second';
  const value2 = 'bar';

  await backup.put(key1, value1, { ttl: 2 });
  await backup.put(key2, value2, { ttl: 2 });

  let pair;
  pair = await kv.get(key1);
  expect(pair.value).to.equal(value1);

  pair = await kv.get(key2);
  expect(pair.value).to.equal(value2);

  await backup.close();
  await sleep(3000);

  try {
    await kv.get(key1);
  } catch(err) {
    expect(err).to.be.an('error');
    expect(err.code).to.equal('KeyNotFound');
  }
  try {
    await kv.get(key2);
  } catch(err) {
    expect(err).to.be.an('error');
    expect(err.code).to.equal('KeyNotFound');
  }
}

export async function runTestCommon(kv) {
  await testPutGetDeleteExists(kv);
  await testList(kv);
  await testDeleteTree(kv);
}

export async function runTestAtomic(kv) {
  await testAtomicPut(kv);
  await testAtomicPutCreate(kv);
  await testAtomicPutWithSlashSuffixKey(kv);
  await testAtomicDelete(kv);
}

export async function runTestWatch(kv) {
  await testWatch(kv);
  await testWatchTree(kv);
}

export async function runTestLock(kv, backup) {
  await testLockUnlock(kv);
  await testLockTTL(kv, backup);
  await testLockWait(kv, backup);
  await testPutTTL(kv, backup);
}

export async function runCleanup(kv) {
  const keys = [
    'testPutGetDeleteExists',
    'testList',
    'testDeleteTree',
    'testWatch',
    'testWatchTree',
    'testAtomicPutWithSlashSuffixKey',
    'testAtomicPut',
    'testAtomicPutCreate',
    'testAtomicDelete',
    'testLockUnlock',
    'testLockTTL',
    'testLockWait',
    'testPutTTL'
  ];
  for (const key of keys) {
    await kv.deleteTree(key);
    await kv.delete(key);
  }
}
