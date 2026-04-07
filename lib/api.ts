import { ActionResponse, DomainsResponse } from "@/types"

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    })
    const data = await res.json()
    if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), data)
    return data
}

export const api = {
    // Blocked
    getBlocked: (search?: string) => {
        const qs = search ? `?search=${encodeURIComponent(search)}` : ""
        return request<DomainsResponse>(`/api/blocked-domains${qs}`)
    },
    addBlocked: (domain: string, note?: string) =>
        request<ActionResponse>("/api/blocked-domains", {
            method: "POST",
            body: JSON.stringify({ domain, note }),
        }),
    removeBlocked: (id: number) =>
        request<ActionResponse>(`/api/blocked-domains/${id}`, { method: "DELETE" }),

    // Whitelisted
    getWhitelisted: (search?: string) => {
        const qs = search ? `?search=${encodeURIComponent(search)}` : ""
        return request<DomainsResponse>(`/api/whitelisted-domains${qs}`)
    },
    addWhitelisted: (domain: string, note?: string) =>
        request<ActionResponse>("/api/whitelisted-domains", {
            method: "POST",
            body: JSON.stringify({ domain, note }),
        }),
    removeWhitelisted: (id: number) =>
        request<ActionResponse>(`/api/whitelisted-domains/${id}`, { method: "DELETE" }),
}