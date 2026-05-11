import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  BASE_URL,
  MOBILE_VIEWPORT,
  UI_REPORT_DIR,
  ensureDir,
  hasFlag,
  loadPlaywright,
  resolveUiPath,
  type ScreenMetrics,
  withDevServer,
} from './shared'

type ScreenConfig = {
  key: string
  route: string
  screenshot: string
  ctaSelectors: string[]
  expectViewportFit: boolean
}

const SCREEN_CONFIGS: ScreenConfig[] = [
  {
    key: 'screen-01 mobile',
    route: '/',
    screenshot: 'screen-01-mobile.png',
    ctaSelectors: ['[data-testid="primary-cta"]'],
    expectViewportFit: true,
  },
  {
    key: 'intake mobile',
    route: '/intake?country=IT',
    screenshot: 'intake-mobile.png',
    ctaSelectors: ['[data-testid="intake-primary-cta"]'],
    expectViewportFit: false,
  },
  {
    key: 'pre-result modal',
    route: '/calculating?country=IT&departure=2026-06-10&return=2026-06-24&purpose=Туризм&freeze=1',
    screenshot: 'pre-result-modal.png',
    ctaSelectors: [],
    expectViewportFit: true,
  },
  {
    key: 'result-preliminary',
    route: '/result?country=IT&days=24&verdict=GO_WITH_CONDITIONS&purpose=Туризм',
    screenshot: 'result-preliminary.png',
    ctaSelectors: ['[data-testid="result-primary-cta-wrap"] button', 'button.ah-amber-cta'],
    expectViewportFit: true,
  },
  {
    key: 'result-verified',
    route: '/result?country=IT&days=24&verdict=GO&purpose=Туризм',
    screenshot: 'result-verified.png',
    ctaSelectors: ['[data-testid="result-primary-cta-wrap"] button', 'button.ah-amber-cta'],
    expectViewportFit: true,
  },
]

type EvaluatePayload = {
  ctaSelectors: string[]
  expectViewportFit: boolean
  screenKey: string
}

