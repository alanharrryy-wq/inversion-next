/* eslint-disable */
/* Mock Service Worker (MSW) - generated-like file
   Si este archivo se te pone necio, corre: npx msw init public/ --save
   y MSW lo regenera. Este template funciona para arrancar rápido. */
'use strict';

const INTEGRITY_CHECKSUM = 'hitech-mock-service-worker';
const BROADCAST_CHANNEL_NAME = 'msw';
const SERVICE_WORKER_URL = self.location.href;
const CLIENT_ID = 'msw-client';

const headers = new Headers({
  'Content-Type': 'application/json',
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', async (event) => {
  const clientId = event.source && event.source.id ? event.source.id : null;
  const data = event.data || {};

  // Basic protocol compatible enough for MSW browser worker
  if (data && data.type === 'MSW_ACTIVATE') {
    event.source && event.source.postMessage({ type: 'MSW_ACTIVATE' });
    return;
  }

  if (data && data.type === 'MSW_INTEGRITY_CHECK_REQUEST') {
    event.source && event.source.postMessage({
      type: 'MSW_INTEGRITY_CHECK_RESPONSE',
      payload: INTEGRITY_CHECKSUM,
    });
    return;
  }
});

self.addEventListener('fetch', (event) => {
  // MSW (v2) will take over network via its internal logic when registered.
  // This minimal SW just needs to exist and be registrable.
  return;
});
