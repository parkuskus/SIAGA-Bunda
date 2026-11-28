import jsPDF from 'jspdf'
import { db, type BirthPlan } from '@/data/db'
import { needsGiziReview } from '@/features/skrining/giziReview'

const C = {
  sage: [74, 110, 84] as [number, number, number],
  sageSoft: [234, 244, 240] as [number, number, number],
  cream: [255, 252, 246] as [number, number, number],
  ink: [29, 43, 41] as [number, number, number],
  muted: [83, 105, 97] as [number, number, number],
  border: [217, 231, 226] as [number, number, number],
  green: [46, 125, 50] as [number, number, number],
  yellow: [138, 109, 0] as [number, number, number],
  red: [198, 40, 40] as [number, number, number],
}

const fmtDate = (value?: string) => value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum diisi'
const categoryColor = (value: string): [number, number, number] => value === 'MERAH' ? C.red : value === 'KUNING' ? C.yellow : C.green

export async function generateRingkasanPDF(userId: string): Promise<Blob> {
  const profile = await db.profiles.get(userId)
  if (!profile) throw new Error('Profil tidak ditemukan')
  const [results, weights, anc, diary, nifas, bbl, suplemen] = await Promise.all([
    db.screeningResults.where('userId').equals(userId).toArray(),
    db.weightEntries.where('userId').equals(userId).toArray(),
    db.ancVisits.where('userId').equals(userId).toArray(),
    db.diaryEntries.where('userId').equals(userId).toArray(),
    db.nifasScreenings.where('userId').equals(userId).toArray(),
    db.bblProfiles.where('userId').equals(userId).toArray(),
    db.supplementReminders.where('userId').equals(userId).toArray(),
  ])
  results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  weights.sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  anc.sort((a, b) => a.tanggalTerjadwal.localeCompare(b.tanggalTerjadwal))

  const doc = new jsPDF({ format: 'a4', unit: 'mm' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const left = 16
  const right = W - 16
  const contentW = right - left
  let y = 0

  const header = () => {
    doc.setFillColor(...C.sage)
    doc.roundedRect(left, 13, contentW, 30, 5, 5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(17)
    doc.text('SIAGA Bunda', left + 7, 24)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Ringkasan kesehatan Bunda dan buah hati', left + 7, 31)
    doc.setFontSize(8)
    doc.text(`Dibuat ${fmtDate(new Date().toISOString())}`, right - 7, 24, { align: 'right' })
    y = 51
  }
  const newPage = () => { doc.addPage(); header() }
  const ensure = (height: number) => { if (y + height > H - 18) newPage() }
  const section = (title: string) => {
    ensure(13)
    doc.setFillColor(...C.sageSoft)
    doc.roundedRect(left, y, contentW, 9, 3, 3, 'F')
    doc.setTextColor(...C.sage)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(title, left + 4, y + 6.1)
    y += 13
  }
  const row = (label: string, value: string) => {
    const lines = doc.splitTextToSize(`${label}  ${value || 'Belum diisi'}`, contentW - 10) as string[]
    const height = Math.max(6, lines.length * 4.5 + 2)
    ensure(height)
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...C.border)
    doc.roundedRect(left, y, contentW, height, 2, 2, 'FD')
    doc.setTextColor(...C.ink)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(lines, left + 4, y + 4.5)
    y += height + 2
  }

  header()
  section('Data Bunda')
  row('Nama', profile.nama)
  row('Email', profile.email)
  row('Tanggal lahir', fmtDate(profile.tanggal_lahir))
  row('Kehamilan', `G${profile.gravida}P${profile.para}A${profile.abortus}`)
  row('HPHT', fmtDate(profile.hpht))
  row('Fasilitas kesehatan', profile.fasyankes)
  row('Bidan pendamping', profile.nama_bidan)

  section(`Riwayat Skrining  ${results.length}`)
  if (!results.length) row('Status', 'Belum ada riwayat skrining')
  for (const result of results) {
    ensure(13)
    const review = needsGiziReview(result)
    const color = review ? C.yellow : categoryColor(result.kategori)
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...C.border)
    doc.roundedRect(left, y, contentW, 11, 3, 3, 'FD')
    doc.setFillColor(...color)
    doc.circle(left + 5, y + 5.5, 1.5, 'F')
    doc.setTextColor(...C.ink)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(result.tipe.replaceAll('_', ' '), left + 10, y + 4.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.muted)
    doc.setFontSize(7.5)
    doc.text(`${fmtDate(result.createdAt)}  |  Skor ${result.skor}`, left + 10, y + 8.2)
    doc.setFillColor(color[0], color[1], color[2])
    doc.roundedRect(right - 26, y + 2.5, 21, 6, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.text(review ? 'TINJAU BB' : result.kategori, right - 15.5, y + 6.5, { align: 'center' })
    y += 13
    if (review) row('Catatan', 'Kenaikan BB lebih menurut perkiraan aplikasi. Kategori tersimpan HIJAU belum menilai apakah kenaikan ini aman. Konsultasikan dengan bidan atau dokter.')
  }

  section('Pemantauan')
  row('Berat badan tercatat', `${weights.length} entri`)
  row('Kunjungan ANC', `${anc.filter((item) => item.statusSelesai).length} dari ${anc.length} selesai`)
  row('Catatan harian', `${diary.length} entri`)
  if (suplemen.length) row('Suplemen aktif', suplemen.filter((item) => item.statusAktif).map((item) => `${item.namaSuplemen} pukul ${item.waktu}`).join(', ') || 'Tidak ada')
  if (weights.length) {
    section('Berat Badan Terakhir')
    for (const item of weights.slice(-8).reverse()) row(fmtDate(item.tanggal), `${item.beratKg} kg`)
  }
  if (anc.length) {
    section('Jadwal Periksa')
    for (const item of anc) row(fmtDate(item.tanggalTerjadwal), item.statusSelesai ? 'Selesai' : 'Terjadwal')
  }
  if (nifas.length || bbl.length) {
    section('Masa Nifas dan Bayi')
    for (const item of nifas) row(`Nifas hari ke-${item.hariKe}`, `${item.status}  |  ${fmtDate(item.createdAt)}`)
    for (const [index, item] of bbl.entries()) {
      row(item.nama || `Bayi ${index + 1}`, fmtDate(item.dataLahir))
      if (item.beratLahirGr != null) row('Berat lahir', `${item.beratLahirGr} gram`)
      if (item.panjangLahirCm != null) row('Panjang lahir', `${item.panjangLahirCm} cm`)
      if (item.apgar != null) row('APGAR', String(item.apgar))
      if (item.usiaGestasi != null) row('Usia gestasi bayi', `${item.usiaGestasi} minggu`)
    }
  }

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    doc.setDrawColor(...C.border)
    doc.line(left, H - 13, right, H - 13)
    doc.setTextColor(...C.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text('SIAGA Bunda  |  Siaga menjaga bunda dan buah hati', left, H - 8)
    doc.text(`${page} / ${pages}`, right, H - 8, { align: 'right' })
  }
  return doc.output('blob')
}

export async function shareViaWA(userId: string): Promise<void> {
  const blob = await generateRingkasanPDF(userId)
  const file = new File([blob], `SIAGA-Bunda-${userId}.pdf`, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'SIAGA Bunda Ringkasan' })
  } else {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  }
}

