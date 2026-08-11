import { expect, type Locator, type Page } from '@playwright/test'

export const LR_TRANSITION_MAX_DISPLACEMENT_PX = 2
export const LR_HAPLOTYPE_VIEWPORT_HEIGHT_PX = 500

export type GeometrySnapshot = {
  shellHeight?: number
  viewModeY: number
  searchY: number
  groupingY?: number
}

type WorkerGateState = {
  holding: boolean
  observed: string[]
  delivered: string[]
  held: { type: string; deliver: () => void }[]
  hold: () => void
  release: () => void
}

type WindowWithWorkerGate = Window &
  typeof globalThis & {
    __lrWorkerReadyGate?: WorkerGateState
    __lrDocumentToken?: string
  }

/**
 * Hold worker READY/UPDATED messages at the browser boundary. This lets a test
 * inspect the REST-pending, worker-pending, and ready layouts deterministically
 * without replacing the application worker implementation.
 */
export async function installWorkerReadyGate(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const contractWindow = window as WindowWithWorkerGate
    contractWindow.__lrDocumentToken = `lr-contract-${Math.random()}`

    const gate: WorkerGateState = {
      holding: true,
      observed: [],
      delivered: [],
      held: [],
      hold() {
        this.holding = true
      },
      release() {
        this.holding = false
        const messages = this.held.splice(0)
        messages.forEach(({ deliver }) => deliver())
      },
    }
    contractWindow.__lrWorkerReadyGate = gate

    const NativeWorker = window.Worker
    const ContractWorker = function (...args: ConstructorParameters<typeof Worker>) {
      const worker = Reflect.construct(NativeWorker, args) as Worker
      let listener: ((this: Worker, event: MessageEvent) => unknown) | null = null
      let wrappedListener: ((event: MessageEvent) => void) | null = null

      Object.defineProperty(worker, 'onmessage', {
        configurable: true,
        get: () => listener,
        set: (nextListener: ((this: Worker, event: MessageEvent) => unknown) | null) => {
          if (wrappedListener) worker.removeEventListener('message', wrappedListener)
          listener = nextListener
          wrappedListener = nextListener
            ? (event: MessageEvent) => {
                const type = String(event.data?.type || 'UNKNOWN')
                if (type !== 'READY' && type !== 'UPDATED') {
                  nextListener.call(worker, event)
                  return
                }

                gate.observed.push(type)
                const deliver = () => {
                  gate.delivered.push(type)
                  nextListener.call(worker, event)
                }
                if (gate.holding) gate.held.push({ type, deliver })
                else deliver()
              }
            : null
          if (wrappedListener) worker.addEventListener('message', wrappedListener)
        },
      })
      return worker
    }

    ContractWorker.prototype = NativeWorker.prototype
    Object.defineProperty(window, 'Worker', {
      configurable: true,
      writable: true,
      value: ContractWorker,
    })
  })
}

export async function workerGateHold(page: Page): Promise<void> {
  await page.evaluate(() => (window as WindowWithWorkerGate).__lrWorkerReadyGate?.hold())
}

export async function workerGateRelease(page: Page): Promise<void> {
  await page.evaluate(() => (window as WindowWithWorkerGate).__lrWorkerReadyGate?.release())
}

export async function waitForHeldWorkerMessage(page: Page, type: 'READY' | 'UPDATED') {
  await expect
    .poll(() =>
      page.evaluate(
        (messageType) =>
          (window as WindowWithWorkerGate).__lrWorkerReadyGate?.held.some(
            (message) => message.type === messageType
          ) || false,
        type
      )
    )
    .toBe(true)
}

export async function documentToken(page: Page): Promise<string | undefined> {
  return page.evaluate(() => (window as WindowWithWorkerGate).__lrDocumentToken)
}

const requiredBox = async (locator: Locator, name: string) => {
  const box = await locator.boundingBox()
  expect(box, `${name} should have a layout box`).not.toBeNull()
  return box!
}

export async function captureLrGeometry(
  page: Page,
  shell?: Locator,
  includeGrouping = false
): Promise<GeometrySnapshot> {
  const [shellBox, viewModeBox, searchBox, groupingBox] = await Promise.all([
    shell ? requiredBox(shell, 'long-read view shell') : Promise.resolve(undefined),
    requiredBox(page.locator('#lr-view-mode'), 'view mode control'),
    requiredBox(page.getByRole('textbox', { name: 'Filter long-read variants' }), 'variant search'),
    includeGrouping
      ? requiredBox(page.locator('#grouping-mode'), 'grouping control')
      : Promise.resolve(undefined),
  ])

  // Playwright boxes are viewport-relative. Focus moves can legitimately scroll
  // controls into view, so normalize Y coordinates into document space before
  // comparing layout displacement.
  const scrollY = await page.evaluate(() => window.scrollY)

  if (shellBox) {
    expect(shellBox.height, 'long-read view shell should have the canonical fixed height').toBe(
      LR_HAPLOTYPE_VIEWPORT_HEIGHT_PX
    )
  }

  return {
    ...(shellBox ? { shellHeight: shellBox.height } : {}),
    viewModeY: viewModeBox.y + scrollY,
    searchY: searchBox.y + scrollY,
    ...(groupingBox ? { groupingY: groupingBox.y + scrollY } : {}),
  }
}

export function expectStableGeometry(
  reference: GeometrySnapshot,
  candidate: GeometrySnapshot,
  label: string,
  fields: (keyof GeometrySnapshot)[] = ['shellHeight', 'viewModeY', 'searchY']
) {
  fields.forEach((field) => {
    const before = reference[field]
    const after = candidate[field]
    expect(before, `${label}: ${field} reference should exist`).toBeDefined()
    expect(after, `${label}: ${field} candidate should exist`).toBeDefined()
    expect(
      Math.abs(after! - before!),
      `${label}: ${field} displaced from ${before}px to ${after}px`
    ).toBeLessThanOrEqual(LR_TRANSITION_MAX_DISPLACEMENT_PX)
  })
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  expect(overflow, 'document should not overflow horizontally').toBeLessThanOrEqual(1)
}

export async function expectControlWithinViewport(page: Page, locator: Locator, name: string) {
  const box = await requiredBox(locator, name)
  const viewport = page.viewportSize()
  expect(viewport, 'test must configure an explicit viewport').not.toBeNull()
  expect(box.x, `${name} should not extend left of the viewport`).toBeGreaterThanOrEqual(-1)
  expect(box.x + box.width, `${name} should not extend right of the viewport`).toBeLessThanOrEqual(
    viewport!.width + 1
  )
  expect(box.height, `${name} should remain usable`).toBeGreaterThanOrEqual(20)
}
