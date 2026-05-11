import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { UI_REPORT_DIR, resolveUiPath } from './shared'

type BaselineMeta = {
  generatedAt: string
  branch: string
  commit: string
  workingTreeDirty: boolean
  command: string
}

async function runCommand(command: string, args: string[], capture = false): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    })

    let stdout = ''
    let stderr = ''
    if (capture) {
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString('utf8')
      })
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString('utf8')
      })
    }

    child.on('exit', (code) => {
      if (code === 0) {
        resolve(stdout)
        return
      }
      const tail = capture ? `\n${stderr.trim()}` : ''
      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code ?? 'null'}${tail}`))
    })
    child.on('error', reject)
  })
}

async function readGitValue(args: string[], fallback: string): Promise<string> {
  try {
    const raw = await runCommand('git', args, true)
    const value = raw.trim()
    return value.length > 0 ? value : fallback
  } catch {
    return fallback
  }
}

async function run(): Promise<void> {
  await mkdir(path.join(UI_REPORT_DIR, 'baseline'), { recursive: true })

  await runCommand('npm', ['run', 'ui:screen-lab', '--', '--baseline'])

  const branch = await readGitValue(['rev-parse', '--abbrev-ref', 'HEAD'], '<unknown>')
  const commit = await readGitValue(['rev-parse', 'HEAD'], '<unknown>')
  const dirtyOut = await readGitValue(['status', '--porcelain'], '')
  const workingTreeDirty = dirtyOut.length > 0

  const meta: BaselineMeta = {
    generatedAt: new Date().toISOString(),
    branch,
    commit,
    workingTreeDirty,
    command: 'npm run ui:screen-lab -- --baseline',
  }

  const metaPath = resolveUiPath('baseline', 'baseline-meta.json')
  await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8')

  console.log(`Baseline refreshed: ${metaPath}`)
  console.log(`Branch: ${meta.branch}`)
  console.log(`Commit: ${meta.commit}`)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`ui:baseline:refresh failed: ${message}`)
  process.exit(1)
})
