import { createOpaqueId } from "../core/ids";
import {
  cloneProjectScheduler,
  type ProjectScheduler
} from "../scheduler/project-scheduler";

import type { EditorCommand } from "./command";

interface SetProjectSchedulerCommandOptions {
  label: string;
  scheduler: ProjectScheduler;
}

export function createSetProjectSchedulerCommand(
  options: SetProjectSchedulerCommandOptions
): EditorCommand {
  const nextScheduler = cloneProjectScheduler(options.scheduler);
  let previousScheduler: ProjectScheduler | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label,
    execute(context) {
      const currentProjectDocument = context.getProjectDocument();

      if (previousScheduler === null) {
        previousScheduler = cloneProjectScheduler(
          currentProjectDocument.scheduler
        );
      }

      context.setProjectDocument({
        ...currentProjectDocument,
        scheduler: cloneProjectScheduler(nextScheduler)
      });
    },
    undo(context) {
      if (previousScheduler === null) {
        return;
      }

      const currentProjectDocument = context.getProjectDocument();
      context.setProjectDocument({
        ...currentProjectDocument,
        scheduler: cloneProjectScheduler(previousScheduler)
      });
    }
  };
}
