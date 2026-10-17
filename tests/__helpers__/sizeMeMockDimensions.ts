export type SizeMeMockDimensions = { width: number; height: number }

const DEFAULT_DIMENSIONS: SizeMeMockDimensions = { width: 1200, height: 500 }
let mockDimensions = { ...DEFAULT_DIMENSIONS }

export const getSizeMeMockDimensions = (): SizeMeMockDimensions => ({ ...mockDimensions })

export const setSizeMeMockDimensions = (dimensions: Partial<SizeMeMockDimensions>): void => {
  mockDimensions = { ...DEFAULT_DIMENSIONS, ...dimensions }
}

export const resetSizeMeMockDimensions = (): void => {
  mockDimensions = { ...DEFAULT_DIMENSIONS }
}
