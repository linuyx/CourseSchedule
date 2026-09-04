'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  RotateCcw,
  Settings2,
  UserRound,
} from 'lucide-react';

import {
  CourseManager,
  ScheduleNoticeBanner,
} from '@/components/course-manager';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DEFAULT_SCHEDULE } from '@/lib/default-schedule';
import {
  formatDate,
  getAcademicProgress,
  getCoursePalette,
  getDateKey,
  getDefaultWeekday,
  getWeekDates,
  parseSchedule,
  PERIODS,
  WEEKDAYS,
  type CourseRecord,
  type ScheduleFile,
  type Weekday,
} from '@/lib/schedule';
import {
  createStoredSchedule,
  parseStoredSchedule,
  SCHEDULE_STORAGE_KEY,
  type EditableScheduleFile,
  type ScheduleMutationResult,
  type ScheduleNotice,
} from '@/lib/schedule-storage';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; schedule: ScheduleFile };

type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};

export default function Home() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [notice, setNotice] = useState<ScheduleNotice | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const initialState = initializeBrowserSchedule();
      setNotice(initialState.notice);
      setLoadState({ status: 'ready', schedule: initialState.schedule });
      setSelectedWeek(
        getAcademicProgress(initialState.schedule.semester).defaultWeek,
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (loadState.status === 'loading' || selectedWeek === null) {
    return <LoadingSchedule />;
  }

  function saveSchedule(
    editableSchedule: EditableScheduleFile,
  ): ScheduleMutationResult {
    const parsed = parseSchedule(editableSchedule);
    if (!parsed.ok) {
      return { ok: false, message: parsed.errors[0] };
    }

    try {
      window.localStorage.setItem(
        SCHEDULE_STORAGE_KEY,
        JSON.stringify(createStoredSchedule(parsed.data)),
      );
    } catch {
      const message = '无法写入浏览器本地存储，课程修改没有保存。';
      setNotice({ tone: 'error', message });
      return { ok: false, message };
    }

    setLoadState((current) =>
      current.status === 'ready'
        ? { ...current, schedule: parsed.data }
        : current,
    );
    setNotice({ tone: 'success', message: '课程修改已保存到当前浏览器。' });
    return { ok: true };
  }

  return (
    <SchedulePage
      schedule={loadState.schedule}
      selectedWeek={selectedWeek}
      notice={notice}
      onWeekChange={setSelectedWeek}
      onDismissNotice={() => setNotice(null)}
      onSaveSchedule={saveSchedule}
    />
  );
}

function initializeBrowserSchedule(): {
  schedule: ScheduleFile;
  notice: ScheduleNotice | null;
} {
  try {
    const serialized = window.localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (serialized) {
      const stored = parseStoredSchedule(serialized);
      if (stored.ok) return { schedule: stored.schedule, notice: null };

      window.localStorage.setItem(
        SCHEDULE_STORAGE_KEY,
        JSON.stringify(createStoredSchedule(DEFAULT_SCHEDULE)),
      );
      return {
        schedule: DEFAULT_SCHEDULE,
        notice: {
          tone: 'warning',
          message: `${stored.message}，已恢复内置初始课程。`,
        },
      };
    }

    window.localStorage.setItem(
      SCHEDULE_STORAGE_KEY,
      JSON.stringify(createStoredSchedule(DEFAULT_SCHEDULE)),
    );
    return { schedule: DEFAULT_SCHEDULE, notice: null };
  } catch {
    return {
      schedule: DEFAULT_SCHEDULE,
      notice: {
        tone: 'warning',
        message:
          '浏览器存储不可用，当前仅临时显示初始课程，课程修改将无法持久保存。',
      },
    };
  }
}

