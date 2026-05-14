import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCaseAccessToken, hasCaseAccessToken, storeCaseAccessToken } from './caseAccessSession'

describe('caseAccessSession', () => {
  const sessionStorageMock = {
    storage: new Map<string, string>(),
    getItem(key: string) {
      return this.storage.get(key) ?? null
    },
    setItem(key: string, value: string) {
      this.storage.set(key, value)
    },
    removeItem(key: string) {
      this.storage.delete(key)
    },
    clear() {
      this.storage.clear()
    }
  }

  beforeEach(() => {
    vi.stubGlobal('window', { sessionStorage: sessionStorageMock })
    sessionStorageMock.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorageMock.clear()
  })

  it('stores and resolves token by caseId', () => {
    storeCaseAccessToken('case-A', 'a'.repeat(32))
    expect(getCaseAccessToken('case-A')).toBe('a'.repeat(32))
    expect(hasCaseAccessToken('case-A')).toBe(true)
    expect(getCaseAccessToken('case-B')).toBeNull()
  })

  it('fails closed on malformed payload', () => {
    sessionStorageMock.setItem('ah.case-access.v1', '{malformed json')
    expect(getCaseAccessToken('case-A')).toBeNull()
    expect(hasCaseAccessToken('case-A')).toBe(false)
  })
})
