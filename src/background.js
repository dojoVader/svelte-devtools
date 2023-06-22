const toolsPorts = new Map()

chrome.runtime.onConnect.addListener(port => {
  if (port.sender.url == chrome.runtime.getURL('/devtools/panel.html')) {
    port.onMessage.addListener(handleToolsMessage)
  } else {
    // This is not an expected connection, so we just log an error and close it
    console.error('Unexpected connection. Port ', port)
    port.disconnect();
  }
})

function handleToolsMessage(msg, port) {
  switch (msg.type) {
    // 'init' and 'reload' messages do not need to be delivered to content script
    case 'init':
      setup(msg.tabId, port, msg.profilerEnabled)
      break
    case 'reload':
      chrome.tabs.reload(msg.tabId, { bypassCache: true }).then()
      break
    default:
      chrome.tabs.sendMessage(msg.tabId, msg).then()
      break
  }
}

// Receive messages from content scripts
chrome.runtime.onMessage.addListener((msg, sender) =>
  handlePageMessage(msg, sender.tab.id)
);

function handlePageMessage(msg, tabId) {
  const tools = toolsPorts.get(tabId)
  if (tools) tools.postMessage(msg)
}

function attachScript(tabId, changed) {
  if (
    !toolsPorts.has(tabId) ||
    changed.status != 'loading' ||
    // #if process.env.TARGET === 'firefox'
    !changed.url
    // #else
    false
    // #endif
  )

  chrome.scripting.executeScript({
    target: {
      tabId
    },
    world: "MAIN",
    files: ['/privilegedContent.js']
  }).then()
}



function setup(tabId, port, profilerEnabled) {
  let code = null
  if(profilerEnabled){
    code = `window.sessionStorage.SvelteDevToolsProfilerEnabled = "true";`
  }else{
    code = `delete window.sessionStorage.SvelteDevToolsProfilerEnabled;`
  }

  chrome.scripting.executeScript({
    target:{
      tabId
    },
    world: "ISOLATED",
    func: () => {
       window.sessionStorage.SvelteDevToolsProfilerEnabled = "true"
    },

  }).then()

  toolsPorts.set(tabId, port)

  port.onDisconnect.addListener(() => {
    toolsPorts.delete(tabId)
    chrome.tabs.onUpdated.removeListener(attachScript)
    // Inform content script that it background closed and it needs to clean up
    chrome.tabs.sendMessage(tabId, {
      type: 'clear',
      tabId: tabId,
    }).then()
  })

  chrome.tabs.onUpdated.addListener(attachScript)
}
