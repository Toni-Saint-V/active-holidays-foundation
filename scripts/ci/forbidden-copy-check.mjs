import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..', '..')

const FORBIDDEN = [
  'шанс одобрения',
  'вероятность визы',
  'гарантия визы',
  'гарантирован',
  'ai решил',
  'ии решил',
  'точно получите визу',
  '100% одобрен',
  'решено',
  'validated',
  'verified by consulate',
  'real-time alerts',
  'realtime alerts',
  'обновлено сегодня',
  'источник консульства',
  'движок',
  'engine',
  'rule engine',
  'rdc v1',
  'confidence breakdown',
  'confidence score',
  'ruleset',
  'policy engine',
  'decision engine',
  'inference',
  'model output',
  'expert verified',
]

const TARGET_DIRS = ['src/app', 'src/components', 'src/lib']
const TARGET_EXTENSIONS = new Set(['.ts', '.tsx', '.md'])
const EXCLUDED_FILES = new Set([
  'src/app/AppShell.tsx',
  'src/app/router.tsx',
  'src/lib/forbiddenCopy.ts',
])

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, out)
      continue
    }
    if (TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(fullPath)
    }
  }
  return out
}

function isTargetFile(filePath) {
  const normalized = filePath.split(path.sep).join('/')

  if (EXCLUDED_FILES.has(normalized)) return false

  if (normalized.startsWith('src/components/')) return true
  if (normalized.startsWith('src/lib/')) return true
  if (normalized.startsWith('src/app/')) return true

  return false
}

function extractHumanText(source, ext) {
  if (ext === '.md') return source

  const stringLiterals = []
  const quoteRegex = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g
  let match = quoteRegex.exec(source)
  while (match) {
    stringLiterals.push(match[2])
    match = quoteRegex.exec(source)
  }

  const jsxText = []
  const jsxRegex = />\s*([^<>{][^<]*)\s*</g
  match = jsxRegex.exec(source)
  while (match) {
    jsxText.push(match[1])
    match = jsxRegex.exec(source)
  }

  return `${stringLiterals.join('\n')}\n${jsxText.join('\n')}`
}

const violations = []

for (const relDir of TARGET_DIRS) {
  const absDir = path.join(root, relDir)
  const files = walk(absDir)
  for (const file of files) {
    const rel = path.relative(root, file)
    if (!isTargetFile(rel)) continue

    const ext = path.extname(file)
    const source = fs.readFileSync(file, 'utf8')
    const humanText = extractHumanText(source, ext).toLowerCase()

    for (const term of FORBIDDEN) {
      if (!humanText.includes(term)) continue
      violations.push({ file: path.relative(root, file), term })
    }
  }
}

if (violations.length > 0) {
  console.error('[FAIL] Forbidden copy found:')
  for (const violation of violations) {
    console.error(`- ${violation.file}: "${violation.term}"`)
  }
  process.exit(1)
}

console.log('[OK] forbidden-copy check passed')
