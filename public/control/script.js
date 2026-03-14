const nameInput = document.getElementById('runner-name');
const customMsg = document.getElementById('custom-msg');
const sendCustomBtn = document.getElementById('send-custom');
const presetBtns = document.querySelectorAll('.preset-btn');
const animBtns = document.querySelectorAll('.anim-btn');
const themesContainer = document.getElementById('themes');
const banner = document.getElementById('connection-banner');
const toast = document.getElementById('toast');

let ws;
let selectedAnim = 'flash';
let selectedTheme = 'classic';

// --- WebSocket ---

function connect() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${proto}//${location.host}/ws/control`);

  ws.onopen = () => {
    banner.classList.add('hidden');
  };

  ws.onclose = () => {
    banner.classList.remove('hidden');
    setTimeout(connect, 2000);
  };

  ws.onerror = () => ws.close();
}

function sendCheer(text) {
  if (!text.trim()) return;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'cheer',
      text: text.trim(),
      animation: selectedAnim,
      theme: selectedTheme,
    }));
    showToast();
  }
}

// --- Runner name persistence ---

nameInput.value = localStorage.getItem('runnerName') || '';
nameInput.addEventListener('input', () => {
  localStorage.setItem('runnerName', nameInput.value);
});

// --- Preset messages ---

presetBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const template = btn.dataset.template;
    const name = nameInput.value.trim();
    let text;
    if (name) {
      text = template.replace('[name]', name);
    } else {
      // Remove [name] and clean up double spaces
      text = template.replace(' [name]', '').replace('[name] ', '').replace('[name]', '');
    }
    sendCheer(text);
  });
});

// --- Custom message ---

sendCustomBtn.addEventListener('click', () => {
  sendCheer(customMsg.value);
  customMsg.value = '';
});

customMsg.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendCustomBtn.click();
  }
});

// --- Animation selector ---

animBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    animBtns.forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedAnim = btn.dataset.anim;
  });
});

// --- Theme selector ---

function buildThemeButtons() {
  for (const [key, theme] of Object.entries(THEMES)) {
    const btn = document.createElement('button');
    btn.className = 'theme-btn' + (key === selectedTheme ? ' selected' : '');
    btn.dataset.theme = key;
    btn.textContent = theme.name;
    btn.style.background = theme.bg;
    btn.style.color = theme.color;
    btn.style.borderColor = key === selectedTheme ? '#fff' : theme.accent;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach((b) => {
        b.classList.remove('selected');
        b.style.borderColor = THEMES[b.dataset.theme].accent;
      });
      btn.classList.add('selected');
      btn.style.borderColor = '#fff';
      selectedTheme = key;
    });

    themesContainer.appendChild(btn);
  }
}

// --- Toast ---

let toastTimeout;
function showToast() {
  toast.classList.remove('hidden');
  // Reset animation
  toast.style.animation = 'none';
  toast.offsetHeight; // reflow
  toast.style.animation = '';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 1300);
}

// --- Init ---

buildThemeButtons();
connect();
