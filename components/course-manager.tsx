'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CircleCheck,
  Database,
  Edit3,
  MapPin,
  Plus,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  formatWeeks,
  getCoursePalette,
  parseSchedule,
  parseWeeks,
  PERIODS,
  WEEKDAYS,
  type PeriodId,
  type ScheduleFile,
  type Weekday,
} from '@/lib/schedule';
import {
  toEditableSchedule,
  type EditableCourseRecord,
  type EditableScheduleFile,
  type ScheduleMutationResult,
  type ScheduleNotice,
} from '@/lib/schedule-storage';

type EditorState = { mode: 'create' } | { mode: 'edit'; courseIndex: number };

type CourseManagerProps = {
  schedule: ScheduleFile;
  selectedWeek: number;
  selectedDay: Weekday;
  notice: ScheduleNotice | null;
  onDismissNotice: () => void;
  onClose: () => void;
  onSaveSchedule: (schedule: EditableScheduleFile) => ScheduleMutationResult;
};

export function CourseManager({
  schedule,
  selectedWeek,
  selectedDay,
  notice,
  onDismissNotice,
  onClose,
  onSaveSchedule,
}: CourseManagerProps) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const editingCourse =
    editor?.mode === 'edit' ? schedule.courses[editor.courseIndex] : undefined;
  const deleteCourse =
    deleteIndex === null ? undefined : schedule.courses[deleteIndex];

  function saveCourse(course: EditableCourseRecord) {
    const nextSchedule = toEditableSchedule(schedule);
    if (editor?.mode === 'edit') {
      nextSchedule.courses[editor.courseIndex] = course;
    } else {
      nextSchedule.courses.push(course);
    }

    const result = onSaveSchedule(nextSchedule);
    if (!result.ok) {
      setOperationError(result.message);
      return result;
    }

    setOperationError(null);
    setEditor(null);
    return result;
  }

  function confirmDelete() {
    if (deleteIndex === null) return;
    const nextSchedule = toEditableSchedule(schedule);
    nextSchedule.courses.splice(deleteIndex, 1);
    const result = onSaveSchedule(nextSchedule);
    if (!result.ok) {
      setOperationError(result.message);
      return;
    }

    setOperationError(null);
    setDeleteIndex(null);
  }

  return (
    <main className="schedule-app manage-page">
      <div className="paper-grid" aria-hidden="true" />
      <div className="orb orb-one" aria-hidden="true" />
      <div className="orb orb-two" aria-hidden="true" />

      <div className="page-shell">
        <header className="manager-topbar">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="manager-back"
            onClick={onClose}
            aria-label="返回课程表"
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          <div>
            <strong>课程维护</strong>
            <small>{schedule.courses.length} 门课程</small>
          </div>
          <Button
            type="button"
            size="lg"
            className="manager-add"
            onClick={() => setEditor({ mode: 'create' })}
          >
            <Plus aria-hidden="true" />
            新增
          </Button>
        </header>

        <section className="manager-workspace" aria-label="课程维护">
          <div className="manager-intro">
            <div className="manager-intro-icon" aria-hidden="true">
              <BookOpen />
            </div>
            <div>
              <h1>管理全部课程</h1>
              <p>课程保存在当前浏览器，不会同步到其他设备。</p>
            </div>
          </div>

          <div className="data-source-row">
            <span className="data-source-badge data-source-local">
              <Database aria-hidden="true" />
              浏览器本地数据
            </span>
            <span>共 {schedule.courses.length} 门</span>
          </div>

          {notice && (
            <ScheduleNoticeBanner notice={notice} onDismiss={onDismissNotice} />
          )}
          {operationError && (
            <div className="operation-error" role="alert">
              <AlertTriangle aria-hidden="true" />
              <span>{operationError}</span>
            </div>
          )}

          {schedule.courses.length > 0 ? (
            <div className="manage-course-list">
              {schedule.courses.map((course, courseIndex) => {
                const courseWeeks = formatWeeks(
                  course.parsedWeeks,
                  schedule.semester.totalWeeks,
                );
                return (
                  <article
                    className="manage-course-card"
                    data-palette={getCoursePalette(course.name)}
                    key={courseIndex}
                  >
                    <span className="manage-course-accent" aria-hidden="true" />
                    <div className="manage-course-content">
                      <div className="manage-course-title">
                        <h2>{course.name}</h2>
                        <span>
                          {weekdayLabel(course.weekday)} ·{' '}
                          {periodLabel(course.period)}
                        </span>
                      </div>
                      <div className="manage-course-progress">
                        <span>上课周次</span>
                        <strong>第 {displayWeeks(courseWeeks)} 周</strong>
                      </div>
                      <div className="manage-course-meta">
                        <span>
                          <MapPin aria-hidden="true" />
                          {course.room}
                        </span>
                        <span>
                          <UserRound aria-hidden="true" />
                          {course.teacher}
                        </span>
                      </div>
                    </div>
                    <div className="manage-course-actions">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        onClick={() => setEditor({ mode: 'edit', courseIndex })}
                        aria-label={`编辑课程：${course.name}`}
                      >
                        <Edit3 aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        className="delete-course-button"
                        onClick={() => setDeleteIndex(courseIndex)}
                        aria-label={`删除课程：${course.name}`}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-manager-list">
              <BookOpen aria-hidden="true" />
              <strong>还没有课程</strong>
              <p>点击右上角“新增”，创建第一门课程。</p>
            </div>
          )}
        </section>
      </div>

      {editor && (
        <CourseEditorSheet
          key={
            editor.mode === 'edit'
              ? `edit-${editor.courseIndex}`
              : `create-${selectedWeek}-${selectedDay}`
          }
          mode={editor.mode}
          initialCourse={
            editingCourse
              ? toEditableSchedule({
                  ...schedule,
                  courses: [editingCourse],
                }).courses[0]
              : {
                  name: '',
                  teacher: '',
                  room: '',
                  weekday: selectedDay,
                  period: 'morning-1',
                  weeks: String(selectedWeek),
                }
          }
          semester={schedule.semester}
          operationError={operationError}
          onSave={saveCourse}
          onClose={() => {
            setOperationError(null);
            setEditor(null);
          }}
        />
      )}

      <AlertDialog
        open={deleteIndex !== null}
        onOpenChange={(open) => !open && setDeleteIndex(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除“{deleteCourse?.name}”？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后会立即保存到当前浏览器，且无法撤销。需要再次使用时请重新添加课程。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              删除课程
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

type CourseEditorSheetProps = {
  mode: EditorState['mode'];
  initialCourse: EditableCourseRecord;
  semester: ScheduleFile['semester'];
  operationError: string | null;
  onSave: (course: EditableCourseRecord) => ScheduleMutationResult;
  onClose: () => void;
};

type CourseField = keyof EditableCourseRecord;
type CourseFormErrors = Partial<Record<CourseField | 'form', string>>;

function CourseEditorSheet({
  mode,
  initialCourse,
  semester,
  operationError,
  onSave,
  onClose,
}: CourseEditorSheetProps) {
  const [values, setValues] = useState<EditableCourseRecord>(initialCourse);
  const [errors, setErrors] = useState<CourseFormErrors>({});
  const [selectedWeeks, setSelectedWeeks] = useState(() =>
    parseWeeks(initialCourse.weeks, semester.totalWeeks),
  );
  const weekOptions = Array.from(
    { length: semester.totalWeeks },
    (_, index) => index + 1,
  );
  const selectedWeeksExpression =
    selectedWeeks.length > 0
      ? formatWeeks(selectedWeeks, semester.totalWeeks)
      : '';

  function updateValue<Key extends CourseField>(
    key: Key,
    value: EditableCourseRecord[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  }

  function updateSelectedWeeks(weeks: number[]) {
    setSelectedWeeks([...weeks].sort((a, b) => a - b));
    setErrors((current) => ({
      ...current,
      weeks: undefined,
      form: undefined,
    }));
  }

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedWeeks.length === 0) {
      setErrors((current) => ({
        ...current,
        weeks: '请至少选择一个上课周次',
      }));
      return;
    }

    const result = parseSchedule({
      semester,
      courses: [{ ...values, weeks: selectedWeeksExpression }],
    });

    if (!result.ok) {
      setErrors(mapCourseErrors(result.errors));
      return;
    }

    const normalized = toEditableSchedule(result.data).courses[0];
    const saveResult = onSave(normalized);
    if (!saveResult.ok) {
      setErrors({ form: saveResult.message });
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="course-editor-sheet"
        aria-describedby="course-editor-description"
      >
        <form className="course-editor-form" onSubmit={handleSubmit} noValidate>
          <SheetHeader className="course-editor-header">
            <SheetTitle>
              {mode === 'create' ? '新增课程' : '编辑课程'}
            </SheetTitle>
            <SheetDescription id="course-editor-description">
              保存后立即更新课程表，并保留在当前浏览器。
            </SheetDescription>
          </SheetHeader>

          <div className="course-editor-fields">
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="course-name">课程名称</FieldLabel>
              <Input
                id="course-name"
                value={values.name}
                onChange={(event) => updateValue('name', event.target.value)}
                placeholder="例如：高等数学"
                aria-invalid={Boolean(errors.name)}
              />
              <FieldError>{errors.name}</FieldError>
            </Field>

            <div className="course-editor-grid">
              <Field data-invalid={Boolean(errors.teacher)}>
                <FieldLabel htmlFor="course-teacher">教师</FieldLabel>
                <Input
                  id="course-teacher"
                  value={values.teacher}
                  onChange={(event) =>
                    updateValue('teacher', event.target.value)
                  }
                  placeholder="教师姓名"
                  aria-invalid={Boolean(errors.teacher)}
                />
                <FieldError>{errors.teacher}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.room)}>
                <FieldLabel htmlFor="course-room">教室</FieldLabel>
                <Input
                  id="course-room"
                  value={values.room}
                  onChange={(event) => updateValue('room', event.target.value)}
                  placeholder="教学楼与房间"
                  aria-invalid={Boolean(errors.room)}
                />
                <FieldError>{errors.room}</FieldError>
              </Field>
            </div>

            <div className="course-editor-grid">
              <Field data-invalid={Boolean(errors.weekday)}>
                <FieldLabel>星期</FieldLabel>
                <Select
                  value={String(values.weekday)}
                  onValueChange={(value) =>
                    value && updateValue('weekday', Number(value) as Weekday)
                  }
                >
                  <SelectTrigger
                    className="editor-select"
                    aria-label="选择星期"
                    aria-invalid={Boolean(errors.weekday)}
                  >
                    <SelectValue>{weekdayLabel(values.weekday)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((weekday) => (
                      <SelectItem
                        key={weekday.value}
                        value={String(weekday.value)}
                      >
                        {weekday.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.weekday}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.period)}>
                <FieldLabel>节次</FieldLabel>
                <Select
                  value={values.period}
                  onValueChange={(value) =>
                    value && updateValue('period', value as PeriodId)
                  }
                >
                  <SelectTrigger
                    className="editor-select"
                    aria-label="选择节次"
                    aria-invalid={Boolean(errors.period)}
                  >
                    <SelectValue>{periodLabel(values.period)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.period}</FieldError>
              </Field>
            </div>

            <fieldset
              className="week-selection-field"
              aria-invalid={Boolean(errors.weeks)}
            >
              <legend>
                <span>上课周次</span>
                <small>可多选</small>
              </legend>

              <div className="week-preset-actions" aria-label="周次快捷选择">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateSelectedWeeks(weekOptions)}
                >
                  全选
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateSelectedWeeks(
                      weekOptions.filter((week) => week % 2 === 1),
                    )
                  }
                >
                  单周
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateSelectedWeeks(
                      weekOptions.filter((week) => week % 2 === 0),
                    )
                  }
                >
                  双周
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateSelectedWeeks([])}
                >
                  清空
                </Button>
              </div>

              <ToggleGroup
                multiple
                value={selectedWeeks.map(String)}
                onValueChange={(weeks) =>
                  updateSelectedWeeks(weeks.map(Number))
                }
                className="week-toggle-grid"
                aria-label="选择上课周次"
              >
                {weekOptions.map((week) => (
                  <ToggleGroupItem
                    key={week}
                    value={String(week)}
                    variant="outline"
                    size="lg"
                    className="week-toggle"
                    aria-label={`第 ${week} 周`}
                  >
                    {week}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <div
                className={`week-selection-preview${selectedWeeks.length === 0 ? ' is-empty' : ''}`}
              >
                <span>
                  {selectedWeeks.length > 0
                    ? `已选 ${selectedWeeks.length} 周`
                    : '尚未选择周次'}
                </span>
                <small>
                  {selectedWeeksExpression
                    ? `第 ${displayWeeks(selectedWeeksExpression)} 周`
                    : '请点击上方周次'}
                </small>
              </div>
              <FieldError>{errors.weeks}</FieldError>
            </fieldset>

            {(errors.form || operationError) && (
              <div className="editor-form-error" role="alert">
                <AlertTriangle aria-hidden="true" />
                <span>{errors.form ?? operationError}</span>
              </div>
            )}
          </div>

          <SheetFooter className="course-editor-footer">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" size="lg">
              {mode === 'create' ? '保存新课程' : '保存修改'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function ScheduleNoticeBanner({
  notice,
  onDismiss,
}: {
  notice: ScheduleNotice;
  onDismiss: () => void;
}) {
  const Icon = notice.tone === 'success' ? CircleCheck : AlertTriangle;
  return (
    <output
      className={`schedule-notice schedule-notice-${notice.tone}`}
      aria-live="polite"
    >
      <Icon aria-hidden="true" />
      <span>{notice.message}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onDismiss}
        aria-label="关闭提示"
      >
        <X aria-hidden="true" />
      </Button>
    </output>
  );
}

function mapCourseErrors(messages: string[]): CourseFormErrors {
  const errors: CourseFormErrors = {};
  for (const message of messages) {
    const match =
      /^courses\[0\]\.(name|teacher|room|weekday|period|weeks)/.exec(message);
    if (match) {
      errors[match[1] as CourseField] = message
        .replace(/^courses\[0\]\.[^： ]+[： ]?/, '')
        .trim();
    } else {
      errors.form = message;
    }
  }
  return errors;
}

function periodLabel(periodId: PeriodId) {
  return PERIODS.find((period) => period.id === periodId)?.label ?? periodId;
}

function weekdayLabel(weekdayValue: Weekday) {
  return (
    WEEKDAYS.find((weekday) => weekday.value === weekdayValue)?.label ??
    String(weekdayValue)
  );
}

function displayWeeks(weeks: string) {
  return weeks.replaceAll('-', '–').replaceAll(',', '、');
}
