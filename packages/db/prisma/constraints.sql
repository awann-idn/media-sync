DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_internal_before_official') THEN
    ALTER TABLE "Task" ADD CONSTRAINT task_internal_before_official
      CHECK ("internalDeadline" < "officialDeadline");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_completed_requires_url') THEN
    ALTER TABLE "Task" ADD CONSTRAINT task_completed_requires_url
      CHECK ("status" <> 'COMPLETED' OR "deliverableUrl" IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_backup_not_assignee') THEN
    ALTER TABLE "Task" ADD CONSTRAINT task_backup_not_assignee
      CHECK ("backupUserId" IS NULL OR "backupUserId" <> "assignedUserId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluation_entry_score_range') THEN
    ALTER TABLE "EvaluationEntry" ADD CONSTRAINT evaluation_entry_score_range
      CHECK ("score" BETWEEN 1 AND 5);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decision_score_range') THEN
    ALTER TABLE "DecisionScore" ADD CONSTRAINT decision_score_range
      CHECK ("score" BETWEEN 1 AND 5);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_dependency_no_self') THEN
    ALTER TABLE "TaskDependency" ADD CONSTRAINT task_dependency_no_self
      CHECK ("taskId" <> "dependsOnTaskId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'change_request_requires_meeting') THEN
    ALTER TABLE "ChangeRequest" ADD CONSTRAINT change_request_requires_meeting
      CHECK ("meetingId" IS NOT NULL AND length("meetingId") > 0);
  END IF;
END $$;
