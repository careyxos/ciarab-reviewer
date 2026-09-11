// Web Audio API Synthesizer with satisfying Apple iOS-style acoustic haptics and ambient music

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Satisfying iOS Tactile Mechanical Click / Tap
export function playHapticTap() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.04);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(400, now);
  filter.Q.setValueAtTime(3, now);

  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.045);
}

// Satisfying Bubble Pop on Card Flip
export function playFlipSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(480, now);
  osc.frequency.exponentialRampToValueAtTime(840, now + 0.07);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.08);
}

// Crisp Air Whoosh on Next/Prev Slide
export function playCardSwoosh() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(260, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.09);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(500, now);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.09);
}

// Sweet Correct Answer Chime
export function playCorrectSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.06);

    gain.gain.setValueAtTime(0, now + idx * 0.06);
    gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.06 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.06);
    osc.stop(now + idx * 0.06 + 0.35);
  });
}

// Escalating Streak Sound (Pitch climbs with combo multiplier)
export function playStreakSound(streak: number) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const baseNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
  const step = Math.min(streak, 6);
  const freq = baseNotes[(step - 1) % baseNotes.length] * (step > 4 ? 1.25 : 1);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + 0.12);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
}

// Bouncy Juicy Bubble Pop (Gizmo answer tap)
export function playBubblePop() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(780, now + 0.05);

  gain.gain.setValueAtTime(0.20, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.065);
}

// Sweet Crystal XP Chime
export function playXpSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  [1046.50, 1318.51, 1567.98].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now + i * 0.04);

    gain.gain.setValueAtTime(0.12, now + i * 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + i * 0.04);
    osc.stop(now + i * 0.04 + 0.28);
  });
}

// Gentle Incorrect Answer Sound
export function playIncorrectSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [330, 277.18]; // E4 -> C#4
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.1);

    gain.gain.setValueAtTime(0.1, now + idx * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.1);
    osc.stop(now + idx * 0.1 + 0.22);
  });
}

// Triumphant Celebration Fanfare
export function playCelebrationSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const chords = [
    [523.25, 659.25, 783.99], // C
    [587.33, 739.99, 880.00], // D
    [659.25, 830.61, 987.77], // E
    [1046.50, 1318.51, 1567.98] // High C
  ];

  chords.forEach((chord, chordIdx) => {
    const time = now + chordIdx * 0.13;
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.4);
    });
  });
}

// Find a sweet, clear female voice (Windows, macOS, iOS, Android, Chrome, Edge)
function getFemaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const femaleKeywords = [
    'zira', 'jenny', 'aria', 'samantha', 'victoria', 'karen', 
    'susan', 'cathy', 'eva', 'hazel', 'heather', 'female', 
    'woman', 'girl', 'natural', 'fiona'
  ];

  // 1. Prefer English female voice
  for (const kw of femaleKeywords) {
    const match = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.toLowerCase().includes(kw) || v.voiceURI.toLowerCase().includes(kw))
    );
    if (match) return match;
  }

  // 2. Any female voice in another language
  for (const kw of femaleKeywords) {
    const match = voices.find(v => 
      v.name.toLowerCase().includes(kw) || v.voiceURI.toLowerCase().includes(kw)
    );
    if (match) return match;
  }

  // 3. Fallback to en-US or en voice
  return voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
}

// Text to Speech (Configured with sweet, clear female voice)
export function speakText(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  // If already speaking this or another text, cancel it immediately
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    return;
  }
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const femaleVoice = getFemaleVoice();
  if (femaleVoice) {
    utterance.voice = femaleVoice;
  }
  // Soft, clear feminine pitch and natural tempo
  utterance.pitch = 1.22;
  utterance.rate = 0.93;
  window.speechSynthesis.speak(utterance);
}

// Immediately cancel and stop any active text to speech
export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// Ambient Lofi Synthesizer Loop
class LofiSynthPlayer {
  private isPlaying = false;
  private timerId: number | null = null;
  private gainNode: GainNode | null = null;
  private volume = 0.25;

  private chords = [
    [349.23, 440.00, 523.25, 659.25], // Fmaj7
    [329.63, 392.00, 493.88, 587.33], // Em7
    [293.66, 349.23, 440.00, 523.25], // Dm7
    [261.63, 329.63, 392.00, 493.88], // Cmaj7
  ];
  private chordIndex = 0;

  public play() {
    if (this.isPlaying) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    this.isPlaying = true;
    this.gainNode = ctx.createGain();
    this.gainNode.gain.setValueAtTime(this.volume, ctx.currentTime);
    this.gainNode.connect(ctx.destination);

    this.scheduleNextChord();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    const ctx = getAudioContext();
    if (ctx && this.gainNode) {
      this.gainNode.gain.setValueAtTime(this.volume, ctx.currentTime);
    }
  }

  public getIsPlaying() {
    return this.isPlaying;
  }

  private scheduleNextChord() {
    if (!this.isPlaying) return;
    const ctx = getAudioContext();
    if (!ctx || !this.gainNode) return;

    const chord = this.chords[this.chordIndex];
    const now = ctx.currentTime;

    // Play dreamy electric piano arpeggio
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, now);

      noteGain.gain.setValueAtTime(0, now + idx * 0.16);
      noteGain.gain.linearRampToValueAtTime(0.11, now + idx * 0.16 + 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 2.2);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(this.gainNode!);

      osc.start(now + idx * 0.16);
      osc.stop(now + idx * 0.16 + 2.3);
    });

    this.chordIndex = (this.chordIndex + 1) % this.chords.length;
    this.timerId = window.setTimeout(() => {
      this.scheduleNextChord();
    }, 2800);
  }
}

export const lofiPlayer = new LofiSynthPlayer();
