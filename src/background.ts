console.log('Hello from the background!')

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details)
})
