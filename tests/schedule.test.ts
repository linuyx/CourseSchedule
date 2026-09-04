import { describe, expect, it } from 'vitest';

import {
  formatWeekRange,
  formatWeeks,
  getAcademicProgress,
  getDateKey,
  getDefaultWeekday,
  getWeekRange,
  getWeekDates,
  parseSchedule,
  parseWeeks,
} from '@/lib/schedule';
import { DEFAULT_SCHEDULE } from '@/lib/default-schedule';
import { toEditableSchedule } from '@/lib/schedule-storage';

describe('parseWeeks', () => {
  it('解析单周、区间、重复值与空格', () => {
    expect(parseWeeks('1-3, 3, 5, 7-8', 10)).toEqual([1, 2, 3, 5, 7, 8]);
  });

  it('拒绝倒置区间、空值和越界周次', () => {
    expect(() => parseWeeks('8-3', 20)).toThrow('起始值不能大于结束值');
    expect(() => parseWeeks('', 20)).toThrow('周次不能为空');
    expect(() => parseWeeks('21', 20)).toThrow('超出 1-20');
  });

  it('提取起止周并识别不连续周次', () => {
    expect(getWeekRange('2-6', 20)).toEqual({
      startWeek: 2,
      endWeek: 6,
      isContinuous: true,
    });
    expect(getWeekRange('1-8,11-16', 20)).toEqual({
      startWeek: 1,
      endWeek: 16,
      isContinuous: false,
    });
    expect(formatWeekRange(3, 3, 20)).toBe('3');
    expect(formatWeekRange(3, 9, 20)).toBe('3-9');
    expect(() => formatWeekRange(9, 3, 20)).toThrow('开始周不能大于结束周');
  });

  it('将任意勾选周次压缩为连续区间表达式', () => {
    expect(formatWeeks([10, 8, 7, 5, 4, 3, 2, 1, 3], 20)).toBe('1-5,7-8,10');
    expect(formatWeeks([2, 4, 6], 20)).toBe('2,4,6');
    expect(() => formatWeeks([], 20)).toThrow('周次不能为空');
    expect(() => formatWeeks([1, 21], 20)).toThrow('超出 1-20');
  });
});

describe('getAcademicProgress', () => {
  const semester = {
    name: '测试学期',
    startDate: '2026-09-07',
    totalWeeks: 20,
  };

  it('开学前默认第 1 周', () => {
    expect(getAcademicProgress(semester, new Date(2026, 8, 3))).toEqual({
      defaultWeek: 1,
      status: 'before',
      label: '尚未开学',
    });
  });

  it('学期中计算正确教学周', () => {
    expect(
      getAcademicProgress(semester, new Date(2026, 8, 23)).defaultWeek,
    ).toBe(3);
  });

  it('学期结束后默认最后一周', () => {
    expect(getAcademicProgress(semester, new Date(2027, 2, 1))).toEqual({
      defaultWeek: 20,
      status: 'after',
      label: '学期已结束',
    });
  });

  it('移动端仅在当前教学周的工作日默认选中今天', () => {
    const progress = getAcademicProgress(semester, new Date(2026, 8, 23));
    expect(getDefaultWeekday(progress, 3, new Date(2026, 8, 23))).toBe(3);
    expect(getDefaultWeekday(progress, 4, new Date(2026, 8, 23))).toBe(1);
    expect(getDefaultWeekday(progress, 3, new Date(2026, 8, 27))).toBe(1);
  });
});

describe('schedule dates and validation', () => {
  it('内置初始课程符合公开数据格式', () => {
    const editableSchedule = toEditableSchedule(DEFAULT_SCHEDULE);
    const result = parseSchedule(editableSchedule);
    expect(result.ok).toBe(true);
    expect(editableSchedule).toEqual({
      semester: {
        name: '2026-2027学年第一学期',
        startDate: '2026-08-31',
        totalWeeks: 18,
      },
      courses: [
        {
          name: '社会研究方法',
          teacher: '席曾苹',
          room: 'L2501',
          weekday: 1,
          period: 'morning-1',
          weeks: '2-13',
        },
        {
          name: '社会工作理论',
          teacher: '伍娟',
          room: 'L2409',
          weekday: 4,
          period: 'morning-1',
          weeks: '2-13',
        },
        {
          name: '社会研究方法',
          teacher: '席曾苹',
          room: 'L2501',
          weekday: 4,
          period: 'morning-2',
          weeks: '2-13',
        },
        {
          name: '社会工作理论',
          teacher: '伍娟',
          room: 'L1206',
          weekday: 5,
          period: 'morning-2',
          weeks: '2-13',
        },
        {
          name: '社会工作伦理',
          teacher: '向柳春',
          room: 'L1205',
          weekday: 1,
          period: 'afternoon-1',
          weeks: '10',
        },
        {
          name: '社会政策',
          teacher: '徐翀',
          room: 'L1506',
          weekday: 2,
          period: 'afternoon-1',
          weeks: '2-13',
        },
        {
          name: '社会工作伦理',
          teacher: '向柳春',
          room: 'L1206',
          weekday: 3,
          period: 'afternoon-1',
          weeks: '2-5,7-10',
        },
        {
          name: '高级社会工作实务',
          teacher: '陈会全、代曦',
          room: 'L1304',
          weekday: 5,
          period: 'afternoon-1',
          weeks: '2-11',
        },
        {
          name: '社会工作伦理',
          teacher: '向柳春',
          room: 'L1206',
          weekday: 3,
          period: 'afternoon-2',
          weeks: '11-17',
        },
        {
          name: '社会政策',
          teacher: '徐翀',
          room: 'L2409',
          weekday: 5,
          period: 'afternoon-2',
          weeks: '2-13',
        },
      ],
    });
  });

  it('生成所选周周一至周五日期', () => {
    expect(getWeekDates('2026-09-07', 2).map(getDateKey)).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
    ]);
  });

  it('报告课程字段和学期日期错误', () => {
    const result = parseSchedule({
      semester: { name: '测试', startDate: '2026-09-08', totalWeeks: 2 },
      courses: [
        {
          name: '课程',
          teacher: '教师',
          room: '教室',
          weekday: 7,
          period: 'night',
          weeks: '3',
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join('\n')).toContain('必须是第一周的周一');
      expect(result.errors.join('\n')).toContain('weekday 必须是 1-5');
      expect(result.errors.join('\n')).toContain('period 不是有效节次');
      expect(result.errors.join('\n')).toContain('超出 1-2');
    }
  });
});
