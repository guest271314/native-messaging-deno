#!/usr/bin/env -S ./deno run --v8-flags="--expose-gc,--jitless"
// Deno Native Messaging host
// guest271314, 10-5-2022
import { BufReader } from "https://deno.land/std@0.170.0/io/buf_reader.ts";
import { BufWriter } from "https://deno.land/std@0.170.0/io/buf_writer.ts";

const stdin = new BufReader(Deno.stdin);
const stdout = new BufWriter(Deno.stdout);

async function getMessage() {
  const header = new Uint32Array(1);
  await stdin.readFull(new Uint8Array(header.buffer));
  const message = new Uint8Array(header[0]);
  await stdin.readFull(message);
  return message;
}

async function sendMessage(message) {
  const header = new Uint32Array([message.length]);
  await stdout.write(new Uint8Array(header.buffer));
  await stdout.write(message);
  await stdout.flush();
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
