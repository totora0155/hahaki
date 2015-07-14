var IMG_REGEXP;

IMG_REGEXP = /\.(?:jpe?g|png|gif)$/;

chrome.browserAction.onClicked.addListener(function() {
  var url;
  url = chrome.extension.getURL('index.html');
  return chrome.tabs.create({
    url: url
  });
});

//# sourceMappingURL=background.js.map