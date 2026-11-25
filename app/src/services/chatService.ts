import { supabase } from "@/data/supabase"
import { JAWABAN_KEAMANAN, JAWABAN_OFFLINE } from "@/features/chatbot/personality"
import { consumeChatStream, type StreamChatPayload } from "@/services/chatStream"
import { db } from "@/data/db"
import { getCurrentUserId } from "@/data/currentUser"
import { requiresExternalChatConsent } from "@/services/chatPrivacy"
import { shouldEscalate } from "../../../supabase/functions/_shared/chatPolicy"

// ponytail: all online answers use Edge Function `chat`; offline only shows a connection notice.

export type ChatReply = { answer: string; sources: string[]; escalate: boolean; offline: boolean; verified: boolean; consentRequired?: boolean }
export type ChatTurn = { role: "user" | "assistant"; content: string }
type ChatResponse = StreamChatPayload

async function adaHasilMerahLokal() {
  try {
    const userId = await getCurrentUserId()
    const [screenings, nifas] = await Promise.all([
      db.screeningResults.where("userId").equals(userId).filter((row) => row.kategori === "MERAH").count(),
      db.nifasScreenings.where("userId").equals(userId).filter((row) => row.status === "MERAH").count(),
    ])
    return screenings > 0 || nifas > 0
  } catch {
    return false
  }
}

const berisiProsesInternal = /(?:^|\n)\s*(?:here['’]s a thinking process|let me think step by step|thinking process:|chain[- ]of[- ]thought|analyze user input:|identify the core question(?:\/intent)?:|check rules?\s*&\s*constraints:|(?:step|langkah)\s*\d+[.)]\s*(?:analyze|identify|check|analisis|periksa)|<think>|<analysis>)/i
const berisiLabelKeamanan = /^\s*(?:user safety\s*:|safety categories\s*:)/im

async function invokeChatStream(message: string, history: ChatTurn[], hasRedResult: boolean, onDelta: (text: string) => void): Promise<ChatResponse> {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "")
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !anonKey) throw new Error("Konfigurasi chatbot belum tersedia")
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error("Sesi akun belum tersedia")

  const response = await fetch(`${url}/functions/v1/chat`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream, application/json",
    },
    body: JSON.stringify({ message, history, hasRedResult, externalConsent: true }),
  })
  if (!response.ok) throw new Error(`Chat gagal (${response.status})`)
  if (!response.headers.get("content-type")?.includes("text/event-stream")) return await response.json() as ChatResponse
  return await consumeChatStream(response, onDelta)
}

export async function tanyaChatbot(pesan: string, history: ChatTurn[] = [], onDelta: (text: string) => void = () => {}, allowExternalProcessing = false): Promise<ChatReply> {
  const teks = pesan.trim()
  if (!teks) throw new Error("pesan kosong")
  const offline = typeof navigator !== "undefined" && !navigator.onLine
  if (requiresExternalChatConsent(!offline, allowExternalProcessing)) {
    const hasRedResult = await adaHasilMerahLokal()
    return { answer: "", sources: [], escalate: shouldEscalate(teks, hasRedResult), offline: false, verified: false, consentRequired: true }
  }
  if (offline) {
    const hasRedResult = await adaHasilMerahLokal()
    return { answer: JAWABAN_OFFLINE, sources: [], escalate: shouldEscalate(teks, hasRedResult), offline: true, verified: false }
  }
  try {
    const recentHistory = history.slice(-6).map((turn) => ({ role: turn.role, content: turn.content.slice(0, 1000) }))
    const hasRedResult = await adaHasilMerahLokal()
    const data = await invokeChatStream(teks, recentHistory, hasRedResult, onDelta)
    const answer = typeof data?.answer === "string" ? data.answer.trim() : ""
    if (!answer || berisiProsesInternal.test(answer)) throw new Error("respons chatbot tidak layak ditampilkan")
    if (berisiLabelKeamanan.test(answer)) return { answer: JAWABAN_KEAMANAN, sources: [], escalate: shouldEscalate(teks, data.hasRedResult === true), offline: false, verified: false }
    return { answer, sources: (data.sources as string[]) ?? [], escalate: shouldEscalate(teks, data.hasRedResult === true) || data.escalate === true, offline: false, verified: data.verified === true }
  } catch {
    // No local health answers when the provider is unavailable.
    console.warn("[kira] layanan daring gagal")
    const hasRedResult = await adaHasilMerahLokal()
    return { answer: JAWABAN_OFFLINE, sources: [], escalate: shouldEscalate(teks, hasRedResult), offline: true, verified: false }
  }
}
