Deno Native Messaging Host

Installation and usage on Chrome and Chromium

1. Navigate to `chrome://extensions`.
2. Toggle `Developer mode`.
3. Click `Load unpacked`.
4. Select native-messaging-deno folder.
5. Note the generated extension ID.
6. Open `nm_deno.json` in a text editor, set `"path"` to absolute path of `local_server.js` and `chrome-extension://<ID>/` using ID from 5 in `"allowed_origins"` array. 
7. Copy the file to Chrome or Chromium configuration folder, e.g., Chromium on \*nix `~/.config/chromium/NativeMessagingHosts`; Chrome dev channel on \*nix `~/.config/google-chrome-unstable/NativeMessagingHosts`.
8. Make sure `deno` executable and `nm_deno.js` are executable. To download `deno` executable into the cloned GitHub directory that is used as the local unpacked extension directory (and optionally strip symbolic information from the `deno` executable to reduce size) you can run
```
wget --show-progress \
--progress=bar \
--output-document deno.zip \
https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip \
&& unzip deno.zip \
&& rm deno.zip \
&& strip deno 
```
9. On any Web page run the following code

```
await startLocalServer();
let abortable = new AbortController;
let {signal} = abortable;
(await fetch('https://localhost:8443', {
  method: 'post',
  body: 'cat local_server_export.js', // Code executed in server, piped to browser
  duplex: 'half',
  headers: {
    'Access-Control-Request-Private-Network': true
  },
  signal
})).body.pipeThrough(new TextDecoderStream()).pipeTo(new WritableStream({
  write(v) {
    console.log(v);
  },
  close() {
    console.log('close');
  },
  abort(reason) {
    console.log(reason);
  }
})).catch(console.warn);
await resetLocalServer();
```


The Native Messaging host echoes back the message passed. 

For differences between OS and browser implementations see [Chrome incompatibilities](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities#native_messaging).

# License
Do What the Fuck You Want to Public License [WTFPLv2](http://www.wtfpl.net/about/)
