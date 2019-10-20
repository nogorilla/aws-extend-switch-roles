const elById = (id) => {
  return document.getElementById(id);
}

window.onload = () => {
  let colorPicker = new ColorPicker(document);

  let selection = [];
  let textArea = elById('awsConfigTextArea');
  textArea.onselect = () => {
    let str = this.value.substring(this.selectionStart, this.selectionEnd);
    let r = str.match(/^([0-9a-fA-F]{6})$/);
    if (r !== null) {
      colorPicker.setColor(r[1]);
      selection = [this.selectionStart, this.selectionEnd];
      colorPicker.onpick = (newColor) => {
        str = textArea.value;
        textArea.value = str.substring(0, selection[0]) + newColor + str.substring(selection[1]);
      }
    } else {
      selection = [];
      colorPicker.onpick = null;
    }
  }

  let msgSpan = elById('msgSpan');
  let saveButton = elById('saveButton');
  saveButton.onclick = () => {
    let rawstr = textArea.value;

    try {
      const profiles = loadAwsConfig(rawstr);
      if (profiles.length > 200) {
        msgSpan.innerHTML = '<span style="color:#dd1111">Failed to save bacause the number of profiles exceeded maximum 200!</span>';
        return;
      }

      localStorage['rawdata'] = rawstr;

      const dps = new DataProfilesSplitter();
      const dataSet = dps.profilesToDataSet(profiles);
      dataSet.lztext = LZString.compressToUTF16(rawstr);

      chrome.storage.sync.set(dataSet,
        () => {
          const { lastError } = chrome.runtime || browser.runtime;
          if (lastError) {
            msgSpan.innerHTML = Sanitizer.escapeHTML`<span style="color:#dd1111">${lastError.message}</span>`;
            return;
          }

          msgSpan.innerHTML = '<span style="color:#1111dd">Configuration has been updated!</span>';
          setTimeout(() => {
            msgSpan.innerHTML = '';
          }, 2500);
        });
    } catch (e) {
      msgSpan.innerHTML = '<span style="color:#dd1111">Failed to save because of invalid format!</span>';
    }
  }

  const booleanSettings = ['hidesHistory', 'hidesAccountId', 'showOnlyMatchingRoles', 'autoAssumeLastRole'];
  for (let key of booleanSettings) {
    elById(`${key}CheckBox`).onchange = () => {
      chrome.storage.sync.set({ [key]: this.checked });
    }
  }

  elById('configSenderIdText').onchange = () => {
    chrome.storage.sync.set({ configSenderId: this.value });
  }

  chrome.storage.sync.get(['lztext', 'configSenderId'].concat(booleanSettings), (data) => {
    let rawData = localStorage['rawdata'];
    if (data.lztext) {
      try {
        rawData = LZString.decompressFromUTF16(data.lztext);
      } catch(err) {
        rawdata = ';; !!!WARNING!!!\n;; Latest setting is broken.\n;; !!!WARNING!!!\n';
      }
    }
    textArea.value = rawData || '';
    elById('configSenderIdText').value = data.configSenderId || '';
    for (let key of booleanSettings) {
      elById(`${key}CheckBox`).checked = data[key] || false;
    }
  });
}
