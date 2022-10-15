#!/usr/bin/env -S ./deno run --v8-flags="--expose-gc,--jitless"
// Deno Native Messaging host
// guest271314, 10-5-2022
async function getMessage() {
  const header = new Uint32Array(1);
  await Deno.stdin.read(header);
  const output = new Uint8Array(header[0]);
  await Deno.stdin.read(output);
  return output;
}

async function sendMessage(message) {
  const header = Uint32Array.from(
    {
      length: 4,
    },
    (_, index) => (message.length >> (index * 8)) & 0xff
  );
  const output = new Uint8Array(header.length + message.length);
  output.set(header, 0);
  output.set(message, 4);
  await Deno.stdout.write(output.buffer);
}

async function main() {
  while (true) {
    const message = await getMessage();
    await sendMessage(message);
    gc();
  }
}

try {
  main();
} catch (e) {
  Deno.exit();
}
