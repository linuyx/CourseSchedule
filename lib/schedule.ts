export const PERIODS = [
  { id: 'morning-1', label: '上午一', englishLabel: 'MORNING' },
  { id: 'morning-2', label: '上午二', englishLabel: 'MORNING' },
  { id: 'afternoon-1', label: '下午一', englishLabel: 'AFTERNOON' },
  { id: 'afternoon-2', label: '下午二', englishLabel: 'AFTERNOON' },
] as const;

export const WEEKDAYS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
] as const;

export type PeriodId = (typeof PERIODS)[number]['id'];
export type Weekday = (typeof WEEKDAYS)[number]['value'];

export type CourseRecord = {
  name: string;
  teacher: string;
  room: string;
  weekday: Weekday;
  period: PeriodId;
  weeks: string;
  parsedWeeks: number[];
};

export type ScheduleFile = {
  semester: {
    name: string;
    startDate: string;
    totalWeeks: number;
  };
  courses: CourseRecord[];
};

type ParseResult =
  | { ok: true; data: ScheduleFile }
  | { ok: false; errors: string[] };

const periodIds = new Set<string>(PERIODS.map((period) => period.id));

export function parseWeeks(value: string, totalWeeks: number): number[] {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('周次不能为空');
  }

  const weeks = new Set<number>();
  const segments = value.split(',').map((segment) => segment.trim());

  for (const segment of segments) {
    if (/^\d+$/.test(segment)) {
      const week = Number(segment);
      assertWeekInRange(week, totalWeeks);
      weeks.add(week);
      continue;
    }

    const range = /^(\d+)\s*-\s*(\d+)$/.exec(segment);
    if (!range) {
      throw new Error(`无法识别周次“${segment}”`);
    }

    const start = Number(range[1]);
    const end = Number(range[2]);
    assertWeekInRange(start, totalWeeks);
    assertWeekInRange(end, totalWeeks);

    if (start > end) {
      throw new Error(`周次区间“${segment}”起始值不能大于结束值`);
    }

    for (let week = start; week <= end; week += 1) weeks.add(week);
  }

  return [...weeks].sort((a, b) => a - b);
}

export function getWeekRange(value: string, totalWeeks: number) {
  const weeks = parseWeeks(value, totalWeeks);
  const startWeek = weeks[0];
  const endWeek = weeks[weeks.length - 1];
  return {
    startWeek,
    endWeek,
    isContinuous: weeks.length === endWeek - startWeek + 1,
  };
}

export function formatWeekRange(
  startWeek: number,
  endWeek: number,
  totalWeeks: number,
) {
  assertWeekInRange(startWeek, totalWeeks);
  assertWeekInRange(endWeek, totalWeeks);
  if (startWeek > endWeek) {
    throw new Error('开始周不能大于结束周');
  }
  return startWeek === endWeek ? String(startWeek) : `${startWeek}-${endWeek}`;
}

export function formatWeeks(weeks: readonly number[], totalWeeks: number) {
  if (weeks.length === 0) throw new Error('周次不能为空');

  const normalizedWeeks = [...new Set(weeks)].sort((a, b) => a - b);
  normalizedWeeks.forEach((week) => assertWeekInRange(week, totalWeeks));

  const segments: string[] = [];
  let rangeStart = normalizedWeeks[0];
  let rangeEnd = normalizedWeeks[0];

  for (const week of normalizedWeeks.slice(1)) {
    if (week === rangeEnd + 1) {
      rangeEnd = week;
      continue;
    }

    segments.push(
      rangeStart === rangeEnd
        ? String(rangeStart)
        : `${rangeStart}-${rangeEnd}`,
    );
    rangeStart = week;
    rangeEnd = week;
  }

  segments.push(
    rangeStart === rangeEnd ? String(rangeStart) : `${rangeStart}-${rangeEnd}`,
  );
  return segments.join(',');
}

function assertWeekInRange(week: number, totalWeeks: number) {
  if (!Number.isInteger(week) || week < 1 || week > totalWeeks) {
    throw new Error(`周次 ${week} 超出 1-${totalWeeks} 的范围`);
  }
}

