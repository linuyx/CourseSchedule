import {
  parseSchedule,
  type CourseRecord,
  type ScheduleFile,
} from '@/lib/schedule';

export const SCHEDULE_STORAGE_KEY = 'course-schedule.local.v1';

export type EditableCourseRecord = Omit<CourseRecord, 'parsedWeeks'>;

export type EditableScheduleFile = {
  semester: ScheduleFile['semester'];
  courses: EditableCourseRecord[];
};

export type StoredSchedule = {
  version: 1;
  updatedAt: string;
  schedule: EditableScheduleFile;
};

export type ScheduleNotice = {
  tone: 'success' | 'warning' | 'error';
  message: string;
};

export type ScheduleMutationResult =
  | { ok: true }
  | { ok: false; message: string };

type StoredScheduleResult =
  | { ok: true; schedule: ScheduleFile; updatedAt: string }
  | { ok: false; message: string };

export function toEditableSchedule(
  schedule: ScheduleFile,
): EditableScheduleFile {
  return {
    semester: { ...schedule.semester },
    courses: schedule.courses.map(
      ({ parsedWeeks: _parsedWeeks, ...course }) => ({
        ...course,
      }),
    ),
  };
}

export function createStoredSchedule(
  schedule: ScheduleFile,
  updatedAt = new Date().toISOString(),
): StoredSchedule {
  return {
    version: 1,
    updatedAt,
    schedule: toEditableSchedule(schedule),
  };
}

export function parseStoredSchedule(serialized: string): StoredScheduleResult {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return { ok: false, message: '本机课程数据不是有效的 JSON' };
  }

  if (!isRecord(value) || value.version !== 1) {
    return { ok: false, message: '本机课程数据版本无效' };
  }

  if (
    typeof value.updatedAt !== 'string' ||
    Number.isNaN(Date.parse(value.updatedAt))
  ) {
    return { ok: false, message: '本机课程数据缺少有效的更新时间' };
  }

  const result = parseSchedule(value.schedule);
  if (!result.ok) {
    return {
      ok: false,
      message: `本机课程数据校验失败：${result.errors[0]}`,
    };
  }

  return {
    ok: true,
    schedule: result.data,
    updatedAt: value.updatedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