const EVALUATE_SOURCE = `
  const isVisible = (element) => {
    if (!element) return false
    const rect = element.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return false
    const style = window.getComputedStyle(element)
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return false
    return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth
  }

  const pickVisible = (selectors) => {
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (isVisible(element)) return element
    }
    return null
  }

  const ctaElement = pickVisible(payload.ctaSelectors)
  const ctaRect = ctaElement?.getBoundingClientRect() ?? null

  const modal = document.querySelector('[data-testid="pre-result-modal"], [role="dialog"][aria-modal="true"]')
  const isPreResultScreen = payload.screenKey === 'pre-result modal'
  const preResultOnExpectedPath = !isPreResultScreen || window.location.pathname.startsWith('/calculating')
  const preResultModalExists = Boolean(modal) && preResultOnExpectedPath
  const dots = document.querySelector('[data-testid="result-carousel-dots"]')
  const dotsVisible = isVisible(dots) && (dots?.children.length ?? 0) > 1

  const viewport = document.querySelector('[data-testid="result-carousel-viewport"]')
  const cards = Array.from(document.querySelectorAll('[data-testid^="result-card-"]'))
  let peekVisible = false
  if (viewport && cards.length > 1) {
    const viewportRect = viewport.getBoundingClientRect()
    const secondCardRect = cards[1].getBoundingClientRect()
    peekVisible = secondCardRect.left < viewportRect.right && secondCardRect.right > viewportRect.right
  }

  const collectVisibleText = () => {
    const nodes = Array.from(document.querySelectorAll('h1,h2,h3,p,button,a,span,li,label'))
    const chunks = []
    for (const node of nodes) {
      if (!isVisible(node)) continue
      const rect = node.getBoundingClientRect()
      if (rect.top > window.innerHeight || rect.bottom < 0) continue
      const text = (node.textContent ?? '').replace(/\\s+/g, ' ').trim()
      if (!text) continue
      chunks.push(text)
    }
    return chunks.join(' ')
  }

  const bodyText = collectVisibleText()
  const charsPerPixel = bodyText.length / Math.max(1, window.innerWidth * window.innerHeight)

  const accordionDetected = Boolean(document.querySelector('details, summary, [data-ui-pattern="accordion"]'))
  const bottomSheetDetected = Boolean(
    document.querySelector('[data-ui-pattern="bottom-sheet"], .bottom-sheet, [data-bottom-sheet="true"], [role="dialog"][data-placement="bottom"]')
  )
  const hoverOnlyDetected = Boolean(
    document.querySelector('[onmouseover]:not([onclick]):not([role="button"]):not(a):not(button), [data-hover-only="true"]')
  )

  const explicitCardWall = Boolean(document.querySelector('[data-ui-pattern="card-wall"]'))
  const checkResultWall = payload.screenKey.startsWith('result-')
  const possibleCardContainers = checkResultWall
    ? Array.from(document.querySelectorAll('section, div')).filter((node) => {
        if (node.closest('[data-testid="country-rail"]')) return false
        if (node.closest('[data-testid="result-carousel-viewport"]')) return false
        const className = node.className
        if (typeof className !== 'string') return false
        return /grid|cards|card/.test(className)
      })
    : []
  const heuristicCardWall = possibleCardContainers.some((container) => {
    const children = Array.from(container.children).filter((child) => isVisible(child))
    if (children.length < 4) return false
    const scrollWidth = container.scrollWidth
    const clientWidth = container.clientWidth
    return scrollWidth <= clientWidth + 8
  })
  const cardWallDetected = explicitCardWall || heuristicCardWall

  const firstViewportFit = payload.expectViewportFit
    ? document.documentElement.scrollHeight <= window.innerHeight * 1.18
    : true

  const headerBadge = document.querySelector('[data-testid="result-header-badge"]')
  const nativeAlertCalls = Number((window.__nativeAlertCalls ?? 0))

  return {
    mainCtaVisible: Boolean(ctaElement),
    firstViewportFit,
    carouselDotsVisible: dotsVisible,
    carouselNextPeekVisible: peekVisible,
    preResultModalExists,
    preResultOnExpectedPath,
    preResultModalIsNativeAlert: nativeAlertCalls > 0,
    textDensityPerPixel: charsPerPixel,
    forbiddenPatterns: {
      accordion: accordionDetected,
      bottomSheet: bottomSheetDetected,
      hoverOnlyInteraction: hoverOnlyDetected,
      cardWall: cardWallDetected,
    },
    layout: {
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      ctaY: ctaRect ? Math.round(ctaRect.top) : null,
      ctaHeight: ctaRect ? Math.round(ctaRect.height) : null,
      headerBadgeVisible: isVisible(headerBadge),
    },
  }
`

function classifyTextDensity(charactersPerPixel: number): 'low' | 'medium' | 'high' {
  if (charactersPerPixel >= 0.0016) return 'high'
  if (charactersPerPixel >= 0.0011) return 'medium'
  return 'low'
}

function formatBool(value: boolean): string {
  return value ? 'yes' : 'no'
}