export function parseSchedule(input: unknown): ParseResult {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['JSON 根节点必须是对象'] };

  const semesterInput = input.semester;
  const coursesInput = input.courses;

  if (!isRecord(semesterInput)) {
    return { ok: false, errors: ['semester 必须是对象'] };
  }

  const name = readNonEmptyString(semesterInput.name, 'semester.name', errors);
  const startDate = readNonEmptyString(
    semesterInput.startDate,
    'semester.startDate',
    errors,
  );
  const totalWeeks = semesterInput.totalWeeks;

  if (!Number.isInteger(totalWeeks) || Number(totalWeeks) < 1) {
    errors.push('semester.totalWeeks 必须是大于 0 的整数');
  }

  const parsedStartDate =
    typeof startDate === 'string' ? parseLocalDate(startDate) : null;
  if (typeof startDate === 'string' && !parsedStartDate) {
    errors.push('semester.startDate 必须是有效的 YYYY-MM-DD 日期');
  } else if (parsedStartDate && parsedStartDate.getDay() !== 1) {
    errors.push('semester.startDate 必须是第一周的周一');
  }

  if (!Array.isArray(coursesInput)) {
    errors.push('courses 必须是数组');
  }

  const courses: CourseRecord[] = [];
  if (
    Array.isArray(coursesInput) &&
    Number.isInteger(totalWeeks) &&
    Number(totalWeeks) > 0
  ) {
    coursesInput.forEach((courseInput, index) => {
      const prefix = `courses[${index}]`;
      if (!isRecord(courseInput)) {
        errors.push(`${prefix} 必须是对象`);
        return;
      }

      const courseName = readNonEmptyString(
        courseInput.name,
        `${prefix}.name`,
        errors,
      );
      const teacher = readNonEmptyString(
        courseInput.teacher,
        `${prefix}.teacher`,
        errors,
      );
      const room = readNonEmptyString(
        courseInput.room,
        `${prefix}.room`,
        errors,
      );
      const weeks = readNonEmptyString(
        courseInput.weeks,
        `${prefix}.weeks`,
        errors,
      );
      const weekday = courseInput.weekday;
      const period = courseInput.period;

      if (
        !Number.isInteger(weekday) ||
        Number(weekday) < 1 ||
        Number(weekday) > 5
      ) {
        errors.push(`${prefix}.weekday 必须是 1-5 之间的整数`);
      }
      if (typeof period !== 'string' || !periodIds.has(period)) {
        errors.push(`${prefix}.period 不是有效节次`);
      }

      let parsedWeeks: number[] = [];
      if (typeof weeks === 'string') {
        try {
          parsedWeeks = parseWeeks(weeks, Number(totalWeeks));
        } catch (error) {
          errors.push(
            `${prefix}.weeks：${error instanceof Error ? error.message : '格式错误'}`,
          );
        }
      }

      if (
        courseName &&
        teacher &&
        room &&
        typeof weeks === 'string' &&
        Number.isInteger(weekday) &&
        Number(weekday) >= 1 &&
        Number(weekday) <= 5 &&
        typeof period === 'string' &&
        periodIds.has(period) &&
        parsedWeeks.length > 0
      ) {
        courses.push({
          name: courseName,
          teacher,
          room,
          weekday: Number(weekday) as Weekday,
          period: period as PeriodId,
          weeks,
          parsedWeeks,
        });
      }
    });
  }

  if (
    errors.length > 0 ||
    !name ||
    !startDate ||
    !Number.isInteger(totalWeeks)
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      semester: { name, startDate, totalWeeks: Number(totalWeeks) },
      courses,
    },
  };
}

export function getAcademicProgress(
  semester: ScheduleFile['semester'],
  today = new Date(),
) {
  const start = parseLocalDate(semester.startDate);
  if (!start) throw new Error('无效的学期开始日期');

  const todayAtNoon = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    12,
  );
  const diffDays = Math.floor(
    (todayAtNoon.getTime() - start.getTime()) / 86_400_000,
  );
  const calculatedWeek = Math.floor(diffDays / 7) + 1;

  if (calculatedWeek < 1) {
    return { defaultWeek: 1, status: 'before' as const, label: '尚未开学' };
  }
  if (calculatedWeek > semester.totalWeeks) {
    return {
      defaultWeek: semester.totalWeeks,
      status: 'after' as const,
      label: '学期已结束',
    };
  }
  return {
    defaultWeek: calculatedWeek,
    status: 'active' as const,
    label: `当前第 ${calculatedWeek} 周`,
  };
}

export function getDefaultWeekday(
  progress: ReturnType<typeof getAcademicProgress>,
  targetWeek: number,
  today = new Date(),
): Weekday {
  const weekday = today.getDay();
  if (
    progress.status === 'active' &&
    targetWeek === progress.defaultWeek &&
    weekday >= 1 &&
    weekday <= 5
  ) {
    return weekday as Weekday;
  }
  return 1;
}

export function getWeekDates(startDate: string, week: number): Date[] {
  const start = parseLocalDate(startDate);
  if (!start) throw new Error('无效的学期开始日期');
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + (week - 1) * 7 + index);
    return date;
  });
}

export function formatDate(date: Date, compact = false) {
  return compact
    ? `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, '0')}`
    : `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function getDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function getCoursePalette(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return String((hash % 6) + 1);
}

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12,
  );
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }
  return date;
}

function readNonEmptyString(value: unknown, path: string, errors: string[]) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${path} 必须是非空字符串`);
    return null;
  }
  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
