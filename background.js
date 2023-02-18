globalThis.port = null;
globalThis.connected = false;
const decoder = new TextDecoder();
let currentTabId;

async function connectNative(details, cancel=true) {
  console.log(decoder.decode(details.requestBody.raw[0].bytes));
  if (!globalThis.port) {
    globalThis.name = chrome.runtime.getManifest().short_name;
    globalThis.port = chrome.runtime.connectNative(globalThis.name);
    port.onMessage.addListener(async(message)=>{
      if (message === 'Local server on') {
        const [{result}] = await chrome.scripting.executeScript({
          target: {
            tabId: currentTabId,
          },
          world: 'MAIN',
          func: ()=>{
            globalThis.resolve();
          }
          ,
        });
      }
      console.log(message)
    }
    );
    port.onDisconnect.addListener((p)=>console.log(chrome.runtime.lastError));
    globalThis.connected = true;
  } else {
    globalThis.port.disconnect();
    globalThis.port = null;
    globalThis.connected = false;
  }
  return {
    connected,
    port,
    cancel
  };
}

async function extensionURL(url) {
  if (!globalThis.EXTENSION_URL) {
    globalThis.resolve = void 0;
    globalThis.EXTENSION_PROMISE = new Promise((_)=>globalThis.resolve = _);
    globalThis.startLocalServer = async()=>{
      await fetch(EXTENSION_URL, {method:'post', body:'open'});
      await EXTENSION_PROMISE;
    }
    globalThis.resetLocalServer = async()=>{
      await fetch(EXTENSION_URL, {method:'post', body:'close'});
      globalThis.resolve = void 0;
      globalThis.EXTENSION_PROMISE = new Promise((_)=>globalThis.resolve = _);
    }
    return (globalThis.EXTENSION_URL = url);
  }
}

async function handleTab(_) {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  const url = tab.pendingUrl || tab.url;
  // https://groups.google.com/a/chromium.org/g/chromium-extensions/c/9uC1EiIxMlQ/m/F-ElRDkRAgAJ
  // 2) the focused tab was on a page that does not allow script injection.
  // Notably these include Chrome pages (chrome://) and extension pages (chrome-extension://)
  if (!url.startsWith('chrome')) {
    currentTabId = tab.id;
    const [{result}] = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
      },
      world: 'MAIN',
      args: [chrome.runtime.getURL('local_server_export.js')],
      func: extensionURL,
    });
  }
}

chrome.tabs.onCreated.addListener(handleTab);

chrome.tabs.onActivated.addListener(handleTab);

chrome.tabs.onUpdated.addListener(handleTab);

chrome.webRequest.onBeforeRequest.addListener(connectNative, {
  urls: [chrome.runtime.getURL('local_server_export.js')]
}, ['requestBody']);
