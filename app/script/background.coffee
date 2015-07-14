IMG_REGEXP = /\.(?:jpe?g|png|gif)$/

chrome.browserAction.onClicked.addListener ->
  url = chrome.extension.getURL('index.html')
  chrome.tabs.create {url}
