# Study planner

## Daily and weekly schedule
The plan page replaces the old generic course roadmap. Learners choose an existing TOEIC target, optional deadline, device-local weekdays, daily focus minutes, distinct vocabulary cards, distinct answered questions and rotating lesson topics from the reviewed bank. The dashboard links to today's plan.

Day snapshots freeze when first opened or when an activity is recorded. Changing settings affects days without snapshots, never silently changes today's targets or past records. Future days are forecasts; historical days with no snapshot show no recorded data. No previous activity is reconstructed or credited retroactively.

## Evidence of task progress
- Lesson: explicit read-understood action, reversible on the same day.
- Vocabulary: a card is flipped and rated; repeated ratings of the same card count once that day.
- Questions: distinct question IDs with a nonempty answer returned from successful server grading. Empty items or failed requests do not count.
- Mistakes: up to five existing wrong question IDs captured with the day plan, counted when answered again. This means retried, not necessarily corrected.
- Focus: elapsed time from the existing timer at pause/end/pagehide, split across local calendar midnight. Video time is not inferred.

Rest days still log voluntary activity. The weekly completion total includes only recorded days through today, excluding forecasts. The point goal is an aspiration; no score prediction, official TOEIC Part coverage or unverified listening task is invented.

## Persistence
Planner config, snapshots and activity live under learning.planner in toeic-studio-learning-v1. sanitizeLearning validates them on load and JSON/account backup restore. Existing manual backup and export include this state; no new server tables or permissions are introduced. Daily planner data is bounded to the latest 730 recorded dates. Date interpretation uses the device timezone and does not migrate old days when timezone changes. Older app versions cannot restore new planner fields.

No automatic cloud merge, notifications or adaptive score model is implemented. Listening/Reading Part schedules wait for the corresponding reviewed content bank.

## Validation
node --test tests/planner.test.mjs covers stable targets, distinct counts, midnight splitting, rest days, malformed imports, and JSON/learning-state round trips. Existing learning, activities, backend and content-admin checks also pass. Browser QA covers setup, cards, read marking, server-graded practice, refresh persistence and weekly navigation.

Planner vocabulary links prioritize overdue cards, then unseen cards, then future-due cards. The normal vocabulary/card views keep their existing order.
