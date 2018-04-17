function initializers (backend) {
  let Initialize = null;
  switch (backend) {
    case 'consul':
      Initialize = require('./store/consul');
      break;
    case 'etcd':
      Initialize = require('./store/etcd');
      break;
    case 'zk':
      Initialize = require('./store/zk');
      break;
    default:
      throw new Error('Backend storage not supported yet, please choose one of: consul, etcd, zk.');
  }
  return Initialize;
}

export default function createStore (backend, options) {
  const Initialize = initializers(backend);
  return new Initialize(options);
}
