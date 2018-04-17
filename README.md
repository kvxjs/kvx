kvx
===========

> A better xlsx lib for read / write / toTable / from Table

[![NPM version](https://img.shields.io/npm/v/kvx.svg)](https://www.npmjs.com/package/kvx)
[![NPM downloads](https://img.shields.io/npm/dm/kvx.svg)](https://www.npmjs.com/package/kvx)
[![Build Status](https://travis-ci.org/kvxjs/kvx.svg?branch=master)](https://travis-ci.org/kvxjs/kvx)
[![Coverage Status](https://coveralls.io/repos/github/kvxjs/kvx/badge.svg?branch=master)](https://coveralls.io/github/kvxjs/kvx?branch=master)
[![Dependency Status](https://david-dm.org/kvxjs/kvx.svg)](https://david-dm.org/kvxjs/kvx)
[![Greenkeeper badge](https://badges.greenkeeper.io/kvxjs/kvx.svg)](https://greenkeeper.io/)

---

## Install

```bash
$ npm install kvx --save
```

## Usage

```javascript
import kvx from 'kvx';

const kv = kvx('consul');

async function test() {
  const key = 'hello';
  const value = 'world';

  await kv.put(key, value);
  const pair = await kv.get(key);

  const pairs = await kv.list(key);

  const watcher = kv.watch(key);
  watcher.on('change', (err, data) => {
    console.log(data);
    watcher.end();
  });
}
```

## Report a issue

* [All issues](https://github.com/kvxjs/kvx/issues)
* [New issue](https://github.com/kvxjs/kvx/issues/new)

## Reference

- https://github.com/docker/libkv
- https://github.com/ekristen/node-libkv

## License

kvx is available under the terms of the MIT License.
