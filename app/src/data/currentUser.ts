import { supabase } from "./supabase"
import { db, type Profile } from "./db"
import { syncProfile } from "./sync"

// ponytail: identitas eksplisit menang; jangan pernah memilih profil pertama karena bisa membuka data akun lain.
export async function getCurrentUserId(): Promise<string> {
  try {
    const demoId = localStorage.getItem("siaga_demo_user_id")
    if (demoId === "demo-dummy") return demoId
  } catch { /* Coba sumber identitas berikutnya bila localStorage tidak tersedia. */ }
  try {
    const { data } = await supabase.auth.getSession()
    const uid = data.session?.user?.id
    if (uid) return uid
    const { data: u } = await supabase.auth.getUser()
    if (u.user?.id) return u.user.id
  } catch {
    // ignore — offline atau placeholder supabase
  }
  try {
    const cachedId = localStorage.getItem("siaga_active_user_id")
    if (cachedId && await db.profiles.get(cachedId)) return cachedId
  } catch {
    // ignore
  }
  return "demo-siti"
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const uid = await getCurrentUserId()
  const p = await db.profiles.get(uid)
  if (p) {
    if (p.pendingRegistration && !uid.startsWith("demo-")) {
      const { pendingRegistration: _, ...profile } = p
      if (await syncProfile(profile) === "synced") {
        await db.profiles.put(profile)
        return profile
      }
      return p
    }
    if (!uid.startsWith("demo-") && (!p.email || !p.hpht?.trim() || !p.avatarPath)) {
      try {
        const { data: remote } = await supabase.from("profiles")
          .select("nama,email,tanggal_lahir,hpht,gravida,para,abortus,fasyankes,nama_bidan,no_hp,avatar_path,created_at,updated_at")
          .eq("id", uid).maybeSingle()
        if (remote) {
          const merged = {
            ...p,
            nama: p.nama || remote.nama || "",
            email: p.email || remote.email || "",
            tanggal_lahir: p.tanggal_lahir || remote.tanggal_lahir || "",
            hpht: p.hpht?.trim() ? p.hpht : remote.hpht || "",
            noHp: p.noHp || remote.no_hp || "",
            gravida: p.gravida ?? remote.gravida ?? 1,
            para: p.para ?? remote.para ?? 0,
            abortus: p.abortus ?? remote.abortus ?? 0,
            fasyankes: p.fasyankes || remote.fasyankes || "",
            nama_bidan: p.nama_bidan || remote.nama_bidan || "",
            avatarPath: p.avatarPath || remote.avatar_path || undefined,
            createdAt: p.createdAt || remote.created_at || new Date().toISOString(),
            updatedAt: p.updatedAt || remote.updated_at || new Date().toISOString(),
          }
          await db.profiles.put(merged)
          return merged
        }
      } catch { /* Profil lokal tetap menjadi fallback. */ }
    }
    return p
  }
  // coba fetch dari Supabase jika ada sesi riil tapi Dexie kosong (login di device baru)
  try {
    const [{ data: remote }, { data: auth }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).single(),
      supabase.auth.getUser(),
    ])
    if (remote) {
      const mapped = {
        id: remote.id as string,
        nama: (remote.nama as string) ?? "",
        email: (remote.email as string) ?? auth.user?.email ?? "",
        tanggal_lahir: (remote.tanggal_lahir as string) ?? "",
        noHp: (remote.no_hp as string) ?? "",
        hpht: (remote.hpht as string) ?? "",
        gravida: (remote.gravida as number) ?? 1,
        para: (remote.para as number) ?? 0,
        abortus: (remote.abortus as number) ?? 0,
        fasyankes: (remote.fasyankes as string) ?? "",
        nama_bidan: (remote.nama_bidan as string) ?? "",
        avatarPath: (remote.avatar_path as string) ?? undefined,
        createdAt: (remote.created_at as string) ?? new Date().toISOString(),
        updatedAt: (remote.updated_at as string) ?? new Date().toISOString(),
      }
      await db.profiles.put(mapped)
      return mapped
    }
  } catch {
    // ignore — offline atau belum sync
  }
  return null
}
