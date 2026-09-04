import { parseSchedule, type ScheduleFile } from '@/lib/schedule';

const initialSchedule = {
  semester: {
    name: '2026 秋季学期',
    startDate: '2026-08-31',
    totalWeeks: 20,
  },
  courses: [
    {
      name: '高等数学',
      teacher: '陈老师',
      room: '博学楼 A201',
      weekday: 1,
      period: 'morning-1',
      weeks: '1-16',
    },
    {
      name: '大学英语',
      teacher: '林老师',
      room: '致远楼 305',
      weekday: 2,
      period: 'morning-2',
      weeks: '1-16',
    },
    {
      name: '数据结构',
      teacher: '周老师',
      room: '信息楼 C402',
      weekday: 3,
      period: 'afternoon-1',
      weeks: '1-18',
    },
    {
      name: '计算机网络',
      teacher: '吴老师',
      room: '信息楼 C305',
      weekday: 4,
      period: 'morning-1',
      weeks: '1-16',
    },
    {
      name: '产品设计方法',
      teacher: '沈老师',
      room: '创意工坊 2',
      weekday: 5,
      period: 'afternoon-2',
      weeks: '1-8,11-16',
    },
    {
      name: '操作系统',
      teacher: '许老师',
      room: '信息楼 B410',
      weekday: 1,
      period: 'afternoon-2',
      weeks: '2-18',
    },
    {
      name: '大学体育',
      teacher: '宋老师',
      room: '东区体育馆',
      weekday: 3,
      period: 'morning-1',
      weeks: '1,3,5,7,9,11,13,15',
    },
    {
      name: '创新实践',
      teacher: '罗老师',
      room: '双创中心 108',
      weekday: 5,
      period: 'afternoon-1',
      weeks: '9-18',
    },
    {
      name: '职业发展指导',
      teacher: '顾老师',
      room: '大学生活动中心',
      weekday: 5,
      period: 'afternoon-2',
      weeks: '9-10',
    },
  ],
};

const parsedInitialSchedule = parseSchedule(initialSchedule);

if (!parsedInitialSchedule.ok) {
  throw new Error(
    `内置初始课程配置无效：${parsedInitialSchedule.errors.join('；')}`,
  );
}

export const DEFAULT_SCHEDULE: ScheduleFile = parsedInitialSchedule.data;
