#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = join(fileURLToPath(import.meta.url), '../../..')
const forbidden = [
  'шанс одобрения', 'вероятность визы', 'гарантия визы', 'гарантирован',
  'AI решил', 'ИИ решил', 'точно получите визу', '100% одобрен',
  'решено', 'validated', 'verified by consulate',
  'real-time alerts', 'realtime alerts', 'обновлено сегодня', 'источник консульства',
  'движок', 'engine', 'rule engine', 'RDC v1',
  'confidence breakdown', 'confidence score', 'ruleset', 'policy engine',
  'decision engine', 'inference', 'model output', 'expert verified',
]

const files = execFileSync('git', ['ls-files', 'src/**/*.{ts,tsx,md}'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)

const offenders = []
for (const file of files) {
  const text = readFileSync(join(root, file), 'utf8')
  for (const token of forbidden) {
    if (text.toLowerCase().includes(token.toLowerCase())) {
      offenders.push(`${file}: ${token}`)
    }
  }
}

if (offenders.length > 0) {
  console.error('Forbidden copy found:')
  for (const offender of offenders) console.error(`- ${offender}`)
  process.exit(1)
}

console.log('Forbidden copy check passed.')
