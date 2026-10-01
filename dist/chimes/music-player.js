// The score chooses existing recordings by measured pitch; samples are never transposed.
export function pitchToMidi(pitch) {
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(pitch || '');
  if (!match) throw new Error('Invalid score pitch: ' + pitch);
  const offsets = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return (Number(match[3]) + 1) * 12 + offsets[match[1]] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
}

export function buildScore(piece, recordings) {
  if (!Number.isFinite(piece.bpm) || piece.bpm <= 0 || !piece.notes?.length) throw new Error('Invalid score');
  const samples = Object.values(recordings.bells);
  let time = 0;
  const cues = [];
  for (const note of piece.notes) {
    if (!Number.isFinite(note.beats) || note.beats <= 0) throw new Error('Invalid note duration');
    const duration = note.beats * 60 / piece.bpm;
    if (note.pitch && !['rest', 'REST', 'R'].includes(note.pitch)) {
      const midi = pitchToMidi(note.pitch);
      const sample = samples.filter(sample => sample.midi === midi)
        .sort((a, b) => Math.abs(a.centsFromEqualTemperament) - Math.abs(b.centsFromEqualTemperament))[0];
      if (!sample) throw new Error('No original-pitch recording for ' + note.pitch);
      cues.push({ time, duration, pitch: note.pitch, id: sample.id, url: sample.url });
    }
    time += duration;
  }
  if (!cues.length) throw new Error('Empty melody');
  return { cues, duration: time, title: piece.title };
}

export function createMelodyPlayer({ getContext, loadBuffer, getOutput, onCue, onState, onProgress,
  requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame }) {
  let generation = 0;
  let state = 'idle';
  let run;
  const setState = value => { state = value; onState(value); };
  function release(current) {
    if (!current) return;
    cancelFrame(current.frame);
    const now = current.context.currentTime;
    current.gain.gain.cancelScheduledValues(now);
    current.gain.gain.setTargetAtTime(0, now, 0.012);
    for (const source of current.sources) {
      try { source.stop(now + 0.06); } catch { /* Already ended. */ }
    }
  }
  function stop(nextState = 'idle') {
    generation++;
    release(run); run = undefined;
    setState(nextState);
  }
  async function start(score) {
    stop();
    const token = generation;
    setState('loading');
    onProgress(0, score.duration);
    try {
      // Called synchronously from the song button so the user gesture unlocks sound.
      const context = getContext();
      await context.resume();
      if (token !== generation) return;
      const urls = [...new Set(score.cues.map(cue => cue.url))];
      const buffers = new Map(await Promise.all(urls.map(async url => [url, await loadBuffer(url)])));
      if (token !== generation) return;
      const gain = context.createGain(); gain.connect(getOutput());
      const startTime = context.currentTime + 0.12;
      const endTime = Math.max(score.duration, ...score.cues.map(cue => cue.time + Math.min(buffers.get(cue.url).duration, 4)));
      const current = { context, gain, sources: [], frame: 0, nextCue: 0 };
      run = current;
      for (const cue of score.cues) {
        const source = context.createBufferSource();
        source.buffer = buffers.get(cue.url); source.connect(gain);
        source.onended = () => {
          source.finished = true; source.disconnect();
          if (current.sources.every(source => source.finished)) gain.disconnect();
        };
        // Use the audio clock for rhythm, independently of model rendering or dragging.
        current.sources.push(source);
        source.start(startTime + cue.time);
      }
      setState('playing');
      function tick() {
        if (token !== generation) return;
        const elapsed = context.currentTime - startTime;
        while (current.nextCue < score.cues.length && score.cues[current.nextCue].time <= elapsed) {
          onCue(score.cues[current.nextCue], current.nextCue + 1); current.nextCue++;
        }
        onProgress(Math.max(0, Math.min(elapsed, score.duration)), score.duration);
        if (elapsed >= endTime) { stop('complete'); return; }
        current.frame = requestFrame(tick);
      }
      current.frame = requestFrame(tick);
    } catch (error) {
      if (token !== generation) return;
      stop('error'); console.error('古曲演奏未能载入', error);
    }
  }
  return { start, stop, get busy() { return state === 'loading' || state === 'playing'; } };
}
