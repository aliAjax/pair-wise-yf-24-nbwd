import { ref } from "vue";
import { mergeOfflineChangeSet } from "../utils/mergeEngine";
import type { OfflineChangeSet } from "../types/OfflineChangeSet";
import type { MergeReport } from "../types/MergeReport";

export function useOfflineMerge() {
  const running = ref(false);
  const report = ref<MergeReport | null>(null);
  const progress = ref({ done: 0, total: 0 });
  const error = ref("");
  let abortFlag = false;

  async function run(changeSet: OfflineChangeSet, itemDelayMs = 150): Promise<MergeReport> {
    abortFlag = false;
    running.value = true;
    error.value = "";
    try {
      const result = await mergeOfflineChangeSet(changeSet, {
        shouldAbort: () => abortFlag,
        onItemMerged: (_id, done, total) => { progress.value = { done, total }; },
        itemDelayMs
      });
      report.value = result;
      progress.value = { done: result.item_outcomes.length, total: result.item_outcomes.length };
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      running.value = false;
    }
  }

  function abort() {
    abortFlag = true;
  }

  return { running, report, progress, error, run, abort };
}
