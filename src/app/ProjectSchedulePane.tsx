import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import {
  HOURS_PER_DAY,
  formatTimeOfDayHours
} from "../document/project-time-settings";
import type { ProjectNpcActorRecord } from "../entities/npc-actor-registry";
import {
  PROJECT_SCHEDULE_WEEKDAYS,
  formatProjectScheduleDaySelection,
  formatProjectScheduleWeekdayLabel,
  getProjectScheduleTimelineSegments,
  type ProjectScheduler,
  type ProjectScheduleRoutine,
  type ProjectScheduleWeekday
} from "../scheduler/project-scheduler";

interface ProjectSchedulePaneProps {
  actors: ProjectNpcActorRecord[];
  scheduler: ProjectScheduler;
  selectedRoutineId: string | null;
  onSelectRoutine(routineId: string | null): void;
  onAddRoutine(actorId: string): void;
  onDeleteRoutine(routineId: string): void;
  onClose(): void;
  onSetRoutineActor(routineId: string, actorId: string): void;
  onSetRoutineTitle(routineId: string, title: string): void;
  onSetRoutineEnabled(routineId: string, enabled: boolean): void;
  onSetRoutineStartHour(routineId: string, startHour: number): void;
  onSetRoutineEndHour(routineId: string, endHour: number): void;
  onSetRoutinePriority(routineId: string, priority: number): void;
  onSetRoutinePresence(routineId: string, active: boolean): void;
  onSetRoutineDays(
    routineId: string,
    mode: "everyDay" | "selectedDays",
    days: ProjectScheduleWeekday[]
  ): void;
}

function handleCommitOnEnter(
  event: ReactKeyboardEvent<HTMLInputElement>,
  commit: () => void
) {
  if (event.key !== "Enter") {
    return;
  }

  event.currentTarget.blur();
  commit();
}

function getRoutineSummary(routine: ProjectScheduleRoutine): string {
  return `${formatProjectScheduleDaySelection(routine.days)} · ${formatTimeOfDayHours(routine.startHour)}-${formatTimeOfDayHours(routine.endHour)} · P${routine.priority}`;
}

