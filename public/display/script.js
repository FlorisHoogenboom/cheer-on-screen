const idleEl = document.getElementById('idle');
const messageEl = document.getElementById('message');
const measureEl = document.getElementById('measure');

let ws;
let currentAnimClass = null;

function connect() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${proto}//${location.host}/ws/display`);

  ws.onopen = () => console.log('Display connected');
  ws.onclose = () => setTimeout(connect, 2000);
  ws.onerror = () => ws.close();

  ws.onmessage = (e) => {
    let msg;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'cheer':
        showMessage(msg);
        break;
      case 'clear':
        resetDisplay();
        break;
      case 'state':
        if (msg.currentMessage) {
          showMessage(msg.currentMessage);
        } else {
          resetDisplay();
        }
        break;
    }
  };
}

function applyTheme(themeKey) {
  const theme = THEMES[themeKey] || THEMES.classic;
  document.documentElement.style.setProperty('--bg', theme.bg);
  document.documentElement.style.setProperty('--color', theme.color);
  document.documentElement.style.setProperty('--accent', theme.accent);
}

function computeFontSize(text) {
  const maxW = window.innerWidth * 0.9;
  const maxH = window.innerHeight * 0.8;

  // First check single-line fit
  let lo = 2, hi = 32;
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    measureEl.style.fontSize = mid + 'vw';
    measureEl.style.whiteSpace = 'nowrap';
    measureEl.style.maxWidth = 'none';
    measureEl.textContent = text;

    if (measureEl.offsetWidth <= maxW) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  // If single line fits nicely, use it
  measureEl.style.fontSize = lo + 'vw';
  measureEl.style.whiteSpace = 'nowrap';
  measureEl.style.maxWidth = 'none';
  measureEl.textContent = text;

  if (measureEl.offsetWidth <= maxW && measureEl.offsetHeight <= maxH) {
    return lo + 'vw';
  }

  // Multi-line: allow wrapping and find largest size that fits
  lo = 2;
  hi = 25;
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    measureEl.style.fontSize = mid + 'vw';
    measureEl.style.whiteSpace = 'normal';
    measureEl.style.maxWidth = maxW + 'px';
    measureEl.textContent = text;

    if (measureEl.offsetWidth <= maxW && measureEl.offsetHeight <= maxH) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return lo + 'vw';
}

function showMessage({ text, animation, theme }) {
  // Reset any current animation
  if (currentAnimClass) {
    messageEl.classList.remove(currentAnimClass, 'visible');
    currentAnimClass = null;
  }

  // Apply theme
  applyTheme(theme);

  // Set text and compute size
  messageEl.textContent = text;
  const fontSize = computeFontSize(text);
  messageEl.style.fontSize = fontSize;

  // Set marquee duration based on text length
  if (animation === 'marquee') {
    const duration = Math.max(6, text.length * 0.3 + 4);
    messageEl.style.setProperty('--marquee-duration', duration + 's');
  }

  // Hide idle, show message
  idleEl.style.display = 'none';

  // Force reflow before starting animation
  const animClass = 'anim-' + (animation || 'flash');
  messageEl.offsetHeight; // force reflow
  messageEl.classList.add(animClass, 'visible');
  currentAnimClass = animClass;
}

function resetDisplay() {
  if (currentAnimClass) {
    messageEl.classList.remove(currentAnimClass, 'visible');
    currentAnimClass = null;
  }
  messageEl.textContent = '';
  messageEl.style.fontSize = '';
  idleEl.style.display = '';
}

// When animation ends, go back to idle
messageEl.addEventListener('animationend', () => {
  resetDisplay();
});

// Start
connect();
