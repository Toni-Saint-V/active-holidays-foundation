import { spawn, type ChildProcess } from 'node:child_process'
import { access, mkdir } from 'node:fs/promises'
import path from 'node:path'

export const UI_REPORT_DIR = path.join(process.cwd(), 'reports', 'ui')
export const MOBILE_VIEWPORT = { width: 390, height: 844 }
export const BASE_URL = process.env.UI_BASE_URL ?? 'http://127.0.0.1:3100'

export type ScreenMetrics = {
  path: string
  route: string
  screenshotPath: string
  mainCtaVisible: boolean
  firstViewportFit: boolean
  carouselDotsVisible: boolean
  carouselNextPeekVisible: boolean
  preResultModalExists: boolean
  preResultOnExpectedPath: boolean
  preResultModalIsNativeAlert: boolean
  textDensityRisk: 'low' | 'medium' | 'high'
  forbiddenPatterns: {
    accordion: boolean
    bottomSheet: boolean
    hoverOnlyInteraction: boolean
    cardWall: boolean
  }
  layout: {
    scrollHeight: number
    viewportHeight: number
    ctaY: number | null
    ctaHeight: number | null
    headerBadgeVisible: boolean
  }
}

export type PlaywrightModule = {
  chromium: {
    launch: (options?: Record<string, unknown>) => Promise<any>
  }
}

export function parseArg(name: string): string | null {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`))
  if (inline) {
    return inline.slice(name.length + 1)
  }
  const index = process.argv.indexOf(name)
  if (index === -1) return null
  return process.argv[index + 1] ?? null
}

export function hasFlag(name: string): boolean {
  return process.argv.includes(name)
}

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true })
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function isServerUp(url: string): Promise<boolean> {
  try {
    await fetch(url, { method: 'GET', redirect: 'manual' })
    // Any HTTP response means the target is occupied by a running server.
    return true
  } catch {
    return false
  }
}

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerUp(url)) return
    await sleep(900)
  }
  throw new Error(`Dev server did not become ready at ${url} within ${timeoutMs}ms`)
}

function terminateProcessTree(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.killed) {
      resolve()
      return
    }

    const done = () => resolve()
    child.once('exit', done)
    child.kill('SIGTERM')

    setTimeout(() => {
      if (child.exitCode === null) {
        child.kill('SIGKILL')
      }
    }, 5000)
  })
}

export async function withDevServer<T>(fn: () => Promise<T>): Promise<T> {
  const reuseExisting = process.env.UI_REUSE_SERVER === '1'
  const serverAlreadyUp = await isServerUp(BASE_URL)

  if (reuseExisting && serverAlreadyUp) {
    return fn()
  }

  if (!reuseExisting && serverAlreadyUp) {
    throw new Error(
      [
        `BASE_URL ${BASE_URL} is already occupied by a running server.`,
        'Refusing to run UI automation against a potentially wrong target.',
        'Either stop that process or run with UI_REUSE_SERVER=1 if you intentionally want to reuse it.',
      ].join(' ')
    )
  }

  const parsedUrl = new URL(BASE_URL)
  const host = parsedUrl.hostname || '127.0.0.1'
  const port = parsedUrl.port || '3100'

  const child = spawn(
    'npm',
    ['run', 'dev', '--', '--hostname', host, '--port', port],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )

  let bootLog = ''
  const append = (chunk: Buffer) => {
    bootLog += chunk.toString('utf8')
    if (bootLog.length > 6000) {
      bootLog = bootLog.slice(-6000)
    }
  }

  child.stdout.on('data', append)
  child.stderr.on('data', append)

  try {
    await waitForServer(BASE_URL, 120_000)
    return await fn()
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to run with local dev server: ${details}\n--- boot log tail ---\n${bootLog}`)
  } finally {
    await terminateProcessTree(child)
  }
}

export async function loadPlaywright(): Promise<PlaywrightModule> {
  try {
    const module = await import('playwright')
    return module as PlaywrightModule
  } catch {
    throw new Error(
      'Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium'
    )
  }
}

export function resolveUiPath(...segments: string[]): string {
  return path.join(UI_REPORT_DIR, ...segments)
}
