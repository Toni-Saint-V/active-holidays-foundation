import { spawn } from 'node:child_process'
import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { ensureDir, pathExists, resolveUiPath } from './shared'

type Metrics = {
  path: string
  screenshotPath: string
  mainCtaVisible: boolean
  carouselDotsVisible: boolean
  carouselNextPeekVisible: boolean
  preResultModalExists: boolean
  preResultOnExpectedPath: boolean
  preResultModalIsNativeAlert: boolean
  layout: {
    scrollHeight: number
    ctaY: number | null
    headerBadgeVisible: boolean
  }
}

type PairDiff = {
  key: string
  baselinePath: string
  currentPath: string
  changedPixels: number
  totalPixels: number
  percentChanged: number
  baselineWidth: number
  baselineHeight: number
  currentWidth: number
  currentHeight: number
  dimensionMismatch: boolean
}

type BaselineMeta = {
  generatedAt?: string
  branch?: string
  commit?: string
  workingTreeDirty?: boolean
  command?: string
}

const TRACKED_FILES = [
  'screen-01-mobile.png',
  'intake-mobile.png',
  'pre-result-modal.png',
  'result-preliminary.png',
  'result-verified.png',
]

async function runCommand(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code ?? 'null'}`))
    })
    child.on('error', reject)
  })
}

function toRgbaLuma(r: number, g: number, b: number): number {
  return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)
}

async function comparePair(baselinePath: string, currentPath: string, diffPath?: string): Promise<PairDiff> {
  const baselineSharp = sharp(baselinePath).ensureAlpha()
  const baselineMeta = await baselineSharp.metadata()
  const currentSharp = sharp(currentPath).ensureAlpha()
  const currentMeta = await currentSharp.metadata()

  if (!baselineMeta.width || !baselineMeta.height) {
    throw new Error(`Cannot read dimensions: ${baselinePath}`)
  }
  if (!currentMeta.width || !currentMeta.height) {
    throw new Error(`Cannot read dimensions: ${currentPath}`)
  }

  const baselineWidth = baselineMeta.width
  const baselineHeight = baselineMeta.height
  const currentWidth = currentMeta.width
  const currentHeight = currentMeta.height
  const dimensionMismatch = baselineWidth !== currentWidth || baselineHeight !== currentHeight

  if (dimensionMismatch) {
    return {
      key: path.basename(currentPath),
      baselinePath,
      currentPath,
      changedPixels: 0,
      totalPixels: baselineWidth * baselineHeight,
      percentChanged: 0,
      baselineWidth,
      baselineHeight,
      currentWidth,
      currentHeight,
      dimensionMismatch: true,
    }
  }

  const baselineRaw = await baselineSharp.raw().toBuffer()
  const currentRaw = await currentSharp.raw().toBuffer()

  const diffRaw = Buffer.alloc(baselineRaw.length)
  let changedPixels = 0

  for (let i = 0; i < baselineRaw.length; i += 4) {
    const br = baselineRaw[i]
    const bg = baselineRaw[i + 1]
    const bb = baselineRaw[i + 2]

    const cr = currentRaw[i]
    const cg = currentRaw[i + 1]
    const cb = currentRaw[i + 2]

    const delta = Math.abs(br - cr) + Math.abs(bg - cg) + Math.abs(bb - cb)
    const changed = delta > 42

    if (changed) {
      changedPixels += 1
      diffRaw[i] = 255
      diffRaw[i + 1] = 99
      diffRaw[i + 2] = 71
      diffRaw[i + 3] = 230
      continue
    }

    const luma = toRgbaLuma(cr, cg, cb)
    diffRaw[i] = luma
    diffRaw[i + 1] = luma
    diffRaw[i + 2] = luma
    diffRaw[i + 3] = 170
  }

  if (diffPath) {
    await sharp(diffRaw, { raw: { width: baselineWidth, height: baselineHeight, channels: 4 } })
      .png()
      .toFile(diffPath)
  }

  const totalPixels = baselineWidth * baselineHeight
  return {
    key: path.basename(currentPath),
    baselinePath,
    currentPath,
    changedPixels,
    totalPixels,
    percentChanged: Number(((changedPixels / totalPixels) * 100).toFixed(2)),
    baselineWidth,
    baselineHeight,
    currentWidth,
    currentHeight,
    dimensionMismatch: false,
  }
}

function asMap(metrics: Metrics[]): Map<string, Metrics> {
  return new Map(metrics.map((item) => [item.path, item]))
}

async function run(): Promise<void> {
  const baselineAnchor = resolveUiPath('baseline', 'result-verified.png')
  let baselineCreated = false

  if (!(await pathExists(baselineAnchor))) {
    baselineCreated = true
    await runCommand('npm', ['run', 'ui:screen-lab', '--', '--baseline'])
  }

  await runCommand('npm', ['run', 'ui:screen-lab'])

  await ensureDir(resolveUiPath('baseline'))
  const diffImagePath = resolveUiPath('diff-result-mobile.png')
  await rm(diffImagePath, { force: true })

  const pairDiffs: PairDiff[] = []
  for (const file of TRACKED_FILES) {
    const baselineFile = resolveUiPath('baseline', file)
    const currentFile = resolveUiPath(file)

    if (!(await pathExists(baselineFile))) {
      throw new Error(`Baseline screenshot missing: ${baselineFile}`)
    }
    if (!(await pathExists(currentFile))) {
      throw new Error(`Current screenshot missing: ${currentFile}`)
    }

    const diffTarget = file === 'result-verified.png' ? diffImagePath : undefined
    const diff = await comparePair(baselineFile, currentFile, diffTarget)
    pairDiffs.push(diff)
  }

  const baselineMetrics = JSON.parse(
    await readFile(resolveUiPath('baseline', 'ui-screen-report.json'), 'utf8')
  ) as Metrics[]
  const currentMetrics = JSON.parse(await readFile(resolveUiPath('ui-screen-report.json'), 'utf8')) as Metrics[]

  const baselineMap = asMap(baselineMetrics)
  const currentMap = asMap(currentMetrics)

  const baseResult = baselineMap.get('result-verified')
  const currentResult = currentMap.get('result-verified')
  const currentLanding = currentMap.get('screen-01 mobile')
  const currentIntake = currentMap.get('intake mobile')
  const currentPreResult = currentMap.get('pre-result modal')
  if (!baseResult || !currentResult) {
    throw new Error('Missing result-verified metrics for visual diff checks.')
  }
  if (!currentLanding || !currentIntake) {
    throw new Error('Missing landing/intake metrics for visual diff checks.')
  }
  if (!currentPreResult) {
    throw new Error('Missing pre-result modal metrics for visual diff checks.')
  }

  const ctaMoved =
    baseResult.layout.ctaY !== null &&
    currentResult.layout.ctaY !== null &&
    Math.abs(baseResult.layout.ctaY - currentResult.layout.ctaY) > 10

  const dotsDisappeared = baseResult.carouselDotsVisible && !currentResult.carouselDotsVisible
  const peekDisappeared = baseResult.carouselNextPeekVisible && !currentResult.carouselNextPeekVisible
  const badgeDisappeared = baseResult.layout.headerBadgeVisible && !currentResult.layout.headerBadgeVisible
  const contentHeightIncreasedTooMuch =
    currentResult.layout.scrollHeight > Math.round(baseResult.layout.scrollHeight * 1.15)
  const ctaInvisible = !currentResult.mainCtaVisible
  const dotsMissingNow = !currentResult.carouselDotsVisible
  const peekMissingNow = !currentResult.carouselNextPeekVisible
  const badgeMissingNow = !currentResult.layout.headerBadgeVisible
  const preResultModalMissingNow = !currentPreResult.preResultModalExists
  const preResultPathMismatch = !currentPreResult.preResultOnExpectedPath
  const preResultUsesNativeAlertNow = currentPreResult.preResultModalIsNativeAlert

  const pairDiffMap = new Map(pairDiffs.map((pair) => [pair.key, pair]))
  const dimensionMismatchPairs = pairDiffs.filter((pair) => pair.dimensionMismatch)
  const landingDiffPercent = pairDiffMap.get('screen-01-mobile.png')?.percentChanged ?? 0
  const intakeDiffPercent = pairDiffMap.get('intake-mobile.png')?.percentChanged ?? 0
  const landingDiffTooHigh = landingDiffPercent > 3
  const intakeDiffTooHigh = intakeDiffPercent > 3
  const landingCtaInvisible = !currentLanding.mainCtaVisible
  const intakeCtaInvisible = !currentIntake.mainCtaVisible

  const reportPath = resolveUiPath('visual-diff-report.md')
  const metaPath = resolveUiPath('baseline', 'baseline-meta.json')
  let baselineMeta: BaselineMeta | null = null
  if (await pathExists(metaPath)) {
    baselineMeta = JSON.parse(await readFile(metaPath, 'utf8')) as BaselineMeta
  }
  const lines: string[] = []
  lines.push('# Visual Diff Report')
  lines.push('')
  lines.push(`Generated at: ${new Date().toISOString()}`)
  lines.push(`Baseline created this run: ${baselineCreated ? 'yes' : 'no'}`)
  if (baselineMeta) {
    lines.push(`Baseline meta: branch=${baselineMeta.branch ?? '<unknown>'}, commit=${baselineMeta.commit ?? '<unknown>'}, generatedAt=${baselineMeta.generatedAt ?? '<unknown>'}`)
  }
  lines.push('')
  lines.push('## Changed Pairs')
  for (const pair of pairDiffs) {
    if (pair.dimensionMismatch) {
      lines.push(
        `- ${pair.key}: DIMENSION_MISMATCH baseline=${pair.baselineWidth}x${pair.baselineHeight}, current=${pair.currentWidth}x${pair.currentHeight}`
      )
      continue
    }
    lines.push(`- ${pair.key}: ${pair.percentChanged}% (${pair.changedPixels}/${pair.totalPixels})`)
  }
  lines.push('')
  lines.push('## Result Checks')
  lines.push(`- CTA moved: ${ctaMoved ? 'yes' : 'no'}`)
  lines.push(`- CTA invisible now: ${ctaInvisible ? 'yes' : 'no'}`)
  lines.push(`- carousel dots disappeared: ${dotsDisappeared ? 'yes' : 'no'}`)
  lines.push(`- carousel dots missing now: ${dotsMissingNow ? 'yes' : 'no'}`)
  lines.push(`- next-card peek disappeared: ${peekDisappeared ? 'yes' : 'no'}`)
  lines.push(`- next-card peek missing now: ${peekMissingNow ? 'yes' : 'no'}`)
  lines.push(`- header badge disappeared: ${badgeDisappeared ? 'yes' : 'no'}`)
  lines.push(`- header badge missing now: ${badgeMissingNow ? 'yes' : 'no'}`)
  lines.push(`- content height increased too much: ${contentHeightIncreasedTooMuch ? 'yes' : 'no'}`)
  lines.push(`- pre-result modal missing now: ${preResultModalMissingNow ? 'yes' : 'no'}`)
  lines.push(`- pre-result path mismatch: ${preResultPathMismatch ? 'yes' : 'no'}`)
  lines.push(`- pre-result uses native alert: ${preResultUsesNativeAlertNow ? 'yes' : 'no'}`)
  lines.push(`- landing CTA invisible: ${landingCtaInvisible ? 'yes' : 'no'}`)
  lines.push(`- intake CTA invisible: ${intakeCtaInvisible ? 'yes' : 'no'}`)
  lines.push(`- landing diff too high (>3%): ${landingDiffTooHigh ? 'yes' : 'no'} (${landingDiffPercent}%)`)
  lines.push(`- intake diff too high (>3%): ${intakeDiffTooHigh ? 'yes' : 'no'} (${intakeDiffPercent}%)`)
  lines.push(`- dimension mismatch detected: ${dimensionMismatchPairs.length > 0 ? 'yes' : 'no'}`)
  lines.push('')
  const resultVerifiedPair = pairDiffMap.get('result-verified.png')
  if (resultVerifiedPair?.dimensionMismatch) {
    lines.push('Diff image: not generated because result-verified dimensions mismatch.')
  } else {
    lines.push(`Diff image: \`${diffImagePath}\``)
  }

  await writeFile(reportPath, `${lines.join('\n')}\n`, 'utf8')
  const hardFailures: string[] = []
  if (ctaInvisible) hardFailures.push('Main CTA is not visible on result screen.')
  if (dotsMissingNow || dotsDisappeared) hardFailures.push('Carousel dots are missing.')
  if (peekMissingNow || peekDisappeared) hardFailures.push('Next-card peek is missing.')
  if (badgeMissingNow || badgeDisappeared) hardFailures.push('Header badge is missing.')
  if (contentHeightIncreasedTooMuch) hardFailures.push('Content height increased beyond safe threshold.')
  if (preResultModalMissingNow) hardFailures.push('Pre-result modal is missing.')
  if (preResultPathMismatch) hardFailures.push('Pre-result modal check ran on unexpected route path.')
  if (preResultUsesNativeAlertNow) hardFailures.push('Pre-result still uses native alert.')
  if (landingCtaInvisible) hardFailures.push('Landing main CTA is not visible.')
  if (intakeCtaInvisible) hardFailures.push('Intake main CTA is not visible.')
  if (landingDiffTooHigh) hardFailures.push(`Landing diff exceeds threshold: ${landingDiffPercent}%.`)
  if (intakeDiffTooHigh) hardFailures.push(`Intake diff exceeds threshold: ${intakeDiffPercent}%.`)
  if (dimensionMismatchPairs.length > 0) {
    for (const pair of dimensionMismatchPairs) {
      hardFailures.push(
        `Dimension mismatch for ${pair.key}: baseline=${pair.baselineWidth}x${pair.baselineHeight}, current=${pair.currentWidth}x${pair.currentHeight}.`
      )
    }
  }

  if (hardFailures.length > 0) {
    throw new Error(`UI regression gates failed:\n- ${hardFailures.join('\n- ')}`)
  }

  console.log(`Visual diff report: ${reportPath}`)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`ui:visual-diff failed: ${message}`)
  process.exit(1)
})
