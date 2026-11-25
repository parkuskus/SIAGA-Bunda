import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { getWalkthroughSteps, type WalkthroughTab } from "./walkthroughSteps"

type Props = {
  open: boolean
  isPostpartum: boolean
  activeTab: WalkthroughTab
  onNavigate: (tab: WalkthroughTab) => void
  onFinish: () => void
}

type TargetRect = { top: number; right: number; bottom: number; left: number; width: number; height: number }

export default function WelcomeWalkthrough({ open, isPostpartum, activeTab, onNavigate, onFinish }: Props) {
  const steps = useMemo(() => getWalkthroughSteps(isPostpartum), [isPostpartum])
  const [activeStep, setActiveStep] = useState(0)
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [calloutHeight, setCalloutHeight] = useState(210)
  const calloutRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const step = steps[Math.min(activeStep, steps.length - 1)]

  useLayoutEffect(() => {
    if (open && step && activeTab !== step.tab) onNavigate(step.tab)
  }, [activeTab, onNavigate, open, step])

  useEffect(() => {
    if (!open || !step || activeTab !== step.tab) return
    setTargetRect(null)
    let target: HTMLElement | null = null
    let resizeObserver: ResizeObserver | null = null
    const update = () => {
      target = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
      if (!target) return
      const rect = target.getBoundingClientRect()
      setTargetRect({ top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height })
    }
    const observer = new MutationObserver(update)
    observer.observe(document.body, { childList: true, subtree: true })
    const frame = window.requestAnimationFrame(() => {
      update()
      target?.scrollIntoView({ behavior: "smooth", block: "center" })
      update()
      if (target && "ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(update)
        resizeObserver.observe(target)
      }
    })
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      resizeObserver?.disconnect()
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [activeTab, open, step])

  useEffect(() => {
    if (!open) return
    headingRef.current?.focus({ preventScroll: true })
    const observer = calloutRef.current && "ResizeObserver" in window
      ? new ResizeObserver(([entry]) => setCalloutHeight(entry.contentRect.height))
      : null
    if (calloutRef.current) observer?.observe(calloutRef.current)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFinish()
      if (event.key === "Tab") {
        const buttons = calloutRef.current?.querySelectorAll<HTMLButtonElement>("button")
        if (!buttons?.length) return
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      observer?.disconnect()
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [activeStep, onFinish, open])

  if (!open || !step) return null

  const padding = 8
  const placementTop = targetRect
    ? targetRect.top > window.innerHeight / 2
      ? Math.max(12, targetRect.top - calloutHeight - 16)
      : Math.min(window.innerHeight - calloutHeight - 12, targetRect.bottom + 16)
    : Math.max(12, window.innerHeight - calloutHeight - 100)
  const complete = () => {
    if (activeStep === steps.length - 1) onFinish()
    else setActiveStep((value) => value + 1)
  }

  return (
    <div className="fixed inset-0 z-[80]" aria-label="Panduan fitur SIAGA Bunda">
      {!targetRect ? (
        <div className="absolute inset-0 bg-[#10221D]/65" aria-hidden="true" />
      ) : (
        <>
          <div className="absolute inset-x-0 top-0 bg-[#10221D]/65" style={{ height: Math.max(0, targetRect.top - padding) }} aria-hidden="true" />
          <div className="absolute left-0 bg-[#10221D]/65" style={{ top: targetRect.top - padding, width: Math.max(0, targetRect.left - padding), height: targetRect.height + padding * 2 }} aria-hidden="true" />
          <div className="absolute right-0 bg-[#10221D]/65" style={{ top: targetRect.top - padding, left: targetRect.right + padding, height: targetRect.height + padding * 2 }} aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 bg-[#10221D]/65" style={{ top: targetRect.bottom + padding }} aria-hidden="true" />
          <div className="absolute rounded-[20px] border-2 border-white bg-transparent" style={{ top: targetRect.top - padding, left: targetRect.left - padding, width: targetRect.width + padding * 2, height: targetRect.height + padding * 2 }} aria-hidden="true" />
        </>
      )}

      <section
        ref={calloutRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="walkthrough-title"
        className="fixed left-3 right-3 z-[82] mx-auto max-h-[min(300px,48dvh)] max-w-[420px] overflow-y-auto rounded-[24px] bg-[#FFFCF6] p-4 text-[#1D2B29] shadow-[0_12px_40px_rgba(16,34,29,0.24)] ring-1 ring-[#D9E7E2] sm:p-5"
        style={{ top: placementTop }}
      >
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#E2EFEA]" role="progressbar" aria-label="Progres panduan" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={activeStep + 1}>
          <div className="h-full rounded-full bg-[#4A6E54] transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }} />
        </div>
        <h2 id="walkthrough-title" ref={headingRef} tabIndex={-1} className="text-lg font-bold leading-snug outline-none">{step.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#33443F]">{step.description}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={onFinish} className="min-h-11 rounded-full px-3 text-sm font-semibold text-[#536961] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A6E54]">
            Lewati tur
          </button>
          <div className="flex gap-2">
            {activeStep > 0 && (
              <button type="button" onClick={() => setActiveStep((value) => value - 1)} className="min-h-11 rounded-full bg-white px-4 text-sm font-semibold text-[#33443F] ring-1 ring-[#D9E7E2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A6E54]">
                Kembali
              </button>
            )}
            <button type="button" onClick={complete} className="min-h-11 rounded-full bg-[#4A6E54] px-5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D2B29]">
              {activeStep === steps.length - 1 ? "Selesai" : "Lanjut"}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
