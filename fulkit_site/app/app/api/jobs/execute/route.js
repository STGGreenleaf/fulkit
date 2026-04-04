import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { getSquareToken, squareFetch } from "../../../../lib/square-server";

export const maxDuration = 300; // 5 minutes — background jobs have no stream ceiling

export async function POST(request) {
  try {
    const { job_id } = await request.json();
    if (!job_id) return Response.json({ error: "job_id required" }, { status: 400 });

    const admin = getSupabaseAdmin();

    // Fetch the job
    const { data: job, error: fetchErr } = await admin.from("jobs")
      .select("*")
      .eq("id", job_id)
      .single();

    if (fetchErr || !job) return Response.json({ error: "Job not found" }, { status: 404 });
    if (job.status !== "queued") return Response.json({ error: "Job already processed" }, { status: 409 });

    // Mark running
    await admin.from("jobs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", job_id);

    // Dispatch by type
    try {
      if (job.type === "inventory_update") {
        await executeInventoryUpdate(job, admin);
      } else if (job.type === "price_change") {
        await executePriceChange(job, admin);
      } else {
        throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (err) {
      // If the handler didn't already set status, mark failed
      const { data: current } = await admin.from("jobs").select("status").eq("id", job_id).single();
      if (current?.status === "running") {
        await admin.from("jobs").update({
          status: "failed",
          error: err.message,
          completed_at: new Date().toISOString(),
        }).eq("id", job_id);
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// ── Inventory Update ──
async function executeInventoryUpdate(job, admin) {
  const { items, location_id } = job.payload;
  const userId = job.user_id;
  const BATCH_SIZE = 5;

  let successCount = 0;
  let failCount = 0;
  const failedItems = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const changes = batch.map(item => ({
      type: "PHYSICAL_COUNT",
      physical_count: {
        catalog_object_id: item.catalog_object_id,
        location_id,
        quantity: String(item.quantity),
        state: "IN_STOCK",
        occurred_at: new Date().toISOString(),
      },
    }));

    const key = `fulkit_job_${job.id}_${i}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const res = await squareFetch(userId, "/inventory/changes/batch-create", {
        method: "POST",
        body: JSON.stringify({ idempotency_key: key, changes }),
      });

      if (res.error || !res.ok) {
        failCount += batch.length;
        failedItems.push(...batch.map(b => b.name || b.catalog_object_id));
      } else {
        const result = await res.json();
        if (result.errors?.length) {
          failCount += batch.length;
          failedItems.push(...batch.map(b => b.name || b.catalog_object_id));
        } else {
          successCount += batch.length;
        }
      }
    } catch {
      failCount += batch.length;
      failedItems.push(...batch.map(b => b.name || b.catalog_object_id));
    }

    // Update progress after each batch
    await admin.from("jobs").update({
      progress: successCount + failCount,
    }).eq("id", job.id);
  }

  // Final status
  const status = failCount > 0 ? (successCount > 0 ? "partial" : "failed") : "done";
  await admin.from("jobs").update({
    status,
    progress: successCount + failCount,
    result: {
      updated: successCount,
      failed: failCount,
      total: items.length,
      failedItems: failedItems.length > 0 ? failedItems : undefined,
      items: items.map(i => ({ name: i.name, quantity: i.quantity })),
    },
    error: failCount > 0 ? `${failCount} item${failCount > 1 ? "s" : ""} failed: ${failedItems.join(", ")}` : null,
    completed_at: new Date().toISOString(),
  }).eq("id", job.id);
}

// ── Price Change ──
async function executePriceChange(job, admin) {
  const { objects, items } = job.payload;
  const userId = job.user_id;

  try {
    const key = `fulkit_job_price_${job.id}_${Math.random().toString(36).slice(2, 8)}`;
    const res = await squareFetch(userId, "/catalog/batch-upsert", {
      method: "POST",
      body: JSON.stringify({ idempotency_key: key, objects }),
    });

    if (res.error || !res.ok) throw new Error("Square API error");
    const data = await res.json();
    if (data.errors?.length) throw new Error(data.errors[0].detail);

    await admin.from("jobs").update({
      status: "done",
      progress: items.length,
      result: { updated: items.length, items },
      completed_at: new Date().toISOString(),
    }).eq("id", job.id);
  } catch (err) {
    await admin.from("jobs").update({
      status: "failed",
      error: err.message,
      completed_at: new Date().toISOString(),
    }).eq("id", job.id);
  }
}
