import { describe, it, beforeEach, afterEach, expect } from 'vitest'

describe('dummy', () => {
  beforeEach(() => {
    console.log('beforeEach çalıştı')
  })

  afterEach(() => {
    console.log('afterEach çalıştı')
  })

  it('test 1', () => {
    console.log('test 1 çalıştı')
  })

  it('test 2', () => {
    console.log('test 2 çalıştı')
  })
})
