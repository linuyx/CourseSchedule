import { parseSchedule, type ScheduleFile } from '@/lib/schedule';

const initialSchedule = {
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
};

const parsedInitialSchedule = parseSchedule(initialSchedule);

if (!parsedInitialSchedule.ok) {
  throw new Error(
    `内置初始课程配置无效：${parsedInitialSchedule.errors.join('；')}`,
  );
}

export const DEFAULT_SCHEDULE: ScheduleFile = parsedInitialSchedule.data;
