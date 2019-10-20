const autoAssumeLastRole = new AutoAssumeLastRole();

const extendIAMFormList = () => {
  let csrf, list = elById('awsc-username-menu-recent-roles');
  if (list) {
    let firstForm = list.querySelector('#awsc-recent-role-0 form');
    csrf = firstForm['csrf'].value;
  } else {
    list = generateEmptyRoleList();
    csrf = '';
  }

  const lastRoleKey = autoAssumeLastRole.createKey();

  chrome.storage.sync.get([
    'profiles', 'profiles_1', 'profiles_2', 'profiles_3', 'profiles_4',
    'hidesHistory', 'hidesAccountId', 'showOnlyMatchingRoles',
    'autoAssumeLastRole', lastRoleKey
  ], (data) => {
    let hidesHistory = data.hidesHistory || false;
    let hidesAccountId = data.hidesAccountId || false;
    let showOnlyMatchingRoles = data.showOnlyMatchingRoles || false;
    autoAssumeLastRole.enabled = data.autoAssumeLastRole || false;

    if (data.profiles) {
      const dps = new DataProfilesSplitter();
      const profiles = dps.profilesFromDataSet(data);

      loadProfiles(new ProfileSet(profiles, showOnlyMatchingRoles), list, csrf, hidesHistory, hidesAccountId);
      attachColorLine(profiles);
    }
    // console.log("Last role from '"+vlastRoleKey+"' was '"+lastRole+"'");
    autoAssumeLastRole.execute(data[lastRoleKey], list);
  });
}

const generateEmptyRoleList = () => {
  let divLbl = document.createElement('div');
  divLbl.id = 'awsc-recent-roles-label';
  divLbl.textContent = 'Role List:';
  let ul = document.createElement('ul');
  ul.id = 'awsc-username-menu-recent-roles';

  let parentEl = elById('awsc-login-account-section');
  parentEl.appendChild(divLbl);
  parentEl.appendChild(ul);

  let script = document.createElement('script');
  script.src = chrome.extension.getURL('/js/csrf-setter.js');
  parentEl.appendChild(script);
  return ul;
}

const replaceRedirectURI = (form, profile) => {
  if (!profile.region) return false;

  const destRegion = profile.region;
  let redirectUri = decodeURIComponent(form.redirect_uri.value);
  const md = redirectUri.match(/region=([a-z\-1-9]+)/);
  if (md) {
    const currentRegion = md[1];
    if (currentRegion !== destRegion) {
      redirectUri = redirectUri.replace(new RegExp(currentRegion, 'g'), destRegion);
      if (currentRegion === 'us-east-1') {
        redirectUri = redirectUri.replace('://', `://${destRegion}.`);
      } else if (destRegion === 'us-east-1') {
        redirectUri = redirectUri.replace(/:\/\/[^.]+\./, '://');
      }
    }
    form.redirect_uri.value = encodeURIComponent(redirectUri);
  }
}

const hookBeforeSwitch = (form, profile) => {
  replaceRedirectURI(form, profile);
  autoAssumeLastRole.save(profile);
  return true;
}

const hookBeforeExit = () => {
  autoAssumeLastRole.clear();
  return true;
}

