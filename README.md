Deno Native Messaging Host - fetch duplex

See [Fetch body streams are not full duplex #1254](https://github.com/whatwg/fetch/issues/1254).

Installation and usage on Chrome and Chromium

1. Navigate to `chrome://extensions`.
2. Toggle `Developer mode`.
3. Click `Load unpacked`.
4. Select native-messaging-deno folder.
5. Note the generated extension ID.
6. Open `nm_deno.json` in a text editor, set `"path"` to absolute path of `nm_deno.js` and `chrome-extension://<ID>/` using ID from 5 in `"allowed_origins"` array. 
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
9. This uses Deno's `fetch()` for full duplex streaming (writing to the uploaded `ReadableStream` and reading from the `ReadableStream` from the `Response` `body` using a single request). Each native message passed to the host from the Web page is written to the `writable` side of a `TransformStream()` where the `readable` side is set as value of `body` in sencond parameter passed to `Request()` passed to `fetch()`. To test navigate to an origin listed in `"matches"` array in `"externally_connectable"` in manifest.json, in source code, Sources => Snippets, or in `console` run something like

```
port = null;
var port = chrome.runtime.connect('<ID>'); // Where <ID> is the generated unpacked extension ID
port.onMessage.addListener((message) => {
  console.log(message);
});
port.onDisconnect.addListener((message) => {
  console.log(message);
});
port.postMessage({url:'https://comfortable-deer-52.deno.dev', method:'post'});
await new Promise((resolve) => setTimeout(resolve, 200));
port.postMessage({a:'b', c:'d'}); // Transformed to uppercase {A: 'B', C: 'D'}
// Abort the request, reload the extension.
port.postMessage(`ABORT_STREAM`);
```

Caveat with this proof-of-concept: Deno Deploy times out the server (the same server code used for local development commented in `nm_deno.js`) in ~5 1/2 minutes.

For differences between OS and browser implementations see [Chrome incompatibilities](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities#native_messaging).

# License
Do What the Fuck You Want to Public License [WTFPLv2](http://www.wtfpl.net/about/)
