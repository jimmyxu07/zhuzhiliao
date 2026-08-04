// === 竹知了在线玩 - Main App ===
(function() {
  'use strict';

  // ---- Sound Mode Configs ----
  const MODES = {
    wawa: {
      name: '哇哇',
      baseFreq: 420,
      freqRange: 180,
      waveType: 'sawtooth',
      vibratoRate: 25,
      vibratoDepth: 0.4,
      gainMult: 0.5
    },
    gaga: {
      name: '嘎嘎',
      baseFreq: 320,
      freqRange: 120,
      waveType: 'square',
      vibratoRate: 8,
      vibratoDepth: 0.6,
      gainMult: 0.35
    },
    dudu: {
      name: '嘟嘟',
      baseFreq: 480,
      freqRange: 80,
      waveType: 'triangle',
      vibratoRate: 6,
      vibratoDepth: 0.2,
      gainMult: 0.45
    },
    wengweng: {
      name: '嗡嗡',
      baseFreq: 260,
      freqRange: 60,
      waveType: 'sine',
      vibratoRate: 40,
      vibratoDepth: 0.3,
      gainMult: 0.4
    }
  };

  // ---- Fake Leaderboard ----
  const LEADERBOARD = [
    { name: '风之子', score: 38 },
    { name: '竹编大师', score: 35 },
    { name: '闪电手', score: 32 },
    { name: '哇声一片', score: 30 },
    { name: '天下第一', score: 28 },
    { name: '快手阿花', score: 26 },
    { name: '知了知了', score: 24 },
    { name: '速度之王', score: 22 },
    { name: '拉动人生', score: 20 },
    { name: '余音绕梁', score: 18 },
    { name: '竹影清风', score: 16 },
    { name: '遥遥领先', score: 14 },
    { name: '十万个哇', score: 12 },
    { name: '手速渣渣', score: 8 },
    { name: '佛系玩家', score: 4 }
  ];

  // ---- Meme text pool ----
  const MEME_POOL = [
    '一千万以内最好的成绩',
    '遥遥领先的速度',
    '余音绕梁，三日不绝',
    '听取哇声一片',
    '这声音，太遥遥领先了',
    '速度与激情·竹知了版',
    '手速天花板，降维打击',
    '别人在卷，我在哇哇',
    '一拉成名天下知',
    '此声只应天上有',
    '拉动你的人生',
    '这一刻，全场的焦点',
    '哇声入耳，速度入心',
    '我就是最哇的那个仔',
    '超越99%的玩家'
  ];

  // ---- State ----
  let currentMode = 'wawa';
  let audioCtx = null;
  let isPlaying = false;
  let oscNode = null;
  let gainNode = null;
  let vibratoNode = null;

  // Pull tracking
  let isPulling = false;
  let lastY = 0;
  let direction = 0; // 1=down, -1=up, 0=none
  let pullCount = 0;
  let pullTimestamps = [];
  let currentScore = 0;
  let bestScore = 0;
  let scoreTimeout = null;

  // ---- DOM ----
  const playArea = document.getElementById('playArea');
  const cicadaSvg = document.getElementById('cicadaSvg');
  const cicadaContainer = document.getElementById('cicadaContainer');
  const pullHint = document.getElementById('pullHint');
  const soundWave = document.getElementById('soundWave');
  const modeButtons = document.getElementById('modeButtons');
  const currentScoreEl = document.getElementById('currentScore');
  const bestScoreEl = document.getElementById('bestScore');
  const rankToggle = document.getElementById('rankToggle');
  const rankModal = document.getElementById('rankModal');
  const rankModalClose = document.getElementById('rankModalClose');
  const rankList = document.getElementById('rankList');
  const rankMy = document.getElementById('rankMy');
  const cardSection = document.getElementById('cardSection');
  const scoreCardCanvas = document.getElementById('scoreCardCanvas');
  const downloadCardBtn = document.getElementById('downloadCard');
  const shareCardBtn = document.getElementById('shareCard');

  // ---- Load best score ----
  try {
    bestScore = parseInt(localStorage.getItem('zzl_best') || '0', 10);
  } catch(e) { bestScore = 0; }
  bestScoreEl.textContent = bestScore;

  // ---- Audio Engine ----
  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function startSound(speed) {
    if (isPlaying) return;
    initAudio();
    const mode = MODES[currentMode];

    oscNode = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    vibratoNode = audioCtx.createOscillator();

    oscNode.type = mode.waveType;
    oscNode.frequency.setValueAtTime(mode.baseFreq, audioCtx.currentTime);

    vibratoNode.type = 'sine';
    vibratoNode.frequency.setValueAtTime(mode.vibratoRate, audioCtx.currentTime);

    const vibratoGain = audioCtx.createGain();
    vibratoGain.gain.setValueAtTime(mode.vibratoDepth, audioCtx.currentTime);
    vibratoNode.connect(vibratoGain);
    vibratoGain.connect(oscNode.frequency);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(mode.gainMult, audioCtx.currentTime + 0.02);

    oscNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscNode.start();
    vibratoNode.start();
    isPlaying = true;

    updateSoundParams(speed);
  }

  function updateSoundParams(speed) {
    if (!isPlaying || !oscNode) return;
    const mode = MODES[currentMode];
    const normalizedSpeed = Math.min(Math.max(speed, 0), 1);
    const freq = mode.baseFreq + normalizedSpeed * mode.freqRange;
    oscNode.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.01);
    vibratoNode.frequency.setTargetAtTime(
      mode.vibratoRate + normalizedSpeed * 30,
      audioCtx.currentTime, 0.01
    );
    if (gainNode) {
      gainNode.gain.setTargetAtTime(
        mode.gainMult * (0.5 + normalizedSpeed * 0.5),
        audioCtx.currentTime, 0.02
      );
    }
  }

  function stopSound() {
    if (!isPlaying) return;
    if (gainNode) {
      gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.08);
    }
    const _osc = oscNode;
    const _gain = gainNode;
    const _vib = vibratoNode;
    setTimeout(() => {
      try {
        _osc.stop();
        _vib.stop();
        _osc.disconnect();
        _vib.disconnect();
        _gain.disconnect();
      } catch(e) {}
    }, 200);
    oscNode = null;
    gainNode = null;
    vibratoNode = null;
    isPlaying = false;
  }

  // ---- Wave Visualizer ----
  const waveBars = soundWave.querySelectorAll('.wave-bar');
  function animateWave(speed) {
    const h = 8 + speed * 32;
    waveBars.forEach((bar, i) => {
      const phase = (Date.now() / 60 + i * 0.8) % (Math.PI * 2);
      const barH = Math.max(4, h * (0.5 + 0.5 * Math.sin(phase)));
      bar.style.height = barH + 'px';
    });
  }

  function stopWave() {
    waveBars.forEach(bar => { bar.style.height = '8px'; });
  }

  // ---- Wing Animation ----
  function setWingVibrating(on) {
    if (on) {
      cicadaSvg.classList.add('vibrating');
      soundWave.classList.add('active');
    } else {
      cicadaSvg.classList.remove('vibrating');
      soundWave.classList.remove('active');
      stopWave();
    }
  }

  // ---- Pull / Drag Logic ----
  function getEventY(e) {
    if (e.touches && e.touches.length > 0) return e.touches[0].clientY;
    if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0].clientY;
    return e.clientY;
  }

  function onPullStart(e) {
    e.preventDefault();
    isPulling = true;
    pullCount = 0;
    pullTimestamps = [];
    direction = 0;
    lastY = getEventY(e);
    playArea.classList.add('active');
    pullHint.classList.add('hidden');
    startSound(0);
    setWingVibrating(true);
  }

  function onPullMove(e) {
    if (!isPulling) return;
    e.preventDefault();
    const y = getEventY(e);
    const delta = Math.abs(y - lastY);
    const speed = Math.min(delta / 15, 1); // normalized speed

    updateSoundParams(speed);
    animateWave(speed);

    // Detect direction change
    const newDir = y > lastY ? 1 : -1;
    if (newDir !== 0 && direction !== 0 && newDir !== direction) {
      pullCount++;
      pullTimestamps.push(Date.now());
    }
    direction = newDir;
    lastY = y;

    // Move cicada visually
    const offset = (y - playArea.getBoundingClientRect().top - playArea.offsetHeight / 2) * 0.15;
    cicadaContainer.style.transform = `translateY(${Math.max(-30, Math.min(30, offset))}px)`;
  }

  function onPullEnd(e) {
    if (!isPulling) return;
    isPulling = false;
    playArea.classList.remove('active');
    cicadaContainer.style.transform = 'translateY(0)';
    stopSound();
    setWingVibrating(false);

    // Calculate score (pulls per second over the last 1s)
    const now = Date.now();
    const recentPulls = pullTimestamps.filter(t => now - t < 1000);
    currentScore = recentPulls.length;

    currentScoreEl.textContent = currentScore;

    if (currentScore > bestScore) {
      bestScore = currentScore;
      bestScoreEl.textContent = bestScore;
      try { localStorage.setItem('zzl_best', String(bestScore)); } catch(e) {}
    }

    if (currentScore > 0) {
      generateScoreCard(currentScore);
      cardSection.style.display = 'block';
      // Auto-hide score after 3s
      if (scoreTimeout) clearTimeout(scoreTimeout);
      scoreTimeout = setTimeout(() => {
        currentScoreEl.textContent = '0';
      }, 3000);
    }
  }

  // Touch events
  playArea.addEventListener('touchstart', onPullStart, { passive: false });
  playArea.addEventListener('touchmove', onPullMove, { passive: false });
  playArea.addEventListener('touchend', onPullEnd);
  playArea.addEventListener('touchcancel', onPullEnd);

  // Mouse events
  playArea.addEventListener('mousedown', onPullStart);
  window.addEventListener('mousemove', onPullMove);
  window.addEventListener('mouseup', onPullEnd);

  // ---- Mode Selector ----
  modeButtons.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    const mode = btn.dataset.mode;
    if (mode === currentMode) return;
    currentMode = mode;
    modeButtons.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });

  // ---- Leaderboard ----
  function renderLeaderboard() {
    rankList.innerHTML = '';
    // Insert user into ranking
    let entries = [...LEADERBOARD];
    if (bestScore > 0) {
      entries.push({ name: '🎉 你', score: bestScore, isMe: true });
    }
    entries.sort((a, b) => b.score - a.score);

    entries.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'rank-item';
      if (i === 0) div.classList.add('top-1');
      if (i === 1) div.classList.add('top-2');
      if (i === 2) div.classList.add('top-3');
      if (item.isMe) div.classList.add('is-me');

      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
      div.innerHTML = `
        <span class="rank-pos">${medal || (i + 1)}</span>
        <span class="rank-name">${item.name}</span>
        <span><span class="rank-score">${item.score}</span><span class="rank-unit">次/秒</span></span>
      `;
      rankList.appendChild(div);
    });

    if (bestScore > 0) {
      const rank = entries.findIndex(e => e.isMe) + 1;
      rankMy.textContent = `你的排名：第 ${rank} 名 / 共 ${entries.length} 人`;
    } else {
      rankMy.textContent = '快去拉动竹知了，争取上榜吧！';
    }
  }

  rankToggle.addEventListener('click', () => {
    renderLeaderboard();
    rankModal.classList.add('show');
  });

  rankModalClose.addEventListener('click', () => {
    rankModal.classList.remove('show');
  });

  rankModal.addEventListener('click', (e) => {
    if (e.target === rankModal) rankModal.classList.remove('show');
  });

  // ---- Score Card Generation ----
  function generateScoreCard(score) {
    const canvas = scoreCardCanvas;
    const ctx = canvas.getContext('2d');
    const W = 600, H = 400;
    canvas.width = W;
    canvas.height = H;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#3D5A3E');
    grad.addColorStop(1, '#2D4A2E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Bamboo texture pattern
    ctx.strokeStyle = 'rgba(212, 168, 83, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // Top decorative bar
    const barGrad = ctx.createLinearGradient(0, 0, W, 0);
    barGrad.addColorStop(0, '#D4A853');
    barGrad.addColorStop(0.5, '#E8C876');
    barGrad.addColorStop(1, '#D4A853');
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, W, 6);

    // Bottom decorative bar
    ctx.fillRect(0, H - 6, W, 6);

    // Emoji cicada
    ctx.font = '64px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎋', W / 2, 80);

    // Title
    ctx.font = 'bold 28px -apple-system, sans-serif';
    ctx.fillStyle = '#F5F0E1';
    ctx.fillText('竹知了在线玩', W / 2, 130);

    // Score label
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(212, 168, 83, 0.8)';
    ctx.fillText('转速PK成绩', W / 2, 165);

    // Big score number
    ctx.font = 'bold 72px -apple-system, sans-serif';
    ctx.fillStyle = '#D4A853';
    ctx.fillText(String(score), W / 2, 245);

    // Score unit
    ctx.font = '18px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(245, 240, 225, 0.6)';
    ctx.fillText('次 / 秒', W / 2, 275);

    // Meme text
    const meme = MEME_POOL[Math.floor(Math.random() * MEME_POOL.length)];
    ctx.font = 'italic bold 20px -apple-system, sans-serif';
    ctx.fillStyle = '#E8C876';
    ctx.fillText(`「${meme}」`, W / 2, 320);

    // Footer
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(245, 240, 225, 0.4)';
    ctx.fillText('zhuzhiliao.site · 竹知了在线玩', W / 2, 370);

  }

  // Download score card
  downloadCardBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const canvas = scoreCardCanvas;
    const link = document.createElement('a');
    link.download = `竹知了成绩卡_${currentScore}次.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  // Share (Web Share API or copy link)
  shareCardBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (navigator.share) {
      try {
        await navigator.share({
          title: '竹知了在线玩',
          text: `我在竹知了在线玩中达到了 ${currentScore} 次/秒的成绩！来挑战我吧！`,
          url: window.location.href
        });
      } catch(err) {
        // user cancelled
      }
    } else {
      // Fallback: copy to clipboard
      try {
        const text = `🎋 竹知了在线玩 - 我达到了 ${currentScore} 次/秒！来挑战我吧！${window.location.href}`;
        await navigator.clipboard.writeText(text);
        shareCardBtn.textContent = '✅ 已复制';
        setTimeout(() => { shareCardBtn.textContent = '🔗 分享'; }, 2000);
      } catch(err) {
        alert('请长按成绩卡保存图片分享给朋友');
      }
    }
  });

})();
