"use client"

import { useEffect, useState, useCallback } from "react"
import { api } from "@/lib/api"
import { Domain } from "@/types"
import { Shield, Plus, Trash2, Search, RefreshCw, CheckCircle, XCircle, Upload, X, ChevronDown, ShieldCheck, ShieldOff } from "lucide-react"

type Toast = { id: number; msg: string; type: "success" | "error" | "warning" }
type Tab = "blocked" | "whitelisted"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function Home() {
  const [tab, setTab]                 = useState<Tab>("blocked")
  const [blocked, setBlocked]         = useState<Domain[]>([])
  const [whitelisted, setWhitelisted] = useState<Domain[]>([])
  const [filtered, setFiltered]       = useState<Domain[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState("")
  const [toasts, setToasts]           = useState<Toast[]>([])
  const [addDomain, setAddDomain]     = useState("")
  const [addNote, setAddNote]         = useState("")
  const [adding, setAdding]           = useState(false)
  const [bulkOpen, setBulkOpen]       = useState(false)
  const [bulkText, setBulkText]       = useState("")
  const [bulking, setBulking]         = useState(false)
  const [selected, setSelected]       = useState<Set<number>>(new Set())
  const [deleting, setDeleting]       = useState<Set<number>>(new Set())
  // Whitelist conflict alert
  const [conflictDomain, setConflictDomain] = useState<string | null>(null)
  const [conflictType, setConflictType]     = useState<"whitelisted" | "blocked" | null>(null)

  const toast = useCallback((msg: string, type: Toast["type"] = "success") => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [b, w] = await Promise.all([api.getBlocked(), api.getWhitelisted()])
      setBlocked(b.domains)
      setWhitelisted(w.domains)
    } catch {
      toast("Failed to fetch domains", "error")
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Filter active tab
  useEffect(() => {
    const source = tab === "blocked" ? blocked : whitelisted
    const q = search.toLowerCase()
    setFiltered(q ? source.filter(d => d.domain.includes(q) || (d.note || "").toLowerCase().includes(q)) : source)
    setSelected(new Set())
  }, [search, blocked, whitelisted, tab])

  // Switch tab → clear search
  function switchTab(t: Tab) { setTab(t); setSearch("") }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const domain = addDomain.trim().toLowerCase()
    if (!domain) return
    setAdding(true)
    try {
      if (tab === "blocked") {
        const res = await api.addBlocked(domain, addNote.trim())
        toast(`${res.domain} blocked — BIND reloaded`)
      } else {
        const res = await api.addWhitelisted(domain, addNote.trim())
        toast(res.message || `${domain} whitelisted`)
      }
      setAddDomain(""); setAddNote("")
      await fetchAll()
    } catch (err: unknown) {
      const e = err as { message?: string; whitelisted?: boolean; blocked?: boolean }
      if (e.whitelisted) {
        setConflictDomain(domain); setConflictType("whitelisted")
      } else if (e.blocked) {
        setConflictDomain(domain); setConflictType("blocked")
      } else {
        toast(e.message || "Failed to add", "error")
      }
    } finally { setAdding(false) }
  }

  async function handleRemove(id: number, domain: string) {
    setDeleting(d => new Set(d).add(id))
    try {
      if (tab === "blocked") {
        await api.removeBlocked(id)
        toast(`${domain} unblocked`)
      } else {
        await api.removeWhitelisted(id)
        toast(`${domain} removed from whitelist`)
      }
      await fetchAll()
      setSelected(s => { const n = new Set(s); n.delete(id); return n })
    } catch (err: unknown) {
      toast((err as Error).message || "Failed to remove", "error")
    } finally {
      setDeleting(d => { const n = new Set(d); n.delete(id); return n })
    }
  }

  async function handleBulkDelete() {
    for (const id of Array.from(selected)) {
      const domain = filtered.find(d => d.id === id)?.domain || ""
      await handleRemove(id, domain)
    }
    setSelected(new Set())
  }

  async function handleBulkAdd() {
    const lines = bulkText.split("\n").map(l => l.trim().toLowerCase()).filter(Boolean)
    if (!lines.length) return
    setBulking(true)
    let added = 0, failed = 0
    for (const domain of lines) {
      try {
        tab === "blocked" ? await api.addBlocked(domain, "bulk import") : await api.addWhitelisted(domain, "bulk import")
        added++
      } catch { failed++ }
    }
    toast(`Added: ${added}${failed ? ` | Failed: ${failed}` : ""}`, failed ? "error" : "success")
    setBulkText(""); setBulkOpen(false)
    await fetchAll()
    setBulking(false)
  }

  function toggleSelect(id: number) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    setSelected(s => s.size === filtered.length ? new Set() : new Set(filtered.map(d => d.id)))
  }

  const bulkLines = bulkText.split("\n").filter(l => l.trim()).length
  const isBlocked = tab === "blocked"

  return (
    <div className="min-h-screen bg-[#0d1117]">

      {/* Topbar */}
      <header className="bg-[#161b22] border-b border-[#30363d] h-14 flex items-center px-6 gap-3 sticky top-0 z-20">
        <div className="w-7 h-7 bg-[#238636] rounded-md flex items-center justify-center">
          <Shield size={14} className="text-white" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">DNS Block Manager</span>
        <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-[#1a3a1a] text-[#3fb950] border border-[#238636]">BIND9 RPZ</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[12px] text-[#7d8590]">{blocked.length} blocked · {whitelisted.length} whitelisted</span>
          <button onClick={fetchAll} className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Conflict alert */}
        {conflictDomain && (
          <div className="bg-[#2d1f00] border border-[#9e6a03] rounded-lg p-4 flex items-start gap-3">
            <ShieldOff size={16} className="text-[#d29922] shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-[#d29922] mb-1">
                {conflictType === "whitelisted" ? "Domain is whitelisted" : "Domain is blocked"}
              </div>
              <div className="text-[12px] text-[#e6edf3]">
                <span className="text-[#d29922]">{conflictDomain}</span>
                {conflictType === "whitelisted"
                  ? " is in the whitelist and cannot be blocked. Remove it from the whitelist first."
                  : " is currently blocked and cannot be whitelisted. Remove it from the blocklist first."}
              </div>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => { switchTab(conflictType === "whitelisted" ? "whitelisted" : "blocked"); setConflictDomain(null); setConflictType(null) }}
                  className="text-[12px] px-3 py-1.5 bg-[#9e6a03] hover:bg-[#d29922] text-white rounded-md transition-colors"
                >
                  Go to {conflictType === "whitelisted" ? "Whitelist" : "Blocklist"}
                </button>
                <button onClick={() => { setConflictDomain(null); setConflictType(null) }} className="text-[12px] text-[#7d8590] hover:text-[#e6edf3]">
                  Dismiss
                </button>
              </div>
            </div>
            <button onClick={() => { setConflictDomain(null); setConflictType(null) }} className="text-[#7d8590] hover:text-[#e6edf3]">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Blocked", value: blocked.length, color: "#f85149" },
            { label: "Total Whitelisted", value: whitelisted.length, color: "#3fb950" },
            { label: "Selected", value: selected.size, color: selected.size ? "#d29922" : "#7d8590" },
          ].map(s => (
            <div key={s.label} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
              <div className="text-[11px] text-[#7d8590] uppercase tracking-widest mb-1">{s.label}</div>
              <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#161b22] border border-[#30363d] rounded-lg p-1 w-fit">
          <button onClick={() => switchTab("blocked")}
            className={"flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium transition-colors " + (tab === "blocked" ? "bg-[#da3633] text-white" : "text-[#7d8590] hover:text-[#e6edf3]")}>
            <ShieldOff size={14} /> Blocklist ({blocked.length})
          </button>
          <button onClick={() => switchTab("whitelisted")}
            className={"flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium transition-colors " + (tab === "whitelisted" ? "bg-[#238636] text-white" : "text-[#7d8590] hover:text-[#e6edf3]")}>
            <ShieldCheck size={14} /> Whitelist ({whitelisted.length})
          </button>
        </div>

        {/* Add form */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
          <div className="px-5 py-3 border-b border-[#30363d] flex items-center gap-2 text-[13px] font-semibold">
            <div className={"w-2 h-2 rounded-full " + (isBlocked ? "bg-[#da3633]" : "bg-[#238636]")} />
            {isBlocked ? "Block a domain" : "Whitelist a domain"}
          </div>
          <form onSubmit={handleAdd} className="p-5 flex gap-3 flex-wrap">
            <input type="text" value={addDomain} onChange={e => setAddDomain(e.target.value)}
              placeholder={isBlocked ? "youtube.com" : "google.com"}
              className="flex-1 min-w-[180px] bg-[#0d1117] border border-[#30363d] rounded-md px-3 h-9 text-[13px] text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#388bfd]" />
            <input type="text" value={addNote} onChange={e => setAddNote(e.target.value)} placeholder="Note (optional)"
              className="w-44 bg-[#0d1117] border border-[#30363d] rounded-md px-3 h-9 text-[13px] text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#388bfd]" />
            <button type="submit" disabled={adding || !addDomain.trim()}
              className={"flex items-center gap-2 px-4 h-9 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-[13px] font-medium text-white transition-colors " + (isBlocked ? "bg-[#da3633] hover:bg-[#f85149]" : "bg-[#238636] hover:bg-[#2ea043]")}>
              <Plus size={14} /> {adding ? "Adding..." : (isBlocked ? "Block" : "Whitelist")}
            </button>
            <button type="button" onClick={() => setBulkOpen(o => !o)}
              className="flex items-center gap-2 px-4 h-9 bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] rounded-md text-[13px] transition-colors">
              <Upload size={14} /> Bulk import <ChevronDown size={12} className={"transition-transform " + (bulkOpen ? "rotate-180" : "")} />
            </button>
          </form>
          {bulkOpen && (
            <div className="px-5 pb-5 border-t border-[#30363d] pt-4 space-y-3">
              <div className="text-[12px] text-[#7d8590]">One domain per line</div>
              <textarea value={bulkText} onChange={e => setBulkText(e.target.value)}
                placeholder={"facebook.com\ntiktok.com\ninstagram.com"} rows={5}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[13px] text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#388bfd] resize-y" />
              <div className="flex items-center gap-3">
                <button onClick={handleBulkAdd} disabled={bulking || !bulkLines}
                  className={"flex items-center gap-2 px-4 h-9 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-[13px] font-medium text-white transition-colors " + (isBlocked ? "bg-[#da3633] hover:bg-[#f85149]" : "bg-[#238636] hover:bg-[#2ea043]")}>
                  {bulking ? "Importing..." : `Import ${bulkLines} domain${bulkLines !== 1 ? "s" : ""}`}
                </button>
                <button onClick={() => { setBulkOpen(false); setBulkText("") }} className="text-[12px] text-[#7d8590] hover:text-[#e6edf3]">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
          <div className="px-5 py-3 border-b border-[#30363d] flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <div className={"w-2 h-2 rounded-full " + (isBlocked ? "bg-[#da3633]" : "bg-[#238636]")} />
              {isBlocked ? "Blocked domains" : "Whitelisted domains"}
            </div>
            <div className="ml-auto flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7d8590]" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                  className="bg-[#0d1117] border border-[#30363d] rounded-md pl-8 pr-3 h-8 text-[12px] text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#388bfd] w-48" />
                {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7d8590] hover:text-[#e6edf3]"><X size={12} /></button>}
              </div>
              {selected.size > 0 && (
                <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 h-8 bg-[#da3633] hover:bg-[#f85149] rounded-md text-[12px] text-white transition-colors">
                  <Trash2 size={12} /> Remove {selected.size}
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#30363d]">
                  <th className="w-10 px-4 py-3 text-left">
                    <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} className="accent-[#238636]" />
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] text-[#7d8590] uppercase tracking-widest font-medium">Domain</th>
                  <th className="px-4 py-3 text-left text-[11px] text-[#7d8590] uppercase tracking-widest font-medium">Note</th>
                  <th className="px-4 py-3 text-left text-[11px] text-[#7d8590] uppercase tracking-widest font-medium">Added</th>
                  <th className="px-4 py-3 text-right text-[11px] text-[#7d8590] uppercase tracking-widest font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-16 text-[#7d8590]">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-16 text-[#7d8590]">
                    {search ? `No domains matching "${search}"` : (isBlocked ? "No domains blocked yet" : "No domains whitelisted yet")}
                  </td></tr>
                ) : filtered.map(d => (
                  <tr key={d.id} className={"border-b border-[#21262d] hover:bg-[#1c2128] transition-colors " + (selected.has(d.id) ? "bg-[#1a2a1a]" : "")}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleSelect(d.id)} className="accent-[#238636]" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isBlocked
                          ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3a1a1a] text-[#f85149] border border-[#da363344]">BLOCKED</span>
                          : <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a3a1a] text-[#3fb950] border border-[#23863644]">ALLOWED</span>
                        }
                        <span className="text-[#e6edf3]">{d.domain}</span>
                      </div>
                      {isBlocked && <div className="text-[11px] text-[#7d8590] mt-0.5">*.{d.domain} also blocked</div>}
                    </td>
                    <td className="px-4 py-3 text-[#7d8590]">{d.note || "—"}</td>
                    <td className="px-4 py-3 text-[#7d8590] whitespace-nowrap">{formatDate(d.added_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleRemove(d.id, d.domain)} disabled={deleting.has(d.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 ml-auto text-[12px] text-[#f85149] bg-[#21262d] border border-[#30363d] hover:bg-[#da3633] hover:text-white hover:border-[#da3633] disabled:opacity-40 rounded-md transition-colors">
                        <Trash2 size={12} /> {deleting.has(d.id) ? "Removing..." : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-[#30363d] text-[11px] text-[#7d8590]">
              Showing {filtered.length} of {(isBlocked ? blocked : whitelisted).length} domains{selected.size > 0 && ` — ${selected.size} selected`}
            </div>
          )}
        </div>

      </main>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 space-y-2 z-50">
        {toasts.map(t => (
          <div key={t.id} className={"flex items-center gap-3 px-4 py-3 rounded-lg bg-[#161b22] border text-[13px] shadow-lg " +
            (t.type === "success" ? "border-[#238636]" : t.type === "warning" ? "border-[#9e6a03]" : "border-[#da3633]")}>
            {t.type === "success" ? <CheckCircle size={14} className="text-[#3fb950] shrink-0" />
              : t.type === "warning" ? <ShieldOff size={14} className="text-[#d29922] shrink-0" />
              : <XCircle size={14} className="text-[#f85149] shrink-0" />}
            <span className="max-w-xs">{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}