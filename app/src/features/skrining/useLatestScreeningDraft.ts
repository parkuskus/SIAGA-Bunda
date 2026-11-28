import { useEffect, useState } from "react"
import { db } from "@/data/db"
import type { Profile } from "@/data/db"
import { getCurrentProfile, getCurrentUserId } from "@/data/currentUser"
import { weeksFromHpht } from "@/clinical-rules/ukHpl"
import { latestScreeningDraft } from "@/features/skrining/screeningDraftUtils"
import { measurementPrefill, type MeasurementPrefill } from "@/features/skrining/measurementPrefill"

type Draft = {
  loading: boolean
  userId: string
  detail: Record<string, unknown> | null
  profile: Profile | null
  prefill: MeasurementPrefill | null
}

export function useLatestScreeningDraft(tipe: string, includePrefill = false, babyId?: string): Draft {
  const [draft, setDraft] = useState<Draft>({ loading: true, userId: "", detail: null, profile: null, prefill: null })

  useEffect(() => {
    let active = true
    void (async () => {
      let userId = ""
      try {
        userId = await getCurrentUserId()
        const [rows, profile, measurementRows, weights] = await Promise.all([
          db.screeningResults.where("userId").equals(userId).filter((row) => row.tipe === tipe).toArray(),
          getCurrentProfile().catch(() => null),
          includePrefill ? db.screeningResults.where("userId").equals(userId).toArray() : Promise.resolve([]),
          includePrefill ? db.weightEntries.where("userId").equals(userId).toArray() : Promise.resolve([]),
        ])
        if (active) setDraft({
          loading: false,
          userId,
          detail: latestScreeningDraft(rows, userId, tipe, babyId),
          profile: profile?.id === userId ? profile : null,
          prefill: includePrefill ? measurementPrefill(measurementRows, weights) : null,
        })
      } catch {
        if (active) setDraft({ loading: false, userId, detail: null, profile: null, prefill: null })
      }
    })()
    return () => { active = false }
  }, [tipe, includePrefill, babyId])

  return draft
}

export function ageFromProfile(profile: Profile | null): string {
  if (!profile?.tanggal_lahir) return ""
  const birth = new Date(profile.tanggal_lahir)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--
  return age >= 10 && age <= 60 ? String(age) : ""
}

export function ukFromProfile(profile: Profile | null): string {
  if (!profile?.hpht) return ""
  const weeks = weeksFromHpht(profile.hpht)
  return weeks >= 0 && weeks <= 45 ? String(weeks) : ""
}
