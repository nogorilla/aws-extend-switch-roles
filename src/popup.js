const openOptions = () => {
  if (window.chrome) {
    chrome.runtime.openOptionsPage(err => {
      console.log(`Error: ${error}`);
    });
  } else if (window.browser) {
    window.browser.runtime.openOptionsPage().catch(err => {
      console.log(`Error: ${error}`);
    });
  }
}

window.onload = () => {
  document.getElementById('openOptionsLink').onclick = (e) => {
    openOptions();
    return false;
  }

  document.getElementById('openCreditsLink').onclick = (e) => {
    chrome.tabs.create({ url: chrome.extension.getURL('credits.html')}, (tab) => {});
    return false;
  }
}
