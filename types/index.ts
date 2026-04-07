export interface Domain {
  id: number
  domain: string
  added_at: string
  note: string | null
}

export interface DomainsResponse {
  count: number
  domains: Domain[]
}

export interface ActionResponse {
  success: boolean
  id?: number
  domain?: string
  bind_reloaded?: boolean
  message: string
  error?: string
  whitelisted?: boolean
  blocked?: boolean
}