import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parseISO } from 'date-fns'
import { ArrowRight, Check, CircleAlert, RotateCcw, X } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import type { NavigationTab } from '@/components/BottomNav'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { LessonCard } from '@/components/LessonCard'
import { Onboarding } from '@/features/onboarding/Onboarding'
import { CalendarPage } from '@/pages/CalendarPage'
import type { CalendarView } from '@/pages/CalendarPage'
import { GroupManager } from '@/pages/GroupManager'
import { HomePage } from '@/pages/HomePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ApiError, forgetOfflineSchedule, requestConfig, requestGroups, requestSchedule } from '@/services/api'
import { dateKey, fmt, moscowNow } from '@/lib/dates'
import { ACCENT_KEY, GROUP_KEY, NICKNAME_KEY, OFFLINE_GROUPS_KEY, ORGANIZE_PAST_KEY, parseSavedGroups, readSetting, SAVED_GROUPS_KEY, saveSetting, THEME_KEY } from '@/lib/storage'
import { parseAccent, parseOrganizePast } from '@/config/preferences'
import { staticDataEnabled } from '@/config/deployment'
import { sanitizeNickname } from '@/lib/nickname'
import { cn } from '@/lib/utils'
import type { Lesson } from '@/types'

type Tab = NavigationTab

function scheduleQuery(groupId: string) {
  return {
    queryKey: ['schedule', groupId],
    staleTime: 15 * 60 * 1000,
    queryFn: () => requestSchedule(groupId),
  }
}

export default function App() {
  const client = useQueryClient()
  const [selectedGroup, setSelectedGroup] = useState(() => readSetting(GROUP_KEY))
  const [savedIds, setSavedIds] = useState(() => {
    const selected = readSetting(GROUP_KEY)
    return [...new Set([...parseSavedGroups(readSetting(SAVED_GROUPS_KEY)), ...(selected ? [selected] : [])])]
  })
  const [theme, setTheme] = useState(() => readSetting(THEME_KEY) === 'light' ? 'light' : 'dark')
  const [accent, setAccent] = useState(() => parseAccent(readSetting(ACCENT_KEY)))
  const [organizePast, setOrganizePast] = useState(() => parseOrganizePast(readSetting(ORGANIZE_PAST_KEY)))
  const [nickname, setNickname] = useState(() => sanitizeNickname(readSetting(NICKNAME_KEY)).trim())
  const [online, setOnline] = useState(() => navigator.onLine)
  const [now, setNow] = useState(moscowNow)
  const [tab, setTab] = useState<Tab>('home')
  const [homeDate, setHomeDate] = useState(() => parseISO(moscowNow().date))
  const [calendarDate, setCalendarDate] = useState(() => parseISO(moscowNow().date))
  const [view, setView] = useState<CalendarView>('day')
  const [managerOpen, setManagerOpen] = useState(false)
  const [detail, setDetail] = useState<{ date: Date; lessons: Lesson[] } | null>(null)
  const [notice, setNotice] = useState('')
  const [noticeError, setNoticeError] = useState(false)
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({})
  const previousToday = useRef(now.date)

  const catalog = useQuery({
    queryKey: ['groups'],
    queryFn: requestGroups,
    staleTime: Infinity,
    refetchInterval: query => online && (query.state.data?.offline || query.state.status === 'error') ? 15000 : false,
  })
  const groups = catalog.data?.items
  const searchOffline = !online || catalog.data?.offline === true
    || (catalog.error instanceof ApiError && (catalog.error.status === 0 || catalog.error.status >= 500))
  const savedGroups = useMemo(() => groups?.filter(item => savedIds.includes(item.id)) ?? [], [groups, savedIds])
  const config = useQuery({
    queryKey: ['config'],
    queryFn: requestConfig,
    staleTime: Infinity,
  })
  const manualRefreshEnabled = config.data?.manual_refresh === true
  const group = groups?.find(item => item.id === selectedGroup)
  const schedule = useQuery({
    ...scheduleQuery(selectedGroup ?? ''), enabled: !!group,
    refetchOnWindowFocus: staticDataEnabled,
    refetchInterval: query => {
      if (!online) return false
      if (query.state.data?.offline) return 30000
      return staticDataEnabled ? 15 * 60 * 1000 : false
    },
  })
  const refresh = useMutation({
    mutationFn: (groupId: string) => requestSchedule(groupId, true),
    onSuccess: (data, groupId) => {
      client.setQueryData(['schedule', groupId], data)
      setCooldowns(previous => ({ ...previous, [groupId]: Date.now() + 60000 }))
      if (groupId !== selectedGroup) return
      setNoticeError(data.stale)
      setNotice(data.stale ? 'Университет временно недоступен. Показаны сохранённые данные.' : 'Расписание обновлено')
    },
    onError: (error: Error, groupId) => {
      if (error instanceof ApiError && error.retryAfter) {
        const until = Date.now() + error.retryAfter * 1000
        setCooldowns(previous => ({ ...previous, [groupId]: until }))
      }
      if (groupId !== selectedGroup) return
      setNoticeError(true)
      setNotice(error.message || 'Не удалось обновить расписание. Попробуйте ещё раз')
    },
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#000000' : '#f4f5f7')
    saveSetting(THEME_KEY, theme)
  }, [theme])
  useEffect(() => {
    saveSetting(SAVED_GROUPS_KEY, JSON.stringify(savedIds))
    if (groups) saveSetting(OFFLINE_GROUPS_KEY, JSON.stringify(savedGroups))
  }, [groups, savedGroups, savedIds])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    if (searchOffline) return
    let cancelled = false
    async function saveOtherSchedules() {
      for (const item of savedGroups) {
        if (cancelled) return
        if (item.id !== selectedGroup) await client.prefetchQuery(scheduleQuery(item.id))
      }
    }
    void saveOtherSchedules()
    return () => { cancelled = true }
  }, [client, savedGroups, searchOffline, selectedGroup])
  useEffect(() => {
    if (!selectedGroup || group || !groups?.length || catalog.data?.offline) return
    const fallback = groups.find(item => savedIds.includes(item.id)) ?? groups[0]
    saveSetting(GROUP_KEY, fallback.id)
    setSelectedGroup(fallback.id)
    setSavedIds(previous => previous.includes(fallback.id) ? previous : [...previous, fallback.id])
  }, [group, groups, catalog.data?.offline, savedIds, selectedGroup])
  useEffect(() => { document.documentElement.dataset.accent = accent; saveSetting(ACCENT_KEY, accent) }, [accent])
  useEffect(() => { saveSetting(ORGANIZE_PAST_KEY, String(organizePast)) }, [organizePast])
  useEffect(() => { saveSetting(NICKNAME_KEY, nickname.trim() || null) }, [nickname])
  useEffect(() => {
    const update = () => setNow(moscowNow())
    const interval = setInterval(update, 1000)
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => { clearInterval(interval); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update) }
  }, [])
  useEffect(() => {
    if (!notice) return
    const timeout = setTimeout(() => setNotice(''), 6500)
    return () => clearTimeout(timeout)
  }, [notice])
  // Keep the home page on today across Moscow midnight unless another date was selected.
  useEffect(() => {
    const oldToday = previousToday.current
    previousToday.current = now.date
    if (oldToday !== now.date) setHomeDate(previous => dateKey(previous) === oldToday ? parseISO(now.date) : previous)
  }, [now.date])

  const data = schedule.data
  const days = useMemo(() => new Map(data?.days.map(day => [day.date, day]) ?? []), [data])
  const offlineSchedule = !online || data?.offline === true
  const loading = (catalog.isPending || (schedule.isPending && !!group)) && !catalog.isError
  const failed = schedule.isError || catalog.isError || (!group && !catalog.isPending)
  const cooldown = (cooldowns[selectedGroup ?? ''] ?? 0) > Date.now()
  const refreshing = refresh.isPending && refresh.variables === selectedGroup
  function refreshGroup() {
    if (!offlineSchedule && manualRefreshEnabled && selectedGroup && group) refresh.mutate(selectedGroup)
  }

  const onRefresh = manualRefreshEnabled && !offlineSchedule ? refreshGroup : undefined

  function saveGroup(id: string) { setSavedIds(ids => [...new Set([...ids, id])]) }
  function chooseGroup(id: string) { saveSetting(GROUP_KEY, id); setSelectedGroup(id); saveGroup(id) }
  function removeGroup(id: string) {
    const remaining = savedIds.filter(savedId => savedId !== id)
    saveSetting(SAVED_GROUPS_KEY, JSON.stringify(remaining))
    setSavedIds(remaining)
    void forgetOfflineSchedule(id)
    client.removeQueries({ queryKey: scheduleQuery(id).queryKey, exact: true })
    if (id !== selectedGroup) return

    const next = remaining.find(savedId => groups?.some(item => item.id === savedId)) ?? null
    saveSetting(GROUP_KEY, next)
    setSelectedGroup(next)
    setDetail(null)
    if (!next) {
      setTab('home')
      setManagerOpen(false)
    }
  }
  function navigate(target: Tab) { setTab(target); setManagerOpen(false); window.scrollTo({ top: 0, behavior: 'auto' }) }
  function openCalendar(date: Date) { setCalendarDate(date); setView('day'); navigate('calendar') }
  function reset() {
    for (const key of [GROUP_KEY, THEME_KEY, SAVED_GROUPS_KEY, ACCENT_KEY, ORGANIZE_PAST_KEY, NICKNAME_KEY, OFFLINE_GROUPS_KEY]) saveSetting(key, null)
    for (const id of savedIds) {
      void forgetOfflineSchedule(id)
      client.removeQueries({ queryKey: scheduleQuery(id).queryKey, exact: true })
    }
    setSelectedGroup(null); setSavedIds([]); setTheme('dark'); setTab('home'); setManagerOpen(false)
    setHomeDate(parseISO(now.date)); setCalendarDate(parseISO(now.date)); setView('day')
    setAccent('blue'); setOrganizePast(true); setNickname('')
  }

  if (!selectedGroup) {
    return <Onboarding
      nickname={nickname} onNickname={setNickname}
      theme={theme} onTheme={setTheme}
      accent={accent} onAccent={setAccent}
      groups={groups ?? []} loading={catalog.isPending} error={catalog.isError && !searchOffline} offline={searchOffline}
      onRetry={() => void catalog.refetch()} onSelect={chooseGroup}
    />
  }

  function showDetails(date: Date, lessons: Lesson[]) {
    setDetail({ date, lessons })
  }

  function renderPage() {
    if (tab === 'settings') {
      return <SettingsPage
        nickname={nickname} onNickname={setNickname}
        theme={theme} onTheme={setTheme}
        accent={accent} onAccent={setAccent}
        organizePast={organizePast} onOrganizePast={setOrganizePast}
        data={data} onReset={reset} onRefresh={onRefresh}
        refreshing={refreshing} cooldown={cooldown}
      />
    }

    if (tab === 'calendar' && managerOpen) {
      return <GroupManager
        groups={groups ?? []} savedIds={savedIds} selected={selectedGroup}
        todayLessons={days.get(now.date)?.lessons} now={now} searchOffline={searchOffline}
        onAdd={saveGroup} onRemove={removeGroup}
        onSelect={id => {
          chooseGroup(id)
          setManagerOpen(false)
        }}
        onBack={() => setManagerOpen(false)}
      />
    }

    if (loading || (failed && !data)) {
      return <>
        <div className="page-title">
          <h1>{tab === 'home' ? 'Твой учебный день' : 'Пары'}</h1>
          <p>{failed ? 'Данные временно недоступны' : 'Собираем расписание РГГУ'}</p>
        </div>
        {loading ? (
          <div className="schedule-skeleton" role="status" aria-label="Загрузка расписания">
            <div className="skeleton skeleton-strip" />
            {[0, 1, 2].map(index => <div className="skeleton skeleton-card" key={index} />)}
          </div>
        ) : (
          <div className="state-panel error-state" role="alert">
            <CircleAlert size={34} />
            <h2>Расписание пока недоступно</h2>
            <p>{searchOffline ? 'Для этой группы нужна сохранённая копия. Подключитесь к интернету и откройте расписание.' : 'Не удалось загрузить расписание. Попробуйте ещё раз'}</p>
            <Button variant="outline" onClick={() => void (catalog.isError ? catalog.refetch() : schedule.refetch())}>
              <RotateCcw size={16} />Повторить попытку
            </Button>
          </div>
        )}
      </>
    }

    if (!data) return null

    if (tab === 'home') {
      return <HomePage
        nickname={nickname} data={data} days={days} date={homeDate} now={now} organizePast={organizePast} offline={!online}
        onDate={setHomeDate} onCalendar={openCalendar} onDetails={showDetails}
        onSettings={() => navigate('settings')} onSearch={() => navigate('calendar')}
      />
    }

    return <CalendarPage
      data={data} days={days} date={calendarDate} view={view} now={now}
      organizePast={organizePast} group={group} savedGroups={savedGroups}
      onDate={setCalendarDate} onView={setView} onGroupSelect={chooseGroup}
      onManageGroups={() => setManagerOpen(true)} onDetails={showDetails}
      onRefresh={onRefresh} refreshing={refreshing} cooldown={cooldown}
    />
  }

  return <div className={cn('app-shell', `tab-${tab}`)}>
    <main>
      {data && online && data.stale && <div className="warning-banner" role="status">
        <CircleAlert size={17} /><span>{data.warning}</span>
      </div>}
      <div className="page-transition" key={`${tab}:${managerOpen ? 'groups' : data ? 'ready' : 'status'}:${selectedGroup}`}>
        {renderPage()}
      </div>
      <footer className="workspace-footer">MyRSUH — от студента РГГУ для студентов.</footer>
    </main>

    <BottomNav active={tab} onSelect={target => {
      if (target === 'home') setHomeDate(parseISO(now.date))
      navigate(target)
    }} />
    {notice && <div className="toast" role="status">
      {noticeError ? <CircleAlert size={17} /> : <Check size={17} />}
      <span>{notice}</span>
      <button aria-label="Скрыть уведомление" onClick={() => setNotice('')}><X size={16} /></button>
    </div>}
    <Dialog
      open={!!detail}
      onOpenChange={open => { if (!open) setDetail(null) }}
      title={detail ? fmt(detail.date, 'd MMMM, EEEE') : 'Занятие'}
      description="Все занятия выбранной пары · время московское"
    >
      <div className="lesson-dialog">
        {detail?.lessons.map(lesson => <LessonCard key={lesson.id} lesson={lesson} day={dateKey(detail.date)} now={now} />)}
        <Button variant="outline" onClick={() => {
          if (detail) openCalendar(detail.date)
          setDetail(null)
        }}>
          Открыть весь день <ArrowRight size={15} />
        </Button>
      </div>
    </Dialog>
  </div>
}
