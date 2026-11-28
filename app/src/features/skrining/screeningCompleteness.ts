// Menilai kelengkapan data, bukan menentukan ambang atau kategori klinis.
type Input = Record<string, unknown>
const filled = (value: unknown): boolean => value !== null && value !== undefined && value !== ''
const number = (value: unknown, min: number, max: number): boolean => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
const boolean = (value: unknown): boolean => typeof value === 'boolean'
const choice = (value: unknown, choices: readonly string[]): boolean => typeof value === 'string' && choices.includes(value)

export function validateScreening(tipe: string, v: Input): Record<string, string> {
  const errors: Record<string, string> = {}
  const range = (key: string, min: number, max: number, label: string) => `Isi ${label} dengan angka ${min.toLocaleString('id-ID')} sampai ${max.toLocaleString('id-ID')}${key === 'sistolik' || key === 'diastolik' ? ' mmHg' : ''}`
  const requireNumber = (key: string, min: number, max: number, label: string) => {
    if (!number(v[key], min, max)) errors[key] = range(key, min, max, label)
  }
  const requireBoolean = (key: string, label: string) => {
    if (!boolean(v[key])) errors[key] = `Jawab ${label} dengan Ya atau Tidak`
  }
  const requireChoice = (key: string, options: readonly string[], label: string) => {
    if (!choice(v[key], options)) {
      const visible = options.map((option) => key === 'bbBayiTren' && option === 'stagnan' ? 'tetap' : key === 'urin' && option === 'gelap' ? 'gelap pekat' : key === 'produksiASI' && option === 'tidak' ? 'tidak ada' : option)
      errors[key] = `Pilih ${label} dari ${visible.slice(0, -1).join(', ')}, atau ${visible.at(-1)}`
    }
  }
  if (!filled(v.userId)) errors.userId = 'Pengguna belum tersedia'
  switch (tipe) {
    case 'poedji_rochjati': {
      requireNumber('usia', 10, 60, 'Usia ibu')
      requireNumber('ukMinggu', 0, 45, 'Usia kehamilan')
      requireNumber('paritas', 0, 15, 'jumlah persalinan sebelumnya')
      const answers = v.jawabanForm as Input | undefined
      const hasGravidaAnswer = answers && typeof answers.gravida === 'number'
      if (hasGravidaAnswer) {
        if (!Number.isSafeInteger(v.gravida) || (v.gravida as number) < 1) errors.gravida = 'Isi urutan kehamilan dengan angka bulat minimal 1'
        if (!Number.isSafeInteger(v.paritas) || (v.paritas as number) > (v.gravida as number)) errors.paritas = 'Jumlah persalinan sebelumnya tidak boleh melebihi urutan kehamilan'
      }
      if (!answers || (!hasGravidaAnswer && !choice(answers.paritas, ['primi', 'multi', 'grande'])) || (hasGravidaAnswer && answers.gravida !== v.gravida) || !choice(answers.jarak, ['lt2', 'gte2', 'belum']) || !Array.isArray(answers.riwayatKomplikasi) || !answers.riwayatKomplikasi.length || !Array.isArray(answers.penyakitKronik) || !answers.penyakitKronik.length || !['gemeli', 'trb', 'letak', 'hidramnion'].every((key) => boolean(answers[key])) || !boolean(v.riwayatPE)) errors.jawabanForm = 'Lengkapi riwayat dan kondisi kehamilan'
      if (answers && Array.isArray(answers.riwayatKomplikasi) && Array.isArray(answers.penyakitKronik)) {
        const komplikasi = answers.riwayatKomplikasi as string[]
        const kronik = answers.penyakitKronik as string[]
        const matched = (
          (hasGravidaAnswer || (answers.paritas === 'primi' ? v.paritas === 0 : answers.paritas === 'grande' ? number(v.paritas, 4, 15) : number(v.paritas, 1, 3))) &&
          (answers.jarak === 'belum' ? v.jarakTahun === undefined : answers.jarak === 'lt2' ? number(v.jarakTahun, 0, 1.999) : number(v.jarakTahun, 2, 20)) &&
          v.riwayatSC === komplikasi.includes('sc') &&
          v.riwayatPE === komplikasi.includes('pe') &&
          v.riwayatKomplikasi === komplikasi.some((item) => ['perdarahan', 'prematur', 'lainnya', 'sc'].includes(item)) &&
          v.penyakitKronik === kronik.some((item) => item !== 'tidak') &&
          v.kehamilanGanda === answers.gemeli && v.trb === answers.trb &&
          v.kelainanLetak === answers.letak && v.hidramnion === answers.hidramnion
        )
        if (!matched || (komplikasi.includes('tidak') && komplikasi.length > 1) || (kronik.includes('tidak') && kronik.length > 1)) errors.jawabanForm = 'Riwayat yang ditinjau tidak sesuai dengan data penilaian'
      }
      if (answers?.jarak !== 'belum' && !number(v.jarakTahun, 0, 20)) errors.jarakTahun = range('jarakTahun', 0, 20, 'jarak kehamilan')
      for (const [key, min, max, label] of [['sistolik', 70, 250, 'tekanan darah atas'], ['diastolik', 40, 150, 'tekanan darah bawah'], ['tbCm', 100, 200, 'tinggi badan'], ['bbPreKg', 20, 250, 'BB sebelum hamil']] as const) if (filled(v[key]) && !number(v[key], min, max)) errors[key] = range(key, min, max, label)
      break
    }
    case 'imt_lila':
      requireNumber('bbPreKg', 20, 200, 'BB sebelum hamil')
      requireNumber('tbCm', 100, 200, 'Tinggi badan')
      requireNumber('lilaCm', 15, 40, 'LILA')
      requireNumber('bbSekarangKg', 20, 250, 'BB saat ini')
      requireNumber('ukMinggu', 0, 45, 'Usia kehamilan')
      break
    case 'danger_sign':
      for (const key of ['perdarahan', 'nyeriKepalaHebat', 'pandanganKabur', 'nyeriAbdomenHebat', 'bengkakWajahTangan', 'gerakanJaninBerkurang', 'demamTinggi', 'ketubanPecah', 'sesakNapas']) requireBoolean(key, key)
      requireNumber('nyeriKepalaSkala', 0, 5, 'Skala nyeri kepala')
      if (v.bengkakWajahTangan === true) requireBoolean('tdTinggi', 'tekanan darah tinggi')
      break
    case 'preeklamsia':
      requireNumber('sistolik', 70, 250, 'tekanan darah atas')
      requireNumber('diastolik', 40, 150, 'tekanan darah bawah')
      requireNumber('ukMinggu', 0, 45, 'Usia kehamilan')
      requireNumber('usia', 10, 60, 'Usia ibu')
      requireNumber('imtPre', 0.1, 100, 'IMT sebelum hamil')
      requireBoolean('proteinuria', 'hasil protein urine')
      for (const key of ['riwayatPE', 'htKronik', 'ginjalKronik', 'diabetesMelitus', 'autoimun', 'riwayatKeluargaPE', 'kehamilanGanda', 'nullipara']) requireBoolean(key, key)
      if (v.faktorDitinjau !== true) errors.faktorDitinjau = 'Tinjau riwayat dan kondisi kehamilan'
      if (v.nullipara === false && !number(v.jarakTahun, 0, 80)) errors.jarakTahun = range('jarakTahun', 0, 80, 'jarak kehamilan sebelumnya')
      if (v.nullipara === true && filled(v.jarakTahun) && !number(v.jarakTahun, 0, 80)) errors.jarakTahun = range('jarakTahun', 0, 80, 'jarak kehamilan sebelumnya')
      break
    case 'dmg':
      requireNumber('usia', 10, 60, 'Usia ibu')
      requireNumber('bbPreKg', 0.1, 300, 'BB sebelum hamil')
      requireNumber('tbCm', 0.1, 250, 'Tinggi badan')
      requireNumber('imtPre', 0.1, 300, 'IMT')
      requireNumber('ukMinggu', 0, 45, 'Usia kehamilan')
      for (const key of ['riwayatDMG', 'riwayatMakrosomia', 'riwayatDMKeluarga', 'glikosuria', 'pcos', 'etnisRisiko']) requireBoolean(key, key)
      if (v.faktorDitinjau !== true) errors.faktorDitinjau = 'Tinjau faktor risiko dan hasil pemeriksaan urine'
      break
    case 'epds':
      if (!Array.isArray(v.answers) || v.answers.length !== 10 || !v.answers.every((answer) => number(answer, 0, 3) && Number.isInteger(answer))) errors.answers = 'Jawab seluruh 10 pertanyaan dengan nilai 0 sampai 3'
      break
    case 'nifas':
      requireNumber('hariKe', 0, 42, 'Hari nifas')
      requireNumber('suhu', 34, 42, 'Suhu tubuh')
      requireNumber('sistolik', 70, 250, 'tekanan darah atas')
      requireNumber('diastolik', 40, 150, 'tekanan darah bawah')
      requireNumber('perdarahanMl', 0, 10000, 'Perdarahan')
      requireNumber('nyeriSkala', 0, 10, 'Skala nyeri')
      requireNumber('mood', 1, 5, 'Suasana hati')
      for (const [key, min, max, label] of [['nadi', 0, 250, 'nadi'], ['spo2', 0, 100, 'SpO2']] as const) if (filled(v[key]) && !number(v[key], min, max)) errors[key] = range(key, min, max, label)
      requireChoice('produksiASI', ['ada', 'sedikit', 'tidak'], 'produksi ASI')
      for (const key of ['lochiaBau', 'nyeriUterus', 'lukaBengkak']) requireBoolean(key, key)
      if (v.keluhanDitinjau !== true) errors.keluhanDitinjau = 'Tinjau keluhan nifas'
      break
    case 'laktasi':
      requireNumber('usiaBayiHari', 0, 365, 'Usia bayi')
      requireNumber('frekuensiMenyusuPerHari', 0, 50, 'Frekuensi menyusu')
      requireNumber('bakPerHari', 0, 50, 'Frekuensi BAK')
      for (const [key, options] of Object.entries({ kondisiPuting: ['normal', 'nyeri', 'luka', 'masuk'], kondisiPayudara: ['normal', 'bengkak', 'keras', 'merah'], volumeASI: ['cukup', 'sedikit', 'tidak ada'], bbBayiTren: ['naik', 'stagnan', 'turun'], urin: ['jernih', 'kuning', 'gelap'] })) requireChoice(key, options, key)
      requireBoolean('demam', 'demam')
      if (filled(v.durasiMenyusuMenit) && !number(v.durasiMenyusuMenit, 0, 240)) errors.durasiMenyusuMenit = range('durasiMenyusuMenit', 0, 240, 'durasi menyusu')
      break
    case 'ikterus':
      requireNumber('usiaBayiHari', 0, 365, 'Usia bayi')
      if (![1, 2, 3, 4, 5].includes(v.zona as number)) errors.zona = 'Pilih zona Kramer 1 sampai 5'
      requireNumber('onsetJam', 0, 8760, 'Waktu awal kuning')
      requireChoice('aktivitas', ['aktif', 'mengantuk', 'tidak mau minum'], 'aktivitas bayi')
      requireBoolean('fesesDempul', 'feses pucat')
      requireBoolean('prematur', 'prematuritas')
      if (v.gejalaDitinjau !== true) errors.gejalaDitinjau = 'Tinjau feses dan prematuritas bayi'
      break
    case 'hipotiroid': {
      if (!boolean(v.sudahTSH)) errors.sudahTSH = 'Pilih Sudah atau Belum untuk pemeriksaan TSH'
      requireNumber('usiaBayiHari', 0, 365, 'Usia bayi')
      const symptoms = v.gejala as Input | undefined
      if (!symptoms || !['ikterusLama', 'konstipasi', 'tangisanSerak', 'aktivitasKurang', 'lidahBesar'].every((key) => boolean(symptoms[key]))) errors.gejala = 'Lengkapi pemeriksaan gejala bayi'
      if (v.gejalaDitinjau !== true) errors.gejalaDitinjau = 'Tinjau gejala bayi'
      break
    }
    default:
      errors.tipe = 'Jenis skrining tidak dikenal'
  }
  return errors
}

export function needsRepeat(result: { tipe: string; detail: Record<string, unknown> }): boolean {
  return result.detail?.validasiKelengkapan !== 1 || Object.keys(validateScreening(result.tipe, result.detail)).length > 0
}
