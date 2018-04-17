export function trimStart (key) {
  return key.replace(/^[/]+/g, '');
}

export function trimEnd (key) {
  return key.replace(/[/]+$/g, '');
}

export function trim (key) {
  return key.replace(/^[/]+|[/]+$/g, '');
}

export function normalize (key) {
  return '/' + key.split('/').join('/');
}

const errors = {
  // BackendNotSupported is thrown when the backend k/v store is not supported by libkv
  BackendNotSupported: 'Backend storage not supported yet, please choose one of',
  // CallNotSupported is thrown when a method is not implemented/supported by the current backend
  CallNotSupported: 'The current call is not supported with this backend',
  // NotReachable is thrown when the API cannot be reached for issuing common store operations
  NotReachable: 'Api not reachable',
  // CannotLock is thrown when there is an error acquiring a lock on a key
  CannotLock: 'Error acquiring the lock',
  // KeyModified is thrown during an atomic operation if the index does not match the one in the store
  KeyModified: 'Unable to complete atomic operation, key modified',
  // KeyNotFound is thrown when the key is not found in the store during a Get operation
  KeyNotFound: 'Key not found in store',
  // PreviousNotSpecified is thrown when the previous value is not specified for an atomic operation
  PreviousNotSpecified: 'Previous K/V pair should be provided for the Atomic operation',
  // KeyExists is thrown when the previous value exists in the case of an AtomicPut
  KeyExists: 'Previous K/V pair exists, cannot complete Atomic operation'
};
export function assert (value, code) {
  if (value) return;
  const msg = errors[code] || 'Unknown error';
  const err = new Error(msg);
  err.code = code;
  throw err;
}