export async function generateBirthPlanPDF(plan: BirthPlan): Promise<Blob> {
  const profile = await db.profiles.get(plan.userId)
  const doc = new jsPDF({ format: 'a4', unit: 'mm' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const left = 16
  const right = W - 16
  const width = right - left
  let y = 0
  const filled = [plan.penolong, plan.tempatBersalin, plan.pendamping, plan.hpBidanSiaga, plan.donor1Nama, plan.donor1GolonganDarah, plan.donor2Nama, plan.donor2GolonganDarah, plan.transportasi].filter((value) => value.trim()).length
    + Number(plan.danaDikonfirmasi && plan.estimasiDana !== null)
    + Object.values(plan.checklistPerlengkapan).filter(Boolean).length
    + Object.values(plan.tandaPersalinanDipahami).filter(Boolean).length
  const money = plan.estimasiDana === null ? 'Belum diisi' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(plan.estimasiDana)
  const header = () => {
    doc.setFillColor(...C.sage)
    doc.roundedRect(left, 13, width, 34, 5, 5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(17)
    doc.text('SIAGA Bunda', left + 7, 24)
    doc.setFontSize(12)
    doc.text('Rencana Persalinan Bunda', left + 7, 33)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Dibuat ${fmtDate(new Date().toISOString())}`, right - 7, 24, { align: 'right' })
    y = 55
  }
  const newPage = () => { doc.addPage(); header() }
  const ensure = (height: number) => { if (y + height > H - 20) newPage() }
  const section = (title: string) => {
    ensure(14)
    doc.setFillColor(...C.sageSoft)
    doc.roundedRect(left, y, width, 9, 3, 3, 'F')
    doc.setTextColor(...C.sage)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(title, left + 4, y + 6.1)
    y += 13
  }
  const row = (label: string, value: string) => {
    const lines = doc.splitTextToSize(`${label}  ${value || 'Belum diisi'}`, width - 10) as string[]
    const height = Math.max(7, lines.length * 4.6 + 2)
    ensure(height + 2)
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...C.border)
    doc.roundedRect(left, y, width, height, 2, 2, 'FD')
    doc.setTextColor(...C.ink)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(lines, left + 4, y + 4.7)
    y += height + 2
  }

  header()
  doc.setTextColor(...C.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(profile?.nama ? `Nama Bunda  ${profile.nama}` : 'Nama Bunda  Belum diisi', left, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.muted)
  doc.text(`Kelengkapan ${filled} dari 25 butir  (${Math.round(filled / 25 * 100)}%)`, left, y)
  y += 9

  section('Informasi Persalinan')
  row('Tempat bersalin', plan.tempatBersalin)
  row('Penolong', plan.penolong)
  row('Pendamping', plan.pendamping)
  row('Nomor HP bidan atau dokter siaga', plan.hpBidanSiaga)

  section('Persiapan Darurat')
  row('Calon donor darah 1', [plan.donor1Nama, plan.donor1GolonganDarah && `Golongan darah ${plan.donor1GolonganDarah}`].filter(Boolean).join(', '))
  row('Calon donor darah 2', [plan.donor2Nama, plan.donor2GolonganDarah && `Golongan darah ${plan.donor2GolonganDarah}`].filter(Boolean).join(', '))
  row('Transportasi', plan.transportasi)
  section('Persiapan Biaya')
  row('Estimasi dana persalinan', money)

  const stillMissing = [
    ['Penolong persalinan', plan.penolong], ['Tempat bersalin', plan.tempatBersalin], ['Pendamping', plan.pendamping],
    ['Nomor HP bidan atau dokter siaga', plan.hpBidanSiaga], ['Nama calon donor darah 1', plan.donor1Nama],
    ['Golongan darah donor 1', plan.donor1GolonganDarah], ['Nama calon donor darah 2', plan.donor2Nama],
    ['Golongan darah donor 2', plan.donor2GolonganDarah], ['Transportasi', plan.transportasi],
  ].filter(([, value]) => !String(value).trim())
  if (!plan.danaDikonfirmasi || plan.estimasiDana === null) stillMissing.push(['Estimasi dana persalinan', ''])
  if (stillMissing.length) {
    section('Masih perlu dilengkapi')
    for (const [label] of stillMissing) row(label, 'Belum diisi')
    const readyItems = Object.values(plan.checklistPerlengkapan).filter(Boolean).length
    const understoodSigns = Object.values(plan.tandaPersalinanDipahami).filter(Boolean).length
    if (readyItems < 10) row('Perlengkapan ibu dan bayi', `${readyItems} dari 10 siap`)
    if (understoodSigns < 5) row('Tanda persalinan', `${understoodSigns} dari 5 dipahami`)
  }

  section('Checklist Perlengkapan Ibu dan Bayi')
  for (const [key, label] of Object.entries({ bukuKia: 'Buku KIA', ktpBpjs: 'KTP dan BPJS', pakaianIbu: 'Pakaian ibu', pakaianBayi: 'Pakaian bayi', popok: 'Popok', pembalutNifas: 'Pembalut nifas', selimutBayi: 'Selimut bayi', perlengkapanMandi: 'Perlengkapan mandi', peralatanMenyusui: 'Peralatan menyusui', tasPersalinan: 'Tas persalinan sudah siap' })) {
    row(label, plan.checklistPerlengkapan[key] ? 'Siap' : 'Belum disiapkan')
  }

  section('Tanda Persalinan yang Dipahami')
  for (const [key, label] of Object.entries({ kontraksiTeratur: 'Kontraksi teratur', lendirDarah: 'Keluar lendir bercampur darah', ketubanPecah: 'Ketuban pecah', pantauGerakan: 'Gerakan janin tetap dipantau', tahuFasilitas: 'Mengetahui kapan harus ke fasilitas kesehatan' })) {
    row(label, plan.tandaPersalinanDipahami[key] ? 'Sudah dipahami' : 'Belum dipahami')
  }

  section('Catatan penting')
  row('Tindakan', 'Hubungi bidan atau fasilitas kesehatan bila muncul tanda bahaya. Rencana ini membantu persiapan dan tidak menggantikan pemeriksaan tenaga kesehatan.')

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    doc.setDrawColor(...C.border)
    doc.line(left, H - 13, right, H - 13)
    doc.setTextColor(...C.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text('SIAGA Bunda  |  Siaga menjaga bunda dan buah hati', left, H - 8)
    doc.text(`${page} / ${pages}`, right, H - 8, { align: 'right' })
  }
  return doc.output('blob')
}

export async function shareBirthPlanPDF(plan: BirthPlan): Promise<void> {
  const blob = await generateBirthPlanPDF(plan)
  const file = new File([blob], 'Rencana-Persalinan-SIAGA-Bunda.pdf', { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Rencana Persalinan SIAGA Bunda' })
    return
  }
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.name
  anchor.click()
  URL.revokeObjectURL(url)
}