function SchedulePage({
  schedule,
  selectedWeek,
  notice,
  onWeekChange,
  onDismissNotice,
  onSaveSchedule,
}: {
  schedule: ScheduleFile;
  selectedWeek: number;
  notice: ScheduleNotice | null;
  onWeekChange: (week: number) => void;
  onDismissNotice: () => void;
  onSaveSchedule: (schedule: EditableScheduleFile) => ScheduleMutationResult;
}) {
  const progress = useMemo(
    () => getAcademicProgress(schedule.semester),
    [schedule.semester],
  );
  const [selectedDay, setSelectedDay] = useState<Weekday>(() =>
    getDefaultWeekday(progress, selectedWeek),
  );
  const [isManaging, setIsManaging] = useState(false);
  const weekDates = useMemo(
    () => getWeekDates(schedule.semester.startDate, selectedWeek),
    [schedule.semester.startDate, selectedWeek],
  );
  const todayKey = getDateKey(new Date());
  const isCurrentProgress = selectedWeek === progress.defaultWeek;

  const activeCourses = useMemo(
    () =>
      schedule.courses.filter((course) =>
        course.parsedWeeks.includes(selectedWeek),
      ),
    [schedule.courses, selectedWeek],
  );
  const selectedDayCourses = useMemo(
    () => activeCourses.filter((course) => course.weekday === selectedDay),
    [activeCourses, selectedDay],
  );
  const selectedDayDate = weekDates[selectedDay - 1];
  const selectedWeekday = WEEKDAYS[selectedDay - 1];
  const isSelectedDateToday = getDateKey(selectedDayDate) === todayKey;

  const handleWeekChange = useCallback(
    (week: number) => {
      onWeekChange(week);
      setSelectedDay(getDefaultWeekday(progress, week));
    },
    [onWeekChange, progress],
  );

  function handleDayKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    day: Weekday,
  ) {
    let nextDay: Weekday | null = null;
    if (event.key === 'ArrowLeft') nextDay = Math.max(1, day - 1) as Weekday;
    if (event.key === 'ArrowRight') nextDay = Math.min(5, day + 1) as Weekday;
    if (event.key === 'Home') nextDay = 1;
    if (event.key === 'End') nextDay = 5;
    if (nextDay === null || nextDay === day) return;

    event.preventDefault();
    setSelectedDay(nextDay);
    requestAnimationFrame(() =>
      document.getElementById(`day-tab-${nextDay}`)?.focus(),
    );
  }

  useEffect(() => {
    const modelContext = (
      document as Document & { modelContext?: ModelContext }
    ).modelContext;
    if (!modelContext?.registerTool) return;

    const lifecycle = new AbortController();
    const registration = modelContext.registerTool(
      {
        name: 'view_schedule_week',
        title: '查看指定教学周',
        description: '切换课程表到指定教学周，并返回该周的日期范围和课程数量。',
        inputSchema: {
          type: 'object',
          properties: {
            week: {
              type: 'integer',
              minimum: 1,
              maximum: schedule.semester.totalWeeks,
              description: '要查看的教学周次',
            },
          },
          required: ['week'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          if (!isWeekToolInput(input)) throw new Error('week 必须是整数');
          if (input.week < 1 || input.week > schedule.semester.totalWeeks) {
            throw new Error(
              `week 必须在 1-${schedule.semester.totalWeeks} 之间`,
            );
          }

          handleWeekChange(input.week);
          const dates = getWeekDates(schedule.semester.startDate, input.week);
          const courseCount = schedule.courses.filter((course) =>
            course.parsedWeeks.includes(input.week),
          ).length;
          return {
            week: input.week,
            dateRange: `${getDateKey(dates[0])} 至 ${getDateKey(dates[4])}`,
            courseCount,
          };
        },
      },
      { signal: lifecycle.signal },
    );
    void Promise.resolve(registration).catch(() => undefined);

    return () => lifecycle.abort();
  }, [handleWeekChange, schedule]);

  if (isManaging) {
    return (
      <CourseManager
        schedule={schedule}
        selectedWeek={selectedWeek}
        selectedDay={selectedDay}
        notice={notice}
        onDismissNotice={onDismissNotice}
        onClose={() => setIsManaging(false)}
        onSaveSchedule={onSaveSchedule}
      />
    );
  }

  return (
    <main className="schedule-app schedule-page">
      <div className="paper-grid" aria-hidden="true" />
      <div className="orb orb-one" aria-hidden="true" />
      <div className="orb orb-two" aria-hidden="true" />

      <div className="page-shell">
        <header className="topbar">
          <a className="brand" href="#schedule" aria-label="返回课程表顶部">
            <span className="brand-mark">
              <BookOpen aria-hidden="true" />
            </span>
            <span>
              <strong>课序</strong>
              <small>WEEKLY STUDIO</small>
            </span>
          </a>
          <div className="topbar-context">
            <small>{schedule.semester.name}</small>
            <strong>第 {selectedWeek} 周</strong>
          </div>
        </header>

        <section className="workspace" id="schedule" aria-label="课程表工作区">
          <div className="workspace-heading">
            <div className="schedule-overview">
              <div className="schedule-overview-meta">
                <span className={`term-status term-status-${progress.status}`}>
                  {progress.label}
                </span>
                <span>
                  {activeCourses.length > 0
                    ? `本周 ${activeCourses.length} 个安排`
                    : '本周暂时没有课程安排'}
                </span>
                <span className="data-source-compact">浏览器存储</span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="manage-entry-button"
                onClick={() => setIsManaging(true)}
              >
                <Settings2 aria-hidden="true" />
                维护
              </Button>
            </div>

            <div className="week-controls" aria-label="周次切换">
              <Button
                variant="outline"
                size="icon-lg"
                className="nav-button"
                onClick={() => handleWeekChange(selectedWeek - 1)}
                disabled={selectedWeek === 1}
                aria-label="上一周"
              >
                <ChevronLeft />
              </Button>

              <Select
                value={String(selectedWeek)}
                onValueChange={(value) =>
                  value && handleWeekChange(Number(value))
                }
              >
                <SelectTrigger className="week-select" aria-label="选择周次">
                  <CalendarDays aria-hidden="true" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end" className="week-select-content">
                  {Array.from(
                    { length: schedule.semester.totalWeeks },
                    (_, index) => {
                      const week = index + 1;
                      return (
                        <SelectItem key={week} value={String(week)}>
                          第 {week} 周
                        </SelectItem>
                      );
                    },
                  )}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon-lg"
                className="nav-button"
                onClick={() => handleWeekChange(selectedWeek + 1)}
                disabled={selectedWeek === schedule.semester.totalWeeks}
                aria-label="下一周"
              >
                <ChevronRight />
              </Button>

              <Button
                variant="ghost"
                size="icon-lg"
                className="current-week-button"
                onClick={() => handleWeekChange(progress.defaultWeek)}
                disabled={isCurrentProgress}
                aria-label="回到本周"
              >
                <RotateCcw aria-hidden="true" />
              </Button>
            </div>
          </div>

          {notice && (
            <ScheduleNoticeBanner notice={notice} onDismiss={onDismissNotice} />
          )}

          <section className="daily-schedule" aria-label="按日课程表">
            <div className="day-tabs" role="tablist" aria-label="选择星期">
              {WEEKDAYS.map((weekday, index) => {
                const date = weekDates[index];
                const isToday = getDateKey(date) === todayKey;
                const isSelected = selectedDay === weekday.value;
                return (
                  <button
                    key={weekday.value}
                    id={`day-tab-${weekday.value}`}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls="day-panel"
                    aria-label={`${weekday.label} ${formatDate(date)}${isToday ? '（今天）' : ''}`}
                    tabIndex={isSelected ? 0 : -1}
                    className={isSelected ? 'is-selected' : undefined}
                    onClick={() => setSelectedDay(weekday.value)}
                    onKeyDown={(event) =>
                      handleDayKeyDown(event, weekday.value)
                    }
                  >
                    <span>{weekday.label}</span>
                    <small>{formatDate(date, true)}</small>
                    {isToday && <i aria-hidden="true" />}
                  </button>
                );
              })}
            </div>

            <div className="day-summary">
              <div>
                <span>
                  {isSelectedDateToday ? '今天' : selectedWeekday.label}
                </span>
                <strong>{formatDate(selectedDayDate)}</strong>
              </div>
              <p>
                {selectedDayCourses.length > 0
                  ? `${selectedDayCourses.length} 节课程`
                  : isSelectedDateToday
                    ? '今天没有课程'
                    : '当日没有课程'}
              </p>
            </div>

            <div
              id="day-panel"
              role="tabpanel"
              aria-labelledby={`day-tab-${selectedDay}`}
              className="period-list"
            >
              {PERIODS.map((period, periodIndex) => {
                const periodCourses = selectedDayCourses.filter(
                  (course) => course.period === period.id,
                );
                return (
                  <div
                    key={period.id}
                    className={`period-row${periodIndex === 2 ? ' afternoon-start' : ''}`}
                  >
                    <div className="period-label">
                      <span>{String(periodIndex + 1).padStart(2, '0')}</span>
                      <strong>{period.label}</strong>
                    </div>
                    <div className="daily-course-stack">
                      {periodCourses.length > 0 ? (
                        periodCourses.map((course, index) => (
                          <CourseCard
                            key={`${course.name}-${course.teacher}-${index}`}
                            course={course}
                          />
                        ))
                      ) : (
                        <div className="empty-course">
                          <span aria-hidden="true" />
                          <p>本节无课程</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function isWeekToolInput(value: unknown): value is { week: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'week' in value &&
    Number.isInteger((value as { week?: unknown }).week)
  );
}

function CourseCard({ course }: { course: CourseRecord }) {
  return (
    <article
      className="course-card"
      data-palette={getCoursePalette(course.name)}
    >
      <span className="course-card-rail" aria-hidden="true" />
      <span className="course-monogram" aria-hidden="true">
        {Array.from(course.name.trim())[0] ?? '课'}
      </span>
      <div className="course-card-content">
        <h3>{course.name}</h3>
        <div className="course-meta">
          <span className="course-room">
            <MapPin aria-hidden="true" />
            {course.room}
          </span>
          <span className="course-teacher">
            <UserRound aria-hidden="true" />
            {course.teacher}
          </span>
        </div>
      </div>
    </article>
  );
}

function LoadingSchedule() {
  return (
    <main
      className="schedule-app schedule-page loading-page"
      aria-busy="true"
      aria-label="正在加载课程表"
    >
      <div className="paper-grid" aria-hidden="true" />
      <div className="page-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">
              <BookOpen />
            </span>
            <span>
              <strong>课序</strong>
              <small>WEEKLY STUDIO</small>
            </span>
          </div>
          <div className="topbar-context loading-context">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
        </header>
        <section className="workspace loading-workspace">
          <div className="loading-overview-row">
            <div>
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="loading-week-controls">
            <Skeleton className="h-full w-full" />
            <Skeleton className="h-full w-full" />
            <Skeleton className="h-full w-full" />
            <Skeleton className="h-full w-full" />
          </div>
          <div className="loading-day-tabs">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-full w-full rounded-xl" />
            ))}
          </div>
          <div className="loading-day-summary">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="loading-period-list">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index}>
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-full w-full rounded-xl" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
