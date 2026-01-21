import '@testing-library/jest-dom';

global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

const nodeCrypto = require('crypto');

// Prefer Node's native WebCrypto; it exposes `crypto.subtle`.
// Some environments expose `require('crypto').webcrypto` without binding it.
if (!global.crypto?.subtle) {
  global.crypto = nodeCrypto.webcrypto;
}

// Jest runs in JSDOM by default here, so WebCrypto may not exist.
// We also want to ensure the Fetch API (Request/Response/Headers/fetch)
// exists before importing `next/server` (route handlers).
// JSDOM env does not reliably provide these in Node.
// Node provides fetch classes in the `undici` global; use them if present.
const globalFetch = globalThis.fetch;
const GlobalHeaders = globalThis.Headers;
const GlobalRequest = globalThis.Request;
const GlobalResponse = globalThis.Response;

if (!global.fetch && globalFetch) {
  global.fetch = globalFetch;
}
if (!global.Headers && GlobalHeaders) {
  global.Headers = GlobalHeaders;
}
if (!global.Request && GlobalRequest) {
  global.Request = GlobalRequest;
}
if (!global.Response && GlobalResponse) {
  global.Response = GlobalResponse;
}

afterEach(() => {
  jest.clearAllMocks();
});
