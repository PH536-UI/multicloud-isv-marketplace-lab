import { deliverUsage } from "./adapters.js";
import { claimOutbox, getUsage, markOutboxDelivered, markOutboxRetry } from "./store.js";

function retryDelay(attempt) {
  return Math.min(3600, 30 * (2 ** Math.min(attempt - 1, 6)));
}

export async function processOutbox({ limit = 25, deliveryMode, now = new Date().toISOString(), deliver = deliverUsage } = {}) {
  const claimed = claimOutbox(limit, now);
  const result = { claimed: claimed.length, delivered: 0, retried: 0 };

  for (const item of claimed) {
    try {
      const usage = getUsage(item.usageKey);
      if (!usage) throw new Error(`Usage record not found: ${item.usageKey}`);
      const receipt = await deliver(usage, deliveryMode);
      markOutboxDelivered(item.id, receipt);
      result.delivered += 1;
    } catch (error) {
      markOutboxRetry(item.id, error.message, retryDelay(item.attempts), now);
      result.retried += 1;
    }
  }
  return result;
}

export function startOutboxProcessor({ intervalMs = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 5000), deliveryMode } = {}) {
  const run = () => processOutbox({ deliveryMode }).catch((error) => console.error("outbox processing error", error));
  const timer = setInterval(run, Math.max(1000, intervalMs));
  timer.unref();
  run();
  return () => clearInterval(timer);
}
