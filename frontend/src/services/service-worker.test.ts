import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../../service-worker.js', import.meta.url), 'utf8')

function worker(base: string) {
  const handlers: Record<string, (event: unknown) => void> = {}
  const match = vi.fn(async () => new Response('offline app'))
  const scope = {
    APP_BASE: base, APP_CACHE_PREFIX: `myrsuh-app-${base}-`, APP_CACHE: 'test-cache',
    APP_FILES: [`${base}index.html`, `${base}assets/app.js`], URL, Request,
    self: { location: { origin: 'https://example.test' }, addEventListener: (type: string, handler: (event: unknown) => void) => { handlers[type] = handler } },
    caches: { open: vi.fn(async () => ({ match })) }, fetch: vi.fn(),
  }
  runInNewContext(source, scope)
  return { handlers, match }
}

it.each(['/', '/myrsuh-client/'])('serves the cached home page offline at %s', async base => {
  const { handlers, match } = worker(base)
  let response!: Promise<Response>
  handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: `https://example.test${base}` }, respondWith: (value: Promise<Response>) => { response = value } })
  expect(await (await response).text()).toBe('offline app')
  expect(match).toHaveBeenCalledWith(`${base}index.html`)
})

it('leaves schedule JSON requests outside the app shell cache', () => {
  const { handlers } = worker('/myrsuh-client/')
  const respondWith = vi.fn()
  handlers.fetch({ request: { method: 'GET', mode: 'cors', url: 'https://example.test/myrsuh-client/data/groups.json' }, respondWith })
  expect(respondWith).not.toHaveBeenCalled()
})
