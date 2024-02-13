#!/usr/bin/env -S ./deno run --v8-flags="--expose-gc"
// Deno Native Messaging host
// guest271314, 10-5-2022

const buffer = new ArrayBuffer(0, { maxByteLength: 1024 ** 2 });
const view = new DataView(buffer);
const encoder = new TextEncoder();

function encodeMessage(message) {
  return encoder.encode(JSON.stringify(message));
}

async function* getMessage() {
  let messageLength = 0;
  let readOffset = 0;
  for await (let message of Deno.stdin.readable) {
    if (buffer.byteLength === 0) {
      buffer.resize(4);
      for (let i = 0; i < 4; i++) {
        view.setUint8(i, message[i]);
      }
      messageLength = view.getUint32(0, true);
      message = message.subarray(4);
      buffer.resize(0);
    }
    buffer.resize(buffer.byteLength + message.length);
    for (let i = 0; i < message.length; i++, readOffset++) {
      view.setUint8(readOffset, message[i]);
    }
    if (buffer.byteLength === messageLength) {
      yield new Uint8Array(buffer);
      messageLength = 0;
      readOffset = 0;
      buffer.resize(0);
    }
  }
}

async function sendMessage(message) {
  await new Blob([
    new Uint8Array(new Uint32Array([message.length]).buffer),
    message,
  ])
    .stream()
    .pipeTo(Deno.stdout.writable, { preventClose: true });
}

try {
  for await (const message of getMessage()) {
    await sendMessage(message);
  }
} catch (e) {
  Deno.exit();
}
