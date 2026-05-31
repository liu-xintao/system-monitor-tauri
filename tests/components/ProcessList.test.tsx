import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProcessList from '../../src/components/ProcessList'

describe('ProcessList', () => {
  it('renders process names and resource usage', () => {
    const processes = [
      { name: 'Chrome', cpu: 12.5, memoryMB: 1250 },
      { name: 'node', cpu: 8.0, memoryMB: 450 },
    ]

    render(<ProcessList processes={processes} />)

    expect(screen.getByText('Chrome')).toBeDefined()
    expect(screen.getByText('node')).toBeDefined()
  })

  it('renders empty state when no processes', () => {
    render(<ProcessList processes={[]} />)
    expect(screen.getByText('—')).toBeDefined()
  })

  it('formats memory >= 1024MB as GB', () => {
    const processes = [{ name: 'Chrome', cpu: 12.5, memoryMB: 1250 }]
    render(<ProcessList processes={processes} />)
    expect(screen.getByText(/1\.2G/)).toBeDefined()
  })
})
