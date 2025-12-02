export function calculateAudioVolume(dataArray: Uint8Array): number {
  if (dataArray.length === 0) return 0;

  // Calculate RMS (Root Mean Square) for better energy representation
  // This provides a more accurate measure of "loudness" than simple average
  let sumSq = 0;
  const len = dataArray.length;
  for (let i = 0; i < len; i++) {
    const val = dataArray[i];
    if (val !== undefined) {
      sumSq += val * val;
    }
  }
  const rms = Math.sqrt(sumSq / len);

  // Normalize to 0-1 range.
  // Speech typically occupies the lower end of the 0-255 frequency amplitude range.
  // We divide by 100 (instead of 255) to boost sensitivity for typical speech levels,
  // making the visuals more responsive to normal talking volume.
  return Math.min(1, rms / 100);
}

export function calculateBassEnergy(data: Uint8Array): number {
  if (data.length === 0) return 0;

  // Calculate "Bass" energy (low frequency dominance)
  // FFT size 256 = 128 bins. Sample rate ~24k. Bin bandwidth ~93Hz.
  // Bins 0-4 range approx 0-450Hz.
  const bassBins = Math.min(data.length, 5);
  let bassEnergy = 0;
  for (let i = 0; i < bassBins; i++) {
    const val = data[i];
    if (val !== undefined) {
      bassEnergy += val;
    }
  }
  return bassEnergy / bassBins / 255; // Normalize 0-1
}

export function calculateMidEnergy(data: Uint8Array): number {
  if (data.length === 0) return 0;

  // Calculate "Mid" energy (mid frequency range)
  // Bins 5-20 range approx 450Hz-1.8kHz (typical speech range)
  const startBin = 5;
  const endBin = Math.min(data.length, 20);
  let midEnergy = 0;
  let count = 0;
  for (let i = startBin; i < endBin; i++) {
    const val = data[i];
    if (val !== undefined) {
      midEnergy += val;
      count++;
    }
  }
  return count > 0 ? midEnergy / count / 255 : 0; // Normalize 0-1
}

export function calculateHighEnergy(data: Uint8Array): number {
  if (data.length === 0) return 0;

  // Calculate "High" energy (high frequency range)
  // Bins 21+ range approx 1.8kHz+ (sharp sounds, consonants)
  const startBin = 21;
  const endBin = Math.min(data.length, 64);
  let highEnergy = 0;
  let count = 0;
  for (let i = startBin; i < endBin; i++) {
    const val = data[i];
    if (val !== undefined) {
      highEnergy += val;
      count++;
    }
  }
  return count > 0 ? highEnergy / count / 255 : 0; // Normalize 0-1
}
