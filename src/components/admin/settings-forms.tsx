"use client";

import { useActionState, useState } from "react";
import { saveSettings, testRazorpayAction, testShiprocket, type SaveResult, type SettingsSection } from "@/app/actions/admin";

const input = "w-full rounded-lg border border-admin-line bg-white px-3 py-2 text-sm outline-none focus:border-admin-accent";

export function Section({ id, title, hint, children }: { id: string; title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-2xl bg-admin-card border border-admin-line">
      <div className="px-6 py-4 border-b border-admin-line">
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-sm text-admin-muted mt-0.5">{hint}</p>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

/** One settings group = one form, saved independently. */
export function SettingsForm({ section, children }: { section: SettingsSection; children: React.ReactNode }) {
  const [state, action, pending] = useActionState<SaveResult, FormData>(saveSettings.bind(null, section), {});
  return (
    <form action={action} className="space-y-4">
      {children}
      <div className="flex items-center gap-3 pt-2">
        <button disabled={pending} className="rounded-lg bg-admin-accent text-white px-4 py-2 text-sm font-medium disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
        {state.error && <p className="text-sm text-admin-red">{state.error}</p>}
        {state.ok && !pending && <p className="text-sm text-admin-green">Saved — live on the store now.</p>}
      </div>
    </form>
  );
}

export function Field({ label, name, defaultValue, suffix, prefix, help, type = "text", step }: { label: string; name: string; defaultValue?: string | number | null; suffix?: string; prefix?: string; help?: string; type?: string; step?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      <span className="flex items-center gap-2">
        {prefix && <span className="text-sm text-admin-muted">{prefix}</span>}
        <input name={name} type={type} step={step} defaultValue={defaultValue ?? ""} className={input} />
        {suffix && <span className="text-sm text-admin-muted whitespace-nowrap">{suffix}</span>}
      </span>
      {help && <span className="block text-xs text-admin-muted mt-1">{help}</span>}
    </label>
  );
}

export function Toggle({ label, name, defaultChecked, help }: { label: string; name: string; defaultChecked: boolean; help?: string }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-4 accent-[var(--color-admin-accent)]" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {help && <span className="block text-xs text-admin-muted mt-0.5">{help}</span>}
      </span>
    </label>
  );
}

export function ShiprocketTest() {
  const [state, action, pending] = useActionState(testShiprocket, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input name="pincode" inputMode="numeric" maxLength={6} placeholder="Test pincode, e.g. 560001" className={`${input} max-w-48`} />
      <button disabled={pending} className="rounded-lg border border-admin-line bg-white px-4 py-2 text-sm font-medium hover:border-admin-accent disabled:opacity-60">
        {pending ? "Checking…" : "Test connection"}
      </button>
      {state.ok && <p className="w-full text-sm text-admin-green">{state.ok}</p>}
      {state.error && <p className="w-full text-sm text-admin-red">{state.error}</p>}
    </form>
  );
}

export function Select({ label, name, defaultValue, options, help }: { label: string; name: string; defaultValue: string; options: { value: string; label: string }[]; help?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      <select name={name} defaultValue={defaultValue} className={input}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {help && <span className="block text-xs text-admin-muted mt-1">{help}</span>}
    </label>
  );
}

export function TextArea({ label, name, defaultValue, help, rows = 3 }: { label: string; name: string; defaultValue?: string; help?: string; rows?: number }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      <textarea name={name} rows={rows} defaultValue={defaultValue ?? ""} className={input} />
      {help && <span className="block text-xs text-admin-muted mt-1">{help}</span>}
    </label>
  );
}

/** A value to paste into another dashboard (webhook URLs), with a copy button. */
export function CopyValue({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div>
      <span className="block text-sm font-medium mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded-lg bg-admin-bg px-3 py-2 text-xs">{value}</code>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(value).then(() => (setDone(true), setTimeout(() => setDone(false), 1500)))}
          className="rounded-lg border border-admin-line bg-white px-3 py-2 text-xs font-medium hover:border-admin-accent"
        >
          {done ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function RazorpayTest() {
  const [state, action, pending] = useActionState(testRazorpayAction, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <button disabled={pending} className="rounded-lg border border-admin-line bg-white px-4 py-2 text-sm font-medium hover:border-admin-accent disabled:opacity-60">
        {pending ? "Checking…" : "Test connection"}
      </button>
      {state.ok && <p className="text-sm text-admin-green">{state.ok}</p>}
      {state.error && <p className="text-sm text-admin-red">{state.error}</p>}
    </form>
  );
}

export function Status({ ok, children }: { ok: boolean | "warn"; children: React.ReactNode }) {
  const c = ok === true ? "bg-admin-green-bg text-admin-green" : ok === "warn" ? "bg-admin-yellow-bg text-admin-yellow" : "bg-admin-red-bg text-admin-red";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c}`}>{children}</span>;
}
