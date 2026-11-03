import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { Onboarding } from './Onboarding'

it('introduces MyRSUH with the actual schedule image and a next step, without roles or accounts', () => {
  const noop = () => {}
  const html = renderToStaticMarkup(<Onboarding groups={[]} loading error={false} onRetry={noop} onSelect={noop} nickname="" onNickname={noop} theme="dark" onTheme={noop} accent="blue" onAccent={noop} />)
  expect(html).toContain('MyRSUH')
  expect(html).toContain('/images/onboarding-schedule.jpg')
  expect(html).toContain('Всё под рукой.')
  expect(html).toContain('Далее')
  expect(html).toContain('Шаг 1 из 3')
  expect(html).not.toContain('Преподаватель')
  expect(html).not.toContain('Создать аккаунт')
})
