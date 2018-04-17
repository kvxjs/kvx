import { EventEmitter } from 'events';
import { normalize, trimStart, assert } from '../helpers';

const RetryMax = 5;
const LockFlag = 0x2ddccbc058a50c18;
const LockTTL = 20;

class Store {
  constructor (options = {}) {
    try {
      options.promisify = fn => {
        return new Promise((resolve, reject) => {
          fn((err, data, res) => {
            if (err) return reject(err);
            return resolve({ data, res });
          });
        });
      };
      this.client = require('consul')(options);
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        throw new Error('Please install consul package manually');
      }
      throw err;
    }
  }

  format (data) {
    return {
      key: data.Key,
      value: data.Value,
      lastIndex: data.ModifyIndex
    };
  }

  normalize (key) {
    return trimStart(normalize(key));
  }

  async getActiveSession (key) {
    const { data } = await this.client.kv.get({ key });
    if (data && data.Session) {
      return data.Session;
    }
    return null;
  }

  async renewSession (key, ttl) {
    const session = await this.getActiveSession(key);
    if (session) {
      await this.client.session.renew(session);
      return session;
    }
    const { data } = await this.client.session.create({
      ttl: `${ttl / 2}s`,
      behavior: 'delete',
      lockdelay: '1ms'
    });
    return data.ID;
  }

  async get (key) {
    const { data } = await this.client.kv.get({
      key: this.normalize(key)
    });

    assert(data, 'KeyNotFound');

    return this.format(data);
  }

  async put (key, value, options) {
    const p = {
      key: this.normalize(key),
      value: value,
      flags: LockFlag
    };
    if (options && options.ttl > 0) {
      for (let retry = 1; retry <= RetryMax; retry++) {
        try {
          p.acquire = await this.renewSession(p.key, options.ttl);
          break;
        } catch (err) {
          if (retry === RetryMax) {
            throw err;
          }
        }
      }
    }
    const { data } = await this.client.kv.set(p);
    return data;
  }

  async delete (key) {
    const { data } = await this.client.kv.del(this.normalize(key));
    return data;
  }

  async exists (key) {
    try {
      await this.get(key);
      return true;
    } catch (err) {
      if (err.code === 'KeyNotFound') {
        return false;
      }
      throw err;
    }
  }

  async list (directory) {
    const key = this.normalize(directory);
    const { data } = await this.client.kv.get({ key, recurse: true });

    assert(data && data.length, 'KeyNotFound');

    return data.filter(v => v.Key !== key).map(this.format);
  }

  async deleteTree (directory) {
    const { data } = await this.client.kv.del({
      key: this.normalize(directory),
      recurse: true
    });
    return data;
  }

  watch (key) {
    const watcher = new EventEmitter();
    const w = this.client.watch({
      method: this.client.kv.get,
      options: {
        key: this.normalize(key)
      }
    }).on('change', (data) => {
      if (data) {
        return watcher.emit('change', null, this.format(data));
      }
      return watcher.emit('change', null, undefined);
    }).on('error', err => watcher.emit('change', err));

    watcher.end = () => w.end();
    return watcher;
  }

  watchTree (directory) {
    const watcher = new EventEmitter();
    const key = this.normalize(directory);
    const w = this.client.watch({
      method: this.client.kv.get,
      options: {
        key,
        recurse: true
      }
    }).on('change', (data) => {
      if (data && data.length) {
        const list = data.filter(v => v.Key !== key).map(this.format);
        return watcher.emit('change', null, list);
      }
      return watcher.emit('change', null, []);
    }).on('error', err => watcher.emit('change', err));

    watcher.end = () => w.end();
    return watcher;
  }

  lock (key, options) {
    const config = { key: this.normalize(key) };

    let ttl = LockTTL;
    if (options) {
      if (options.ttl) {
        ttl = options.ttl;
      }
      if (options.value) {
        config.value = options.value;
      }
    }
    config.session = {
      ttl: `${ttl / 2}s`,
      behavior: 'release',
      lockdelay: '1ms'
    };

    const lock = this.client.lock(config);

    function acquire () {
      lock.removeAllListeners();
      return new Promise((resolve, reject) => {
        lock.on('acquire', resolve);
        lock.on('error', reject);
        lock.acquire();
      });
    }

    function release () {
      return new Promise((resolve, reject) => {
        const done = () => {
          lock.removeAllListeners();
          resolve();
        };
        const fail = err => {
          lock.removeAllListeners();
          reject(err);
        };
        lock.on('end', done);
        lock.on('release', done);
        lock.on('error', fail);
        try {
          lock.release();
        } catch (err) {
          console.warn(err);
          // no need release
          done();
        }
      });
    }
    return {
      acquire,
      release,
      done (fn) {
        return acquire().then(fn)
          .then(value => {
            return release().then(() => value);
          })
          .catch(err => {
            return release().then(() => {
              throw err;
            });
          });
      }
    };
  }

  async atomicPut (key, value, previous) {
    const p = { value, key: this.normalize(key), flags: LockFlag };
    if (previous) {
      p.cas = previous.lastIndex;
    } else {
      p.cas = '0';
    }
    const { data } = await this.client.kv.set(p);
    return data;
  }

  async atomicDelete (key, previous) {
    assert(previous, 'PreviousNotSpecified');
    const p = { key: this.normalize(key), flags: LockFlag, cas: previous.lastIndex };
    const { data } = await this.client.kv.del(p);
    return data;
  }

  close () {

  }
}

module.exports = Store;
