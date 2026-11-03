export const WEIGHT_GAIN_REFERENCE = [
  { key: "Kurus", label: "Kurus (<18,5 kg/m²)", sampleIMT: 18, weeklyKg: [0.44, 0.58] },
  { key: "Normal", label: "Normal (18,5–24,9 kg/m²)", sampleIMT: 24, weeklyKg: [0.35, 0.50] },
  { key: "Gemuk", label: "Kelebihan berat (25–29,9 kg/m²)", sampleIMT: 29, weeklyKg: [0.23, 0.33] },
  { key: "Obesitas", label: "Obesitas (≥30 kg/m²)", sampleIMT: 30, weeklyKg: [0.17, 0.27] },
] as const