export function ProjectSchedulePane({
  actors,
  scheduler,
  selectedRoutineId,
  onSelectRoutine,
  onAddRoutine,
  onDeleteRoutine,
  onClose,
  onSetRoutineActor,
  onSetRoutineTitle,
  onSetRoutineEnabled,
  onSetRoutineStartHour,
  onSetRoutineEndHour,
  onSetRoutinePriority,
  onSetRoutinePresence,
  onSetRoutineDays
}: ProjectSchedulePaneProps) {
  const selectedRoutine =
    selectedRoutineId === null ? null : scheduler.routines[selectedRoutineId] ?? null;
  const hourTicks = Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour);
  const selectedRoutineDays =
    selectedRoutine === null
      ? PROJECT_SCHEDULE_WEEKDAYS
      : selectedRoutine.days.mode === "everyDay"
        ? PROJECT_SCHEDULE_WEEKDAYS
        : selectedRoutine.days.days;

  return (
    <section className="schedule-pane" data-testid="project-schedule-pane">
      <div className="schedule-pane__header">
        <div>
          <div className="label">Schedule</div>
          <div className="schedule-pane__summary">
            Scheduler-owned actor orchestration over global project time.
          </div>
        </div>
        <div className="schedule-pane__actions">
          <button
            className="toolbar__button toolbar__button--compact"
            type="button"
            disabled={actors.length === 0}
            onClick={() =>
              onAddRoutine(
                selectedRoutine?.target.actorId ?? actors[0]?.actorId ?? ""
              )
            }
          >
            Add Routine
          </button>
          <button
            className="toolbar__button toolbar__button--compact"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      <div className="schedule-pane__body">
        <div className="schedule-pane__timeline">
          <div className="schedule-ruler">
            <div className="schedule-ruler__label">Actors</div>
            <div className="schedule-ruler__track">
              {hourTicks.map((hour) => (
                <div key={hour} className="schedule-ruler__tick">
                  <span>{String(hour).padStart(2, "0")}</span>
                </div>
              ))}
            </div>
          </div>

          {actors.length === 0 ? (
            <div className="schedule-pane__empty">
              No NPC actors are authored in this project yet.
            </div>
          ) : (
            actors.map((actor) => {
              const routines = Object.values(scheduler.routines)
                .filter(
                  (routine) =>
                    routine.target.kind === "actor" &&
                    routine.target.actorId === actor.actorId
                )
                .sort((left, right) => left.startHour - right.startHour);

              return (
                <div key={actor.actorId} className="schedule-row">
                  <div className="schedule-row__label">
                    <button
                      className="schedule-row__add"
                      type="button"
                      onClick={() => onAddRoutine(actor.actorId)}
                    >
                      +
                    </button>
                    <div className="schedule-row__meta">
                      <div className="schedule-row__title">{actor.label}</div>
                      <div className="schedule-row__subtitle">
                        {actor.actorId}
                        {actor.usages.length > 1
                          ? ` · ${actor.usages.length} usages`
                          : ""}
                      </div>
                    </div>
                  </div>
                  <div className="schedule-row__track">
                    <div className="schedule-row__grid" />
                    {routines.map((routine) =>
                      getProjectScheduleTimelineSegments(routine).map(
                        (segment) => (
                          <button
                            key={segment.key}
                            className={`schedule-block ${
                              selectedRoutineId === routine.id
                                ? "schedule-block--selected"
                                : ""
                            } ${routine.effect.active ? "" : "schedule-block--inactive"} ${
                              routine.enabled ? "" : "schedule-block--disabled"
                            }`.trim()}
                            type="button"
                            title={`${routine.title} · ${getRoutineSummary(routine)}`}
                            style={{
                              left: `${(segment.startHour / HOURS_PER_DAY) * 100}%`,
                              width: `${((segment.endHour - segment.startHour) / HOURS_PER_DAY) * 100}%`
                            }}
                            onClick={() => onSelectRoutine(routine.id)}
                          >
                            <span className="schedule-block__title">
                              {routine.title}
                            </span>
                          </button>
                        )
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <aside className="schedule-pane__editor">
          {selectedRoutine === null ? (
            <div className="schedule-pane__empty">
              Select a routine block or create a new actor routine.
            </div>
          ) : (
            <>
              <div className="form-section">
                <div className="label">Routine</div>
                <label className="form-field">
                  <span className="label">Title</span>
                  <input
                    key={`${selectedRoutine.id}-title`}
                    className="text-input"
                    type="text"
                    defaultValue={selectedRoutine.title}
                    onBlur={(event) =>
                      onSetRoutineTitle(
                        selectedRoutine.id,
                        event.currentTarget.value
                      )
                    }
                    onKeyDown={(event) =>
                      handleCommitOnEnter(event, () =>
                        onSetRoutineTitle(
                          selectedRoutine.id,
                          event.currentTarget.value
                        )
                      )
                    }
                  />
                </label>
                <label className="form-field">
                  <span className="label">Actor</span>
                  <select
                    className="select-input"
                    value={selectedRoutine.target.actorId}
                    onChange={(event) =>
                      onSetRoutineActor(
                        selectedRoutine.id,
                        event.currentTarget.value
                      )
                    }
                  >
                    {actors.map((actor) => (
                      <option key={actor.actorId} value={actor.actorId}>
                        {actor.label} ({actor.actorId})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field form-field--inline">
                  <input
                    type="checkbox"
                    checked={selectedRoutine.enabled}
                    onChange={(event) =>
                      onSetRoutineEnabled(
                        selectedRoutine.id,
                        event.currentTarget.checked
                      )
                    }
                  />
                  <span className="label">Enabled</span>
                </label>
              </div>

              <div className="form-section">
                <div className="label">Days</div>
                <div className="schedule-days">
                  <button
                    className={`schedule-day ${
                      selectedRoutine.days.mode === "everyDay"
                        ? "schedule-day--active"
                        : ""
                    }`.trim()}
                    type="button"
                    onClick={() =>
                      onSetRoutineDays(selectedRoutine.id, "everyDay", [])
                    }
                  >
                    Every
                  </button>
                  {PROJECT_SCHEDULE_WEEKDAYS.map((weekday) => {
                    const selected = selectedRoutineDays.includes(weekday);
                    const nextDays =
                      selectedRoutine.days.mode === "everyDay"
                        ? PROJECT_SCHEDULE_WEEKDAYS.filter(
                            (entry) => entry !== weekday
                          )
                        : selected
                          ? selectedRoutineDays.filter(
                              (entry) => entry !== weekday
                            )
                          : [...selectedRoutineDays, weekday];

                    return (
                      <button
                        key={weekday}
                        className={`schedule-day ${
                          selected ? "schedule-day--active" : ""
                        }`.trim()}
                        type="button"
                        onClick={() =>
                          onSetRoutineDays(
                            selectedRoutine.id,
                            nextDays.length === PROJECT_SCHEDULE_WEEKDAYS.length
                              ? "everyDay"
                              : "selectedDays",
                            nextDays.length === 0 ? [weekday] : nextDays
                          )
                        }
                      >
                        {formatProjectScheduleWeekdayLabel(weekday)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-section">
                <div className="label">Window</div>
                <div className="vector-inputs vector-inputs--two">
                  <label className="form-field">
                    <span className="label">Start</span>
                    <input
                      key={`${selectedRoutine.id}-start`}
                      className="text-input"
                      type="number"
                      min="0"
                      max="24"
                      step="0.25"
                      defaultValue={selectedRoutine.startHour}
                      onBlur={(event) =>
                        onSetRoutineStartHour(
                          selectedRoutine.id,
                          Number(event.currentTarget.value)
                        )
                      }
                      onKeyDown={(event) =>
                        handleCommitOnEnter(event, () =>
                          onSetRoutineStartHour(
                            selectedRoutine.id,
                            Number(event.currentTarget.value)
                          )
                        )
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span className="label">End</span>
                    <input
                      key={`${selectedRoutine.id}-end`}
                      className="text-input"
                      type="number"
                      min="0"
                      max="24"
                      step="0.25"
                      defaultValue={selectedRoutine.endHour}
                      onBlur={(event) =>
                        onSetRoutineEndHour(
                          selectedRoutine.id,
                          Number(event.currentTarget.value)
                        )
                      }
                      onKeyDown={(event) =>
                        handleCommitOnEnter(event, () =>
                          onSetRoutineEndHour(
                            selectedRoutine.id,
                            Number(event.currentTarget.value)
                          )
                        )
                      }
                    />
                  </label>
                </div>
                <div className="vector-inputs vector-inputs--two">
                  <label className="form-field">
                    <span className="label">Priority</span>
                    <input
                      key={`${selectedRoutine.id}-priority`}
                      className="text-input"
                      type="number"
                      step="1"
                      defaultValue={selectedRoutine.priority}
                      onBlur={(event) =>
                        onSetRoutinePriority(
                          selectedRoutine.id,
                          Number(event.currentTarget.value)
                        )
                      }
                      onKeyDown={(event) =>
                        handleCommitOnEnter(event, () =>
                          onSetRoutinePriority(
                            selectedRoutine.id,
                            Number(event.currentTarget.value)
                          )
                        )
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span className="label">Effect</span>
                    <select
                      className="select-input"
                      value={selectedRoutine.effect.active ? "present" : "hidden"}
                      onChange={(event) =>
                        onSetRoutinePresence(
                          selectedRoutine.id,
                          event.currentTarget.value === "present"
                        )
                      }
                    >
                      <option value="present">Present</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </label>
                </div>
                <div className="material-summary">
                  {getRoutineSummary(selectedRoutine)}
                </div>
                <div className="material-summary">
                  Over-midnight windows are rendered as split blocks and resolve
                  deterministically from project-global day/time.
                </div>
              </div>

              <button
                className="toolbar__button toolbar__button--compact toolbar__button--warn"
                type="button"
                onClick={() => onDeleteRoutine(selectedRoutine.id)}
              >
                Delete Routine
              </button>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
