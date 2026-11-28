import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')
const { needsRepeat, validateScreening } = await import('../src/features/skrining/screeningCompleteness.ts')

test('risk screening keeps pregnancy order separate from parity scoring', async () => {
  const screen = await read('../src/features/skrining/ibu-hamil/RiskFactorScreen.tsx')
  const form = await read('../src/features/skrining/ibu-hamil/riskFactorForm.ts')
  const validation = await read('../src/features/skrining/screeningCompleteness.ts')

  assert.match(screen, /Hamil ke/)
  assert.match(screen, /profile\.gravida/)
  assert.match(screen, /profile\.para/)
  assert.match(screen, /gravida:/)
  assert.match(form, /paritas: input\.paritas/)
  assert.match(validation, /v\.gravida/)
  assert.match(validation, /v\.paritas/)
})

test('new screening drafts validate gravida independently and accept legacy parity drafts', () => {
  const common = {
    userId: 'user-1',
    usia: 30,
    ukMinggu: 20,
    paritas: 1,
    jarakTahun: 3,
    riwayatKomplikasi: false,
    riwayatSC: false,
    riwayatPE: false,
    penyakitKronik: false,
    kehamilanGanda: false,
    hidramnion: false,
    kelainanLetak: false,
    trb: false,
  }
  const review = {
    jarak: 'gte2',
    riwayatKomplikasi: ['tidak'],
    penyakitKronik: ['tidak'],
    gemeli: false,
    trb: false,
    letak: false,
    hidramnion: false,
  }

  const newDetail = {
    ...common,
    gravida: 3,
    jawabanForm: { ...review, gravida: 3 },
    validasiKelengkapan: 1,
  }
  assert.equal(needsRepeat({ tipe: 'poedji_rochjati', detail: newDetail }), false)
  assert.ok(validateScreening('poedji_rochjati', {
    ...common,
    gravida: 3,
    jawabanForm: { ...review, gravida: 2 },
  }).jawabanForm)
  assert.ok(validateScreening('poedji_rochjati', {
    ...common,
    gravida: 1,
    paritas: 2,
    jawabanForm: { ...review, gravida: 1 },
  }).paritas)
  const legacyDetail = {
    ...common,
    jawabanForm: { ...review, paritas: 'multi' },
    validasiKelengkapan: 1,
  }
  assert.equal(needsRepeat({ tipe: 'poedji_rochjati', detail: legacyDetail }), false)
})

test('screening forms use the requested plain-language terminology', async () => {
  const [risk, preeclampsia, postpartum, menu, diabetes, history, postpartumForm, preeclampsiaForm] = await Promise.all([
    read('../src/features/skrining/ibu-hamil/RiskFactorScreen.tsx'),
    read('../src/features/skrining/ibu-hamil/PreeklamsiaScreen.tsx'),
    read('../src/features/skrining/nifas/NifasScreen.tsx'),
    read('../src/features/skrining/SkriningPage.tsx'),
    read('../src/features/skrining/ibu-hamil/DmgScreen.tsx'),
    read('../src/features/profil/HistoryScreen.tsx'),
    read('../src/features/skrining/nifas/nifasForm.ts'),
    read('../src/features/skrining/ibu-hamil/preeklamsiaForm.ts'),
  ])

  for (const source of [risk, preeclampsia, postpartum]) {
    assert.match(source, /Tekanan darah atas \(mmHg\)/)
    assert.match(source, /Tekanan darah bawah \(mmHg\)/)
  }
  assert.match(risk, />Darah tinggi</)
  assert.match(preeclampsia, /Darah tinggi menahun/)
  assert.match(menu, /Skrining Diabetes Kehamilan/)
  assert.match(diabetes, /title="Diabetes Kehamilan"/)
  assert.match(history, /dmg: "Diabetes Kehamilan"/)
  assert.match(postpartum, /Jahitan jalan lahir atau bekas operasi bengkak atau bernanah/)
  assert.match(postpartumForm, /Jahitan jalan lahir atau bekas operasi bengkak atau bernanah/)
  assert.match(preeclampsiaForm, /Darah tinggi menahun/)
})

test('screening instructions and P4K introduction show the agreed client copy', async () => {
  const screening = await read('../src/features/skrining/SkriningPage.tsx')
  const birthPlan = await read('../src/features/beranda/BirthPlanScreen.tsx')

  assert.match(screening, /Formulir ini dapat diisi mandiri berdasarkan kondisi Bunda atau buku KIA\. Apabila ada bagian yang kurang dipahami, silakan konsultasikan kepada bidan saat pemeriksaan\./)
  assert.match(birthPlan, /P4K \(Program Perencanaan Persalinan dan Pencegahan Komplikasi\) adalah catatan rencana persalinan aman bagi Ibu dan keluarga\. Lengkapi secara bertahap bersama pasangan atau bidan menjelang hari perkiraan lahir\./)
  assert.match(birthPlan, /\/s-06\/s-06h\/hero-persiapan\.webp/)
})
