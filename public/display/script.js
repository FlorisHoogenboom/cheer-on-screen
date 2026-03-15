const idleEl = document.getElementById('idle');
const messageEl = document.getElementById('message');
const measureEl = document.getElementById('measure');

let ws;
let currentAnimClass = null;
let currentThemeClass = null;
let letterWordTimeout = null;
let currentThemeKey = 'classic';

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

  // Toggle glow
  messageEl.classList.toggle('no-glow', !!theme.noGlow);

  // Remove previous animated theme class
  if (currentThemeClass) {
    document.body.classList.remove(currentThemeClass);
    currentThemeClass = null;
  }

  // Apply animated theme class if needed
  if (theme.animated) {
    const cls = 'theme-' + theme.animated;
    document.body.classList.add(cls);
    currentThemeClass = cls;
  }
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

function computeMarqueeFontSize(text) {
  const targetH = window.innerHeight * 0.9;
  const refSize = 100; // reference px size

  measureEl.style.fontSize = refSize + 'px';
  measureEl.style.whiteSpace = 'nowrap';
  measureEl.style.maxWidth = 'none';
  measureEl.textContent = text;

  const measuredH = measureEl.offsetHeight;
  if (measuredH === 0) return '90vh';

  const scaledSize = (targetH / measuredH) * refSize;
  return scaledSize + 'px';
}

function clearMessageChildren() {
  while (messageEl.firstChild) {
    messageEl.removeChild(messageEl.firstChild);
  }
}

function showLetterByLetter(text, fontSize) {
  clearMessageChildren();
  messageEl.style.fontSize = fontSize;

  const delayPerLetter = 120;
  let letterIndex = 0;

  const words = text.split(' ');
  words.forEach((word, wordIdx) => {
    // Insert space span between words
    if (wordIdx > 0) {
      const space = document.createElement('span');
      space.classList.add('letter-span', 'space-char');
      space.textContent = '\u00A0';
      space.style.animationDelay = (letterIndex * delayPerLetter) + 'ms';
      messageEl.appendChild(space);
      letterIndex++;
    }

    const group = document.createElement('span');
    group.classList.add('word-group');
    const lblTheme = THEMES[currentThemeKey] || {};
    if (lblTheme.animated === 'forest') {
      group.classList.add(wordIdx % 2 === 0 ? 'forest-word-a' : 'forest-word-b');
    }

    for (const ch of word) {
      const span = document.createElement('span');
      span.classList.add('letter-span');
      span.textContent = ch;
      span.style.animationDelay = (letterIndex * delayPerLetter) + 'ms';
      group.appendChild(span);
      letterIndex++;
    }

    messageEl.appendChild(group);
  });

  const maxDelay = (letterIndex - 1) * delayPerLetter;

  idleEl.style.display = 'none';
  const animClass = 'anim-letter-by-letter';
  messageEl.offsetHeight; // force reflow so animations trigger
  messageEl.classList.add(animClass, 'visible');
  currentAnimClass = animClass;

  // After all letters appear + hold 2s, fade out, then reset
  const totalReveal = maxDelay + 300; // last letter animation duration
  letterWordTimeout = setTimeout(() => {
    messageEl.classList.add('message-fade-out');
    letterWordTimeout = setTimeout(() => {
      resetDisplay();
    }, 600);
  }, totalReveal + 2000);
}

function showWordByWord(text) {
  clearMessageChildren();

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return;

  const holdTime = 800;   // ms to hold each word on screen
  const pauseTime = 150;  // ms gap between words

  idleEl.style.display = 'none';
  const animClass = 'anim-word-by-word';
  messageEl.classList.add(animClass, 'visible');
  currentAnimClass = animClass;

  let index = 0;

  function showNext() {
    const word = words[index];

    // Size this word to fill the screen
    messageEl.textContent = word;
    messageEl.style.fontSize = computeFontSize(word);

    // Forest theme: alternate word colors
    const wbwTheme = THEMES[currentThemeKey] || {};
    if (wbwTheme.animated === 'forest') {
      messageEl.classList.remove('forest-word-a', 'forest-word-b');
      messageEl.classList.add(index % 2 === 0 ? 'forest-word-a' : 'forest-word-b');
    }

    // Trigger pop-in
    messageEl.classList.remove('word-exiting');
    messageEl.offsetHeight; // force reflow
    messageEl.classList.add('word-entering');

    // After pop-in (350ms) + hold, start exit
    letterWordTimeout = setTimeout(() => {
      messageEl.classList.remove('word-entering');
      messageEl.offsetHeight;
      messageEl.classList.add('word-exiting');

      // After exit animation, show next word
      letterWordTimeout = setTimeout(() => {
        messageEl.classList.remove('word-exiting');
        index = (index + 1) % words.length; // loop
        letterWordTimeout = setTimeout(showNext, pauseTime);
      }, 250); // matches word-pop-out duration
    }, 350 + holdTime); // matches word-pop-in duration + hold
  }

  showNext();
}

function showMessage({ text, animation, theme }) {
  // Reset any current animation
  if (currentAnimClass) {
    messageEl.classList.remove(currentAnimClass, 'visible', 'message-fade-out');
    currentAnimClass = null;
  }
  if (letterWordTimeout) {
    clearTimeout(letterWordTimeout);
    letterWordTimeout = null;
  }
  clearMessageChildren();

  // Apply theme
  currentThemeKey = theme || 'classic';
  applyTheme(theme);

  // Handle letter-by-letter and word-by-word separately
  if (animation === 'letter-by-letter') {
    const fontSize = computeFontSize(text);
    showLetterByLetter(text, fontSize);
    return;
  }

  if (animation === 'word-by-word') {
    showWordByWord(text);
    return;
  }

  // Set text — forest theme wraps words in spans for alternating colors
  const activeTheme = THEMES[theme] || THEMES.classic;
  if (activeTheme.animated === 'forest') {
    clearMessageChildren();
    text.split(' ').forEach((word, i) => {
      if (i > 0) messageEl.appendChild(document.createTextNode(' '));
      const span = document.createElement('span');
      span.classList.add(i % 2 === 0 ? 'forest-word-a' : 'forest-word-b');
      span.textContent = word;
      messageEl.appendChild(span);
    });
  } else {
    messageEl.textContent = text;
  }

  if (animation === 'marquee') {
    messageEl.style.fontSize = computeMarqueeFontSize(text);
    const duration = Math.max(6, text.length * 0.3 + 4);
    messageEl.style.setProperty('--marquee-duration', duration + 's');
  } else {
    messageEl.style.fontSize = computeFontSize(text);
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
  if (letterWordTimeout) {
    clearTimeout(letterWordTimeout);
    letterWordTimeout = null;
  }
  if (currentAnimClass) {
    messageEl.classList.remove(currentAnimClass, 'visible', 'message-fade-out', 'word-entering', 'word-exiting', 'forest-word-a', 'forest-word-b');
    currentAnimClass = null;
  }
  messageEl.textContent = '';
  clearMessageChildren();
  messageEl.style.fontSize = '';
  idleEl.style.display = '';
}

// When animation ends, go back to idle
messageEl.addEventListener('animationend', (e) => {
  // Only reset on the main animation ending, not on child span animations
  // Skip for word-by-word mode — it manages its own lifecycle via timeouts
  if (e.target === messageEl && currentAnimClass !== 'anim-word-by-word') {
    resetDisplay();
  }
});

// Start
connect();
