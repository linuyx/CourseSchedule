import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Home from '@/app/page';
import { DEFAULT_SCHEDULE } from '@/lib/default-schedule';
import { parseSchedule } from '@/lib/schedule';
import {
  createStoredSchedule,
  parseStoredSchedule,
  SCHEDULE_STORAGE_KEY,
} from '@/lib/schedule-storage';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

function currentMonday() {
  const date = new Date();
  const offset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  date.setDate(date.getDate() + offset);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function scheduleWithCourses(courses: object[], totalWeeks = 3) {
  return {
    semester: {
      name: '组件测试学期',
      startDate: currentMonday(),
      totalWeeks,
    },
    courses,
  };
}

function seedSchedule(data: object) {
  const result = parseSchedule(data);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.errors.join('\n'));

  window.localStorage.setItem(
    SCHEDULE_STORAGE_KEY,
    JSON.stringify(createStoredSchedule(result.data)),
  );
}

function readStoredSchedule() {
  const serialized = window.localStorage.getItem(SCHEDULE_STORAGE_KEY);
  expect(serialized).not.toBeNull();
  if (serialized === null) throw new Error('课程没有写入浏览器存储');
  return parseStoredSchedule(serialized);
}

describe('course schedule page', () => {
  it('首次打开写入内置课程，且启动期间不请求课程文件', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(<Home />);
    expect(
      await screen.findByRole('region', { name: '按日课程表' }),
    ).toBeTruthy();

    const stored = readStoredSchedule();
    expect(stored.ok).toBe(true);
    if (stored.ok) {
      expect(stored.schedule.semester).toEqual(DEFAULT_SCHEDULE.semester);
      expect(stored.schedule.courses).toHaveLength(
        DEFAULT_SCHEDULE.courses.length,
      );
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('浏览器存储读取失败时临时展示内置课程并明确提示', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('storage blocked');
    });

    render(<Home />);
    expect(
      await screen.findByText(
        '浏览器存储不可用，当前仅临时显示初始课程，课程修改将无法持久保存。',
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '维护' }));
    expect(await screen.findByText('高等数学')).toBeTruthy();
  });

  it('按所选周过滤课程并展示空周状态', async () => {
    seedSchedule(
      scheduleWithCourses([
        {
          name: '第一周课程',
          teacher: '张老师',
          room: 'A101',
          weekday: 1,
          period: 'morning-1',
          weeks: '1',
        },
        {
          name: '第二周课程',
          teacher: '李老师',
          room: 'B201',
          weekday: 2,
          period: 'afternoon-1',
          weeks: '2',
        },
      ]),
    );

    render(<Home />);
    const dailySchedule = await screen.findByRole('region', {
      name: '按日课程表',
    });
    expect(screen.queryByRole('table')).toBeNull();
    fireEvent.click(within(dailySchedule).getByRole('tab', { name: /周一/ }));
    expect(await within(dailySchedule).findByText('第一周课程')).toBeTruthy();
    expect(screen.queryByText('第二周课程')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '下一周' }));
    expect(
      within(dailySchedule)
        .getByRole('tab', { name: /周一/ })
        .getAttribute('aria-selected'),
    ).toBe('true');
    fireEvent.click(within(dailySchedule).getByRole('tab', { name: /周二/ }));
    expect(await within(dailySchedule).findByText('第二周课程')).toBeTruthy();
    expect(screen.queryByText('第一周课程')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '下一周' }));
    expect(await screen.findByText('本周暂时没有课程安排')).toBeTruthy();
  });

  it('同一节次的多门课程都会展示', async () => {
    seedSchedule(
      scheduleWithCourses([
        {
          name: '课程甲',
          teacher: '甲老师',
          room: 'A101',
          weekday: 3,
          period: 'morning-2',
          weeks: '1',
        },
        {
          name: '课程乙',
          teacher: '乙老师',
          room: 'A102',
          weekday: 3,
          period: 'morning-2',
          weeks: '1',
        },
      ]),
    );

    render(<Home />);
    const dailySchedule = await screen.findByRole('region', {
      name: '按日课程表',
    });
    fireEvent.click(within(dailySchedule).getByRole('tab', { name: /周三/ }));
    expect(within(dailySchedule).getByText('课程甲')).toBeTruthy();
    expect(within(dailySchedule).getByText('课程乙')).toBeTruthy();
  });

  it('按日期标签切换当天课程，并展示空节次', async () => {
    seedSchedule(
      scheduleWithCourses([
        {
          name: '周二移动课程',
          teacher: '移动老师',
          room: 'M201',
          weekday: 2,
          period: 'afternoon-2',
          weeks: '1',
        },
      ]),
    );

    render(<Home />);
    const dailySchedule = await screen.findByRole('region', {
      name: '按日课程表',
    });
    const tuesdayTab = within(dailySchedule).getByRole('tab', { name: /周二/ });
    fireEvent.click(tuesdayTab);

    expect(tuesdayTab.getAttribute('aria-selected')).toBe('true');
    const panel = within(dailySchedule).getByRole('tabpanel');
    expect(within(panel).getByText('周二移动课程')).toBeTruthy();
    expect(within(panel).getAllByText('本节无课程')).toHaveLength(3);
  });

  it('新增课程后立即展示并保存到当前浏览器', async () => {
    seedSchedule(scheduleWithCourses([]));

    render(<Home />);
    fireEvent.click(await screen.findByRole('button', { name: '维护' }));
    expect(
      await screen.findByRole('heading', { name: '管理全部课程' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '新增' }));

    fireEvent.change(screen.getByLabelText('课程名称'), {
      target: { value: '本机新增课程' },
    });
    fireEvent.change(screen.getByLabelText('教师'), {
      target: { value: '新老师' },
    });
    fireEvent.change(screen.getByLabelText('教室'), {
      target: { value: '新教室 101' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存新课程' }));

    expect(await screen.findByText('本机新增课程')).toBeTruthy();
    const serialized = window.localStorage.getItem(SCHEDULE_STORAGE_KEY);
    expect(serialized).not.toBeNull();
    expect(serialized).not.toContain('parsedWeeks');

    fireEvent.click(screen.getByRole('button', { name: '返回课程表' }));
    expect(
      within(screen.getByRole('region', { name: '按日课程表' })).getByText(
        '本机新增课程',
      ),
    ).toBeTruthy();
    expect(screen.getByText('浏览器存储')).toBeTruthy();
  });

  it('新增课程时可勾选间隔周次并压缩保存', async () => {
    seedSchedule(scheduleWithCourses([], 12));

    render(<Home />);
    fireEvent.click(await screen.findByRole('button', { name: '维护' }));
    fireEvent.click(screen.getByRole('button', { name: '新增' }));

    for (const week of [2, 3, 4, 5, 7, 8, 9, 10]) {
      fireEvent.click(screen.getByRole('button', { name: `第 ${week} 周` }));
    }
    fireEvent.change(screen.getByLabelText('课程名称'), {
      target: { value: '间隔周课程' },
    });
    fireEvent.change(screen.getByLabelText('教师'), {
      target: { value: '周老师' },
    });
    fireEvent.change(screen.getByLabelText('教室'), {
      target: { value: 'A202' },
    });
    expect(screen.getByText('第 1–5、7–10 周')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '保存新课程' }));

    const stored = readStoredSchedule();
    expect(stored.ok).toBe(true);
    if (stored.ok) {
      expect(stored.schedule.courses[0].weeks).toBe('1-5,7-10');
      expect(stored.schedule.courses[0].parsedWeeks).toEqual([
        1, 2, 3, 4, 5, 7, 8, 9, 10,
      ]);
    }
  });

  it('提供全选、单周、双周和清空快捷选择', async () => {
    seedSchedule(scheduleWithCourses([], 6));

    render(<Home />);
    fireEvent.click(await screen.findByRole('button', { name: '维护' }));
    fireEvent.click(screen.getByRole('button', { name: '新增' }));

    fireEvent.click(screen.getByRole('button', { name: '单周' }));
    expect(
      screen
        .getByRole('button', { name: '第 1 周' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen
        .getByRole('button', { name: '第 2 周' })
        .getAttribute('aria-pressed'),
    ).toBe('false');
    expect(screen.getByText('第 1、3、5 周')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '双周' }));
    expect(screen.getByText('第 2、4、6 周')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '全选' }));
    expect(screen.getByText('第 1–6 周')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '清空' }));
    expect(screen.getByText('尚未选择周次')).toBeTruthy();
  });

  it('可以编辑并删除指定课程', async () => {
    seedSchedule(
      scheduleWithCourses([
        {
          name: '待修改课程',
          teacher: '原老师',
          room: '原教室',
          weekday: 1,
          period: 'morning-1',
          weeks: '1',
        },
        {
          name: '保留课程',
          teacher: '原老师',
          room: '原教室',
          weekday: 1,
          period: 'morning-1',
          weeks: '1',
        },
      ]),
    );

    render(<Home />);
    fireEvent.click(await screen.findByRole('button', { name: '维护' }));
    fireEvent.click(
      screen.getByRole('button', { name: '编辑课程：待修改课程' }),
    );
    fireEvent.change(screen.getByLabelText('课程名称'), {
      target: { value: '已修改课程' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));

    expect(await screen.findByText('已修改课程')).toBeTruthy();
    expect(screen.queryByText('待修改课程')).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: '删除课程：已修改课程' }),
    );
    expect(
      await screen.findByRole('heading', { name: '删除“已修改课程”？' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '删除课程' }));

    expect(screen.queryByText('已修改课程')).toBeNull();
    expect(screen.getByText('保留课程')).toBeTruthy();
  });

  it('内容完全相同的课程也能分别删除', async () => {
    const duplicateCourse = {
      name: '重复课程',
      teacher: '同一老师',
      room: '同一教室',
      weekday: 1,
      period: 'morning-1',
      weeks: '1',
    };
    seedSchedule(scheduleWithCourses([duplicateCourse, duplicateCourse]));

    render(<Home />);
    fireEvent.click(await screen.findByRole('button', { name: '维护' }));
    const deleteButtons = screen.getAllByRole('button', {
      name: '删除课程：重复课程',
    });
    expect(deleteButtons).toHaveLength(2);
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(
      await screen.findByRole('button', { name: '删除课程', hidden: false }),
    );

    expect(screen.getAllByText('重复课程')).toHaveLength(1);
  });

  it('必填课程字段为空时不会写入本地存储', async () => {
    seedSchedule(scheduleWithCourses([]));
    const storedBeforeSubmit =
      window.localStorage.getItem(SCHEDULE_STORAGE_KEY);

    render(<Home />);
    fireEvent.click(await screen.findByRole('button', { name: '维护' }));
    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    expect(
      screen
        .getByRole('button', { name: '第 1 周' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '保存新课程' }));

    expect(
      (await screen.findAllByText('必须是非空字符串')).length,
    ).toBeGreaterThanOrEqual(3);
    expect(window.localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(
      storedBeforeSubmit,
    );
  });

  it('未选择任何周次时不能保存课程', async () => {
    seedSchedule(scheduleWithCourses([]));

    render(<Home />);
    fireEvent.click(await screen.findByRole('button', { name: '维护' }));
    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    fireEvent.change(screen.getByLabelText('课程名称'), {
      target: { value: '无周次课程' },
    });
    fireEvent.change(screen.getByLabelText('教师'), {
      target: { value: '测试老师' },
    });
    fireEvent.change(screen.getByLabelText('教室'), {
      target: { value: '测试教室' },
    });
    fireEvent.click(screen.getByRole('button', { name: '清空' }));
    fireEvent.click(screen.getByRole('button', { name: '保存新课程' }));

    expect(await screen.findByText('请至少选择一个上课周次')).toBeTruthy();
    expect(screen.getByRole('button', { name: '保存新课程' })).toBeTruthy();
  });

  it('编辑其他信息时保留原有的不连续周次', async () => {
    seedSchedule(
      scheduleWithCourses([
        {
          name: '单双周课程',
          teacher: '原老师',
          room: '原教室',
          weekday: 3,
          period: 'morning-2',
          weeks: '1,3',
        },
      ]),
    );

    render(<Home />);
    fireEvent.click(await screen.findByRole('button', { name: '维护' }));
    expect(screen.getByText('第 1、3 周')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: '编辑课程：单双周课程' }),
    );
    expect(
      screen
        .getByRole('button', { name: '第 1 周' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen
        .getByRole('button', { name: '第 2 周' })
        .getAttribute('aria-pressed'),
    ).toBe('false');
    expect(
      screen
        .getByRole('button', { name: '第 3 周' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    fireEvent.change(screen.getByLabelText('教室'), {
      target: { value: '新教室' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }));

    const serialized = window.localStorage.getItem(SCHEDULE_STORAGE_KEY);
    expect(serialized).not.toBeNull();
    expect(JSON.parse(serialized as string).schedule.courses[0]).toMatchObject({
      room: '新教室',
      weeks: '1,3',
    });
  });

  it('优先加载版本 1 本地数据，且管理页不提供恢复入口', async () => {
    seedSchedule(
      scheduleWithCourses([
        {
          name: '本机课程',
          teacher: '本机老师',
          room: '本机教室',
          weekday: 2,
          period: 'morning-2',
          weeks: '1',
        },
      ]),
    );

    render(<Home />);
    fireEvent.click(await screen.findByRole('button', { name: '维护' }));
    expect(await screen.findByText('本机课程')).toBeTruthy();
    expect(screen.queryByText('高等数学')).toBeNull();
    expect(screen.queryByRole('button', { name: '恢复' })).toBeNull();
    const stored = readStoredSchedule();
    expect(stored.ok).toBe(true);
    if (stored.ok) {
      expect(stored.schedule.courses[0].name).toBe('本机课程');
    }
  });

  it('本机数据损坏时覆盖为内置课程并显示提示', async () => {
    window.localStorage.setItem(SCHEDULE_STORAGE_KEY, '{bad json');

    render(<Home />);
    expect(
      await screen.findByText(
        /本机课程数据不是有效的 JSON.*已恢复内置初始课程/,
      ),
    ).toBeTruthy();
    expect(readStoredSchedule().ok).toBe(true);
  });

  it('浏览器存储写入失败时不提交课程修改', async () => {
    seedSchedule(scheduleWithCourses([]));
    const storedBeforeSubmit =
      window.localStorage.getItem(SCHEDULE_STORAGE_KEY);

    render(<Home />);
    fireEvent.click(await screen.findByRole('button', { name: '维护' }));
    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    fireEvent.change(screen.getByLabelText('课程名称'), {
      target: { value: '无法保存的课程' },
    });
    fireEvent.change(screen.getByLabelText('教师'), {
      target: { value: '测试老师' },
    });
    fireEvent.change(screen.getByLabelText('教室'), {
      target: { value: '测试教室' },
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded');
    });
    fireEvent.click(screen.getByRole('button', { name: '保存新课程' }));

    expect(
      (await screen.findAllByText('无法写入浏览器本地存储，课程修改没有保存。'))
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '保存新课程' })).toBeTruthy();
    expect(window.localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(
      storedBeforeSubmit,
    );
  });

  it('本机数据字段不合法时自动恢复且保留字段提示', async () => {
    window.localStorage.setItem(
      SCHEDULE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        schedule: scheduleWithCourses([
          {
            name: '错误课程',
            teacher: '教师',
            room: '教室',
            weekday: 9,
            period: 'morning-1',
            weeks: '1',
          },
        ]),
      }),
    );

    render(<Home />);
    expect(
      await screen.findByText(
        /courses\[0\]\.weekday 必须是 1-5.*已恢复内置初始课程/,
      ),
    ).toBeTruthy();
    expect(readStoredSchedule().ok).toBe(true);
  });
});
