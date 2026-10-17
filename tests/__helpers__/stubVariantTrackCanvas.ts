import { jest } from '@jest/globals'

const stubVariantTrackCanvas = (): void => {
  const drawingContext = {
    setTransform: jest.fn(),
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    bezierCurveTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    setLineDash: jest.fn(),
    stroke: jest.fn(),
  }

  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => drawingContext as unknown as CanvasRenderingContext2D)
}

export default stubVariantTrackCanvas