const loadProfiles = (profileSet, list, csrf, hidesHistory, hidesAccountId) => {
  let recentNames = [];

  if (hidesHistory) {
    let fc = list.firstChild;
    while (fc) {
      list.removeChild(fc);
      fc = list.firstChild;
    }

    let label = elById('awsc-recent-roles-label');
    if (label) {
      label.textContent = label.textContent.replace('History', 'List');
    }
  } else {
    let li = list.firstElementChild;
    while (li) {
      input = li.querySelector('input[type="submit"]');
      let name = input.value;
      name = name.replace(/\s+\|\s+\d+$/, '');
      if (profileSet.excludedNames.includes(name)) {
        const nextLi = li.nextElementSibling;
        list.removeChild(li);
        li = nextLi;
      } else {
        const form = li.querySelector('form');
        form.dataset.aesrProfile = name;
        input.style = 'white-space:pre';
        recentNames.push(name);
        li = li.nextElementSibling;
      }
    }
  }

  const redirectUri = encodeURIComponent(window.location.href);
  profileSet.destProfiles.forEach((item) => {
    let name = item.profile;
    if (recentNames.indexOf(name) !== -1) return true;
    if (!hidesAccountId) name += '  |  ' + item.aws_account_id;

    let color = item.color || 'aaaaaa';
    let actionHost = window.location.host.endsWith('.amazonaws-us-gov.com') ? 'signin.amazonaws-us-gov.com' : 'signin.aws.amazon.com';
    if (!item.image) {
        list.insertAdjacentHTML('beforeend', Sanitizer.escapeHTML`<li>
         <form action="https://${actionHost}/switchrole" method="POST" target="_top" data-aesr-profile="${item.profile}">
          <input type="hidden" name="action" value="switchFromBasis">
          <input type="hidden" name="src" value="nav">
          <input type="hidden" name="roleName" value="${item.role_name}">
          <input type="hidden" name="account" value="${item.aws_account_id}">
          <input type="hidden" name="mfaNeeded" value="0">
          <input type="hidden" name="color" value="${color}">
          <input type="hidden" name="csrf" value="${csrf}">
          <input type="hidden" name="redirect_uri" value="${redirectUri}">
          <label for="awsc-recent-role-switch-0" class="awsc-role-color" style="background-color: #${color};">&nbsp;</label>
          <input type="submit" class="awsc-role-submit awsc-role-display-name" name="displayName" value="${name}"
                title="${item.role_name}@${item.aws_account_id}" style="white-space:pre"></form>
        </li>`);
    } else {
        list.insertAdjacentHTML('beforeend', Sanitizer.escapeHTML`<li>
         <form action="https://${actionHost}/switchrole" method="POST" target="_top" data-aesr-profile="${item.profile}">
          <input type="hidden" name="action" value="switchFromBasis">
          <input type="hidden" name="src" value="nav">
          <input type="hidden" name="roleName" value="${item.role_name}">
          <input type="hidden" name="account" value="${item.aws_account_id}">
          <input type="hidden" name="mfaNeeded" value="0">
          <input type="hidden" name="color" value="${color}">
          <input type="hidden" name="csrf" value="${csrf}">
          <input type="hidden" name="redirect_uri" value="${redirectUri}">
          <label for="awsc-recent-role-switch-0" class="awsc-role-color"><img src=${item.image.replace(/"/g, '')} style="margin-top: -1px; margin-left: -1px; width: 17px; height: 17px"></label>
          <input type="submit" class="awsc-role-submit awsc-role-display-name" name="displayName" value="${name}"
                title="${item.role_name}@${item.aws_account_id}" style="white-space:pre"></form>
        </li>`);

    }
  });

  Array.from(list.querySelectorAll('form')).forEach(form => {
    form.onsubmit = (e) => {
      const destProfileName = this.dataset.aesrProfile;
      const foundProfile = profileSet.destProfiles.find(item => item.profile === destProfileName);
      return foundProfile ? hookBeforeSwitch(this, foundProfile) : true;
    }
  });

  const exitRoleForm = elById('awsc-exit-role-form');
  if (exitRoleForm) {
    exitRoleForm.addEventListener('submit', () => {
      hookBeforeExit(this);
    });
  }

  // Place role filter textinput
  let AWSR_firstForm = null;

  document.getElementById('awsc-recent-roles-label').insertAdjacentHTML('beforeend', '<input id="AESR_RoleFilter" type="text" placeholder="Filter by profile name" style="border:1px solid #ccc;border-radius:3px;font-size:13px;margin-left:0.25em;max-width:20ex;padding:0.4ex">');

  document.getElementById('AESR_RoleFilter').onkeyup = (e) => {
    const str = this.value;
    if (e.keyCode === 13) {
      if (AWSR_firstForm) {
        AWSR_firstForm.querySelector('input[type="submit"]').click()
      }
    } else {
      const lis = Array.from(document.querySelectorAll('#awsc-username-menu-recent-roles > li'));
      let firstHitLi = null;
      lis.forEach(li => {
        const profileName = li.firstElementChild.querySelector("input[name='displayName']").value.toLowerCase();
        const hit = str ? profileName.indexOf(str) > -1 : false;
        const shown = str ? hit : true;
        li.style.display = shown ? 'block' : 'none';
        li.style.background = null;
        if (hit && firstHitLi === null) firstHitLi = li;
      });

      if (firstHitLi) {
        firstHitLi.style.background = '#f0f9ff';
        AWSR_firstForm = firstHitLi.querySelector('form');
      } else {
        AWSR_firstForm = null;
      }
    }
  }

  document.getElementById('nav-usernameMenu').addEventListener('click', () => {
    document.getElementById('AESR_RoleFilter').focus()
  })
}

const attachColorLine = (profiles) => {
  let usernameMenu = elById('nav-usernameMenu');
  if (usernameMenu.classList.contains('awsc-has-switched-role')) {
    let profileName = usernameMenu.textContent.trim().split(/\s+\|\s+/)[0];

    usernameMenu.style = 'white-space:pre';

    const found = profiles.find(item => { return item.profile === profileName });
    const color = found && found.color || null;

    let label = usernameMenu.querySelector('.nav-elt-label');
    if (found && found.image) {
      label.insertAdjacentHTML('beforebegin', Sanitizer.escapeHTML`<img id="AESW_Image" src=${found.image.replace(/"/g, '')} style="float: left; padding-right: .66em; width: 1.33em; height: 1.33em">`);
    }

    if (color) {
      if (needsInvertForeColorByBack(color)) {
        label.style = 'color: #eee';
      }

      let menubar = elById('nav-menubar');
      let barDiv = document.createElement('div');
      barDiv.id = 'AESW_ColorLine';
      barDiv.style = 'position:absolute;top:39px;width:100%;height:3px;z-index:0;background-color:#' + color;
      menubar.appendChild(barDiv);
    }
  }
}

const needsInvertForeColorByBack = (color) => {
  let r = color.substr(0, 2),
      g = color.substr(2, 2),
      b = color.substr(4, 2);

  r = parseInt(r, 16);
  g = parseInt(g, 16);
  b = parseInt(b, 16);

  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

