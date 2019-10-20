const elById = (id) => {
  return document.getElementById(id);
}

const getAccountId = (elId) => {
  let el = elById(elId);
  if (!el) return null;

  let aid = el.textContent;
  let r = aid.match(/^(\d{4})\-(\d{4})\-(\d{4})$/);
  if (r) {
    return r[1] + r[2] + r[3];
  } else {
    return aid;
  }
}

const getAssumedRole = () => {
  let el = elById('awsc-role-display-name-user');
  if (el) {
    return el.textContent.trim();
  }

  el = elById('awsc-login-display-name-user');
  if (el) {
    return el.textContent.trim().split("/")[0]
  }

  return null;
}
