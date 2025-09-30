import { Storage } from '@google-cloud/storage'
import logger from './logger'

const storage = new Storage()
let whitelistedIPs: Set<string> = new Set()

type WhitelistEntry = {
  ip: string
  description: string
  date_added: string
  reason_added: string
}

export async function loadWhitelist() {
  try {
    const bucket = storage.bucket('gnomad-browser')
    const file = bucket.file('whitelist.json')
    const [contents] = await file.download()
    const data = JSON.parse(contents.toString())
    whitelistedIPs = new Set(data.whitelisted_ips.map((entry: WhitelistEntry) => entry.ip))
    logger.info(`Loaded ${whitelistedIPs.size} IPs from the whitelist.`)
  } catch (err) {
    logger.error(`Failed to load whitelist: ${err}.`)
  }
}

export function isWhitelistedIP(ip: string): boolean {
  return whitelistedIPs.has(ip)
}
