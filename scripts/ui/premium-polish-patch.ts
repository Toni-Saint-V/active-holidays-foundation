import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArg } from './shared'

const TARGET_SCREEN = parseArg('--screen')
const TARGET_FILE = path.join(process.cwd(), 'src', 'app', 'result', 'ResultPageClient.tsx')
const TEMPLATE_FILE = path.join(process.cwd(), 'scripts', 'ui', 'templates', 'result-polished-v1.tsx')

async function run(): Promise<void> {
  if (TARGET_SCREEN !== 'result') {
    throw new Error('Only --screen=result is supported in this patch.')
  }

  const currentSource = await readFile(TARGET_FILE, 'utf8')
  if (currentSource.includes('data-ui-polish="result-v1"')) {
    console.log('Result polish patch already applied. No changes made.')
    return
  }

  const requiredAnchors = [
    'function compactText(value: string | undefined, fallback: string, max = 84)',
    '<MockPreviewBadge />',
    '<details className="mt-3 text-[12px] text-muted-foreground">',
    '<section id="result-action-plan" className="mt-6 border-y border-primary/20 py-4">',
  ]

  const missingAnchors = requiredAnchors.filter((anchor) => !currentSource.includes(anchor))
  if (missingAnchors.length > 0) {
    throw new Error(
      `Cannot safely apply patch: unexpected result screen structure. Missing anchors: ${missingAnchors.join(', ')}`
    )
  }

  const nextSource = await readFile(TEMPLATE_FILE, 'utf8')
  if (!nextSource.includes('data-ui-polish="result-v1"')) {
    throw new Error('Patch template is invalid: marker data-ui-polish="result-v1" missing.')
  }

  await writeFile(TARGET_FILE, nextSource, 'utf8')
  console.log(`Applied premium result polish patch: ${TARGET_FILE}`)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`ui:premium-polish-patch failed: ${message}`)
  process.exit(1)
})
