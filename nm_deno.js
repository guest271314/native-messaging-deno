#!/usr/bin/env -S deno run -A --unsafely-ignore-certificate-errors=localhost --unstable --v8-flags="--expose-gc,--jitless"
 // Deno Native Messaging host
// guest271314, 10-5-2022
// Browser <=> Deno fetch() full duplex streaming
// 7-22-2023

/*
Usage on Web pages where origin is set in "matches" of "externally_connectable". 
Note, setting "externally_matches" can be done dynamically, see 
https://github.com/guest271314/captureSystemAudio/blob/master/native_messaging/capture_system_audio/background.js#L383-L415
and https://github.com/guest271314/captureSystemAudio/blob/master/native_messaging/capture_system_audio/set_externally_connectable.js.

port = null;
var port = chrome.runtime.connect('<ID>');
port.onMessage.addListener((message) => {
  console.log(message);
});
port.onDisconnect.addListener((message) => {
  console.log(message);
});
port.postMessage({url:'https://comfortable-deer-52.deno.dev', method:'post'});
await new Promise((resolve) => setTimeout(resolve, 200));
port.postMessage({a:'b', c:'d'}); // {A: 'B', C: 'D'}
port.postMessage(`ABORT_STREAM`);
*/

// https://github.com/denoland/deno/discussions/17236#discussioncomment-4566134
// https://github.com/saghul/txiki.js/blob/master/src/js/core/tjs/eval-stdin.js
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Local testing
/*
const wait = async (ms) => new Promise((r) => setTimeout(r, ms));

const responseInit = {
  headers: {
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/plain; charset=UTF-8',
    'Cross-Origin-Opener-Policy': 'unsafe-none',
    'Cross-Origin-Embedder-Policy': 'unsafe-none',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Private-Network': 'true',
    'Access-Control-Allow-Headers': 'Access-Control-Request-Private-Network',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,HEAD,QUERY',
  },
};
*/

async function readFullAsync(length) {
  const buffer = new Uint8Array(65536);
  const data = [];
  let n = null;
  while (data.length < length && (n = await Deno.stdin.read(buffer))) {
    data.push(...buffer.subarray(0, n));
  }
  return new Uint8Array(data);
}

let {
  writable,
  readable: body
} = new TransformStream();
let abortable = new AbortController();
let {
  signal
} = abortable;
let writer = null;
let now = null;

async function getMessage() {
  const header = new Uint32Array(1);
  await Deno.stdin.read(new Uint8Array(header.buffer));
  if (!writable.locked) {
    writer = writable.getWriter();
    const {
      url,
      method,
      headers = {},
      duplex = 'half'
    } = JSON.parse(decoder.decode(await readFullAsync(header[0])));
    // Returning the Promise, or using await doesn't stream
    return Promise.race([, fetch(new Request(url, {
        // Node.js logs duplex must set (to half) for upload streaming, still doesn't work using the same code
        duplex, 
        method,
        headers,
        signal,
        body
      }))
      .then(({
          body: readable
        }) => readable.pipeThrough(new TextDecoderStream())
        .pipeTo(new WritableStream({
          async start() {
            now = performance.now();
            return await sendMessage(encodeMessage(`Starting read stream ${now}`));
          },
          async write(value) {
            await sendMessage(encoder.encode(value));
            gc();
          },
          async close() {
            await sendMessage(encodeMessage('Stream closed.'));
          },
          async abort(reason) {
            now = ((performance.now() - now) / 1000) / 60;
            await sendMessage(encodeMessage({
              ABORT_REASON: reason,
              now
            }));
            Deno.exit();
          }
        }))).catch(async (e) => {
        await sendMessage(encodeMessage(e.message));
      })
    ]);
  } else {
    const data = await readFullAsync(header[0]);
    const message = decoder.decode(data);
    if (message === `"ABORT_STREAM"`) {
      return abortable.abort(message);
    }
    return await writer.write(data);
  }
}

async function sendMessage(message) {
  const header = new Uint32Array([message.length]);
  await Deno.stdout.write(new Uint8Array(header.buffer));
  await Deno.stdout.write(message);
}

function encodeMessage(message) {
  return encoder.encode(JSON.stringify(message));
}

async function main() {
  /*
  // Local testing
  (async () => {
    // https://medium.com/deno-the-complete-reference/http-2-in-deno-f825251a5ab2
    for await (
      const conn of Deno.listenTls({
        port: 8443,
        certFile: './certificate.pem',
        keyFile: './certificate.key',
        alpnProtocols: ["h2", "http/1.1"],
      })
    ) {
      for await (const {
          request,
          respondWith
        }
        of Deno.serveHttp(conn)) {
        await sendMessage(encodeMessage(`fetch request method: ${request.method}`));
        if (request.method === 'OPTIONS' || request.method === 'HEAD') {
          respondWith(new Response(null, responseInit));
        }
        if (request.method === 'GET') {
          respondWith(new Response(null, responseInit));
        }
        try {
          const stream = request.body
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(
            new TransformStream({
              transform(value, c) {
                c.enqueue(value.toUpperCase());
              },
              async flush() {},
            })
          ).pipeThrough(new TextEncoderStream());
          respondWith(new Response(stream, responseInit));
        } catch {
          Deno.exit();
        }
      }
    }
  })().catch(async (e) => {
    await sendMessage(encoder.encode(e.message));
  });
*/
  while (true) {
    await getMessage();
    gc();
  }
}

try {
  main();
} catch (e) {
  Deno.exit();
}
