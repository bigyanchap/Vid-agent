import { protocol } from 'electron'

const SCHEME = 'vidagent-clip'
const PREFIX = `${SCHEME}:///`

/** Register before BrowserWindow loads. Serves local mp4/png for <video src>. */
export function registerClipMediaProtocol(): void {
  protocol.registerFileProtocol(SCHEME, (request, callback) => {
    if (!request.url.startsWith(PREFIX)) {
      callback({ error: -2 })
      return
    }
    try {
      const filePath = decodeURIComponent(request.url.slice(PREFIX.length))
      callback({ path: filePath })
    } catch {
      callback({ error: -2 })
    }
  })
}

export function clipMediaUrlFromPath(absoluteFilePath: string): string {
  return `${PREFIX}${encodeURIComponent(absoluteFilePath)}`
}
