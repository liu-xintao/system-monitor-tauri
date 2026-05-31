import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MetricRow from '../../src/components/MetricRow'

describe('MetricRow', () => {
  it('renders label and main value', () => {
    render(<MetricRow label="CPU" color="#e89540" mainValue="42%" />)
    expect(screen.getByText('CPU')).toBeDefined()
    expect(screen.getByText('42%')).toBeDefined()
  })

  it('renders extra info badge when provided', () => {
    render(<MetricRow label="GPU" color="#e8a040" mainValue="35%" extra="62°C" />)
    expect(screen.getByText('62°C')).toBeDefined()
  })

  it('renders spectrum bars when spectrumData is provided', () => {
    const { container } = render(
      <MetricRow
        label="CPU"
        color="#e89540"
        mainValue="42%"
        spectrumData={[10, 20, 30, 40, 50, 60, 70, 80]}
      />
    )
    const bars = container.querySelectorAll('.spectrum-bars > div')
    expect(bars.length).toBe(8)
  })

  it('does not render extra badge when extra is undefined', () => {
    render(<MetricRow label="CPU" color="#e89540" mainValue="42%" />)
    expect(screen.queryByText('°C')).toBeNull()
  })
})
