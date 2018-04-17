import kvx from '../src';
import * as base from './base';

describe('Test consul', function () {
  this.timeout(0);

  let kv = null;
  let backup = null;

  before(() => {
    kv = kvx('consul');
    backup = kvx('consul');
    return base.runCleanup(kv);
  });

  it('run test common', () => {
    return base.runTestCommon(kv);
  });

  it('run test atomic', () => {
    return base.runTestAtomic(kv);
  });

  it('run test watch', () => {
    return base.runTestWatch(kv);
  });

  it('run test lock', () => {
    return base.runTestLock(kv, backup);
  });
});
