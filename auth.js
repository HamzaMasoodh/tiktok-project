// Very simple demo auth: username in localStorage. Password is ignored (for coursework demo).

const auth = {
  getUser() {
    try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); } catch { return null; }
  },
  setUser(user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
    document.dispatchEvent(new CustomEvent('auth:changed', { detail: user }));
  },
  signOut() {
    localStorage.removeItem('auth_user');
    document.dispatchEvent(new CustomEvent('auth:changed', { detail: null }));
  }
};

// UI bindings
const btnSignIn = document.getElementById('btnSignIn');
const btnSignOut = document.getElementById('btnSignOut');
const userDisplay = document.getElementById('userDisplay');
const signInDialog = document.getElementById('signin');
const signInForm = document.getElementById('signInForm');
const username = document.getElementById('username');
const password = document.getElementById('password');

function refreshAuthUI() {
  const u = auth.getUser();
  if (u) {
    userDisplay.textContent = 'Signed in as ' + u.username;
    btnSignIn.style.display = 'none';
    btnSignOut.style.display = '';
  } else {
    userDisplay.textContent = 'Not signed in';
    btnSignIn.style.display = '';
    btnSignOut.style.display = 'none';
  }
}
document.addEventListener('auth:changed', refreshAuthUI);

btnSignIn.addEventListener('click', () => {
  username.value = '';
  password.value = '';
  signInDialog.showModal();
});

btnSignOut.addEventListener('click', () => {
  auth.signOut();
});

signInForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const u = username.value.trim();
  if (!u) return;
  auth.setUser({ username: u });
  signInDialog.close();
});

// initialize
refreshAuthUI();
window.appAuth = auth; // expose for app.js
