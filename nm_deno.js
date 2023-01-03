#!/usr/bin/env -S ./deno run --v8-flags="--expose-gc,--jitless"
// Deno Native Messaging host
// guest271314, 10-5-2022
import { BufReader } from "https://deno.land/std@0.170.0/io/buf_reader.ts";
import { BufWriter } from "https://deno.land/std@0.170.0/io/buf_writer.ts";
// https://github.com/denoland/deno/discussions/17236#discussioncomment-4566134
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
  const header = Uint32Array.from({
    length: 4,
  }, (_,index)=>(message.length >> (index * 8)) & 0xff);
  const output = new Uint8Array(header.length + message.length);
  output.set(header, 0);
  output.set(message, 4);
  await stdout.write(output);
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
