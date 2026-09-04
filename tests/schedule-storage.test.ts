import { describe, expect, it } from 'vitest';

import { parseSchedule } from '@/lib/schedule';
import {
  createStoredSchedule,
  parseStoredSchedule,
  toEditableSchedule,
} from '@/lib/schedule-storage';

const rawSchedule = {
  semester: {
    name: '存储测试学期',
    startDate: '2026-09-07',
    totalWeeks: 4,
  },
  courses: [
    {
      name: '存储测试课程',
      teacher: '测试老师',
      room: 'A101',
      weekday: 1,
      period: 'morning-1',
      weeks: '1-4',
    },
  ],
};

describe('schedule local storage', () => {
  it('保存时移除运行时派生字段', () => {
    const parsed = parseSchedule(rawSchedule);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const editable = toEditableSchedule(parsed.data);
    expect(editable).toEqual(rawSchedule);
    expect(JSON.stringify(createStoredSchedule(parsed.data))).not.toContain(
      'parsedWeeks',
    );
  });

  it('读取版本化本地课程并重新生成周次', () => {
    const parsed = parseSchedule(rawSchedule);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const stored = createStoredSchedule(
      parsed.data,
      '2026-09-03T08:00:00.000Z',
    );
    const result = parseStoredSchedule(JSON.stringify(stored));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.updatedAt).toBe('2026-09-03T08:00:00.000Z');
      expect(result.schedule.courses[0].parsedWeeks).toEqual([1, 2, 3, 4]);
    }
  });

  it('拒绝损坏、未知版本或校验失败的本地数据', () => {
    expect(parseStoredSchedule('{bad json')).toEqual({
      ok: false,
      message: '本机课程数据不是有效的 JSON',
    });
    expect(
      parseStoredSchedule(
        JSON.stringify({
          version: 2,
          updatedAt: '2026-09-03T08:00:00.000Z',
          schedule: rawSchedule,
        }),
      ),
    ).toEqual({ ok: false, message: '本机课程数据版本无效' });

    const invalid = parseStoredSchedule(
      JSON.stringify({
        version: 1,
        updatedAt: '2026-09-03T08:00:00.000Z',
        schedule: {
          ...rawSchedule,
          courses: [{ ...rawSchedule.courses[0], weeks: '9' }],
        },
      }),
    );
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.message).toContain('超出 1-4');
  });
});