async function run(): Promise<void> {
  const baselineMode = hasFlag('--baseline')
  const outputDir = baselineMode ? resolveUiPath('baseline') : UI_REPORT_DIR
  await ensureDir(outputDir)

  const metrics: ScreenMetrics[] = []

  await withDevServer(async () => {
    const playwright = await loadPlaywright()
    const browser = await playwright.chromium.launch({ headless: true })
    const context = await browser.newContext({ viewport: MOBILE_VIEWPORT })

    await context.addInitScript(() => {
      ;(window as unknown as { __nativeAlertCalls?: number }).__nativeAlertCalls = 0
      const originalAlert = window.alert
      window.alert = (...args: Parameters<typeof window.alert>) => {
        ;(window as unknown as { __nativeAlertCalls: number }).__nativeAlertCalls += 1
        return originalAlert(...args)
      }
    })

    const page = await context.newPage()

    try {
      for (const screen of SCREEN_CONFIGS) {
        const fullUrl = `${BASE_URL}${screen.route}`
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded' })

        if (screen.key === 'pre-result modal') {
          await page.waitForTimeout(120)
        } else {
          await page.waitForLoadState('networkidle').catch(() => undefined)
        }

        const screenshotPath = path.join(outputDir, screen.screenshot)
        await page.screenshot({ path: screenshotPath, fullPage: true })

        const raw = await page.evaluate(
          ({ payload, source }: { payload: EvaluatePayload; source: string }) => {
            const runner = new Function('payload', source) as (payload: EvaluatePayload) => any
            return runner(payload)
          },
          {
            payload: {
              ctaSelectors: screen.ctaSelectors,
              expectViewportFit: screen.expectViewportFit,
              screenKey: screen.key,
            },
            source: EVALUATE_SOURCE,
          }
        )

        metrics.push({
          path: screen.key,
          route: screen.route,
          screenshotPath,
          mainCtaVisible: raw.mainCtaVisible,
          firstViewportFit: raw.firstViewportFit,
          carouselDotsVisible: raw.carouselDotsVisible,
          carouselNextPeekVisible: raw.carouselNextPeekVisible,
          preResultModalExists: raw.preResultModalExists,
          preResultOnExpectedPath: raw.preResultOnExpectedPath,
          preResultModalIsNativeAlert: raw.preResultModalIsNativeAlert,
          textDensityRisk: classifyTextDensity(raw.textDensityPerPixel),
          forbiddenPatterns: raw.forbiddenPatterns,
          layout: raw.layout,
        })
      }
    } finally {
      await context.close()
      await browser.close()
    }
  })

  const mdPath = path.join(outputDir, 'ui-screen-report.md')
  const jsonPath = path.join(outputDir, 'ui-screen-report.json')

  const lines: string[] = []
  lines.push('# UI Screen Lab Report')
  lines.push('')
  lines.push(`Generated at: ${new Date().toISOString()}`)
  lines.push(`Mode: ${baselineMode ? 'baseline' : 'current'}`)
  lines.push('')

  for (const item of metrics) {
    lines.push(`## ${item.path}`)
    lines.push(`- route: \`${item.route}\``)
    lines.push(`- screenshot: \`${item.screenshotPath}\``)
    lines.push(`- main CTA visible: ${formatBool(item.mainCtaVisible)}`)
    lines.push(`- first viewport fit: ${formatBool(item.firstViewportFit)}`)
    lines.push(`- carousel dots visible: ${formatBool(item.carouselDotsVisible)}`)
    lines.push(`- carousel next-card peek visible: ${formatBool(item.carouselNextPeekVisible)}`)
    lines.push(`- pre-result modal exists: ${formatBool(item.preResultModalExists)}`)
    lines.push(`- pre-result modal on expected path: ${formatBool(item.preResultOnExpectedPath)}`)
    lines.push(`- pre-result modal uses native alert: ${formatBool(item.preResultModalIsNativeAlert)}`)
    lines.push(`- text density risk: ${item.textDensityRisk}`)
    lines.push(`- forbidden accordion: ${formatBool(item.forbiddenPatterns.accordion)}`)
    lines.push(`- forbidden bottom sheet: ${formatBool(item.forbiddenPatterns.bottomSheet)}`)
    lines.push(`- forbidden hover-only interaction: ${formatBool(item.forbiddenPatterns.hoverOnlyInteraction)}`)
    lines.push(`- forbidden card wall: ${formatBool(item.forbiddenPatterns.cardWall)}`)
    lines.push('')
  }

  await writeFile(mdPath, `${lines.join('\n')}\n`, 'utf8')
  await writeFile(jsonPath, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8')

  const canonicalReportPath = resolveUiPath('ui-screen-report.md')
  const canonicalJsonPath = resolveUiPath('ui-screen-report.json')

  if (baselineMode) {
    await writeFile(
      resolveUiPath('baseline', 'README.txt'),
      'Baseline screenshots and report generated for visual diff reference.\n',
      'utf8'
    )
  } else {
    await writeFile(canonicalReportPath, `${lines.join('\n')}\n`, 'utf8')
    await writeFile(canonicalJsonPath, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8')
  }

  console.log(`Saved ${metrics.length} screenshots to ${outputDir}`)
  console.log(`Report: ${mdPath}`)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`ui:screen-lab failed: ${message}`)
  process.exit(1)
})
