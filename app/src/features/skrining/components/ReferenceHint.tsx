export default function ReferenceHint({ text, warning }: { text: string; warning: boolean }) {
  return (
    <div className="mt-1.5 space-y-1 text-[11px] leading-snug text-[#33443F]">
      <p>{text}</p>
      {warning && <p role="status" aria-live="polite" className="font-semibold text-[#8A5B0A]">Di luar rentang acuan. Nilai tetap dapat disimpan.</p>}
    </div>
  )
}
