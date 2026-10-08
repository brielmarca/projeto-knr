import { z } from "zod";

const bytes = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

/** Physical memory usable by the OS. All byte counts are safe integers. */
export const memorySchema = z
  .object({
    totalBytes: bytes.positive(),
    availableBytes: bytes,
    usedBytes: bytes,
    usagePercent: z.number().finite().min(0).max(100),
  })
  .strict()
  .superRefine((memory, context) => {
    if (memory.availableBytes > memory.totalBytes) {
      context.addIssue({
        code: "custom",
        path: ["availableBytes"],
        message: "Available bytes must not exceed total bytes",
      });
    }
    // Subtraction avoids accepting rounded sums near MAX_SAFE_INTEGER.
    const usedBytes = memory.totalBytes - memory.availableBytes;
    if (memory.usedBytes !== usedBytes) {
      context.addIssue({
        code: "custom",
        path: ["usedBytes"],
        message: "Used bytes must equal total minus available bytes",
      });
    }
    const usagePercent = (usedBytes / memory.totalBytes) * 100;
    // Allow only floating-point roundoff, not display-rounded percentages.
    if (
      Math.abs(memory.usagePercent - usagePercent) >
      Number.EPSILON * 100 * 4
    ) {
      context.addIssue({
        code: "custom",
        path: ["usagePercent"],
        message:
          "Usage percent must equal used bytes divided by total times 100",
      });
    }
  });

/**
 * Transport-independent system snapshot v1, initially limited to memory.
 * collectedAt is an ISO UTC timestamp. Required null means unavailable;
 * zero available/used bytes is a valid measurement, never missing data.
 * Validation rejects inconsistent derived values rather than repairing them.
 */
export const systemSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    collectedAt: z.iso.datetime(),
    memory: memorySchema.nullable(),
  })
  .strict();

export type MemorySnapshot = z.infer<typeof memorySchema>;
export type SystemSnapshotV1 = z.infer<typeof systemSnapshotSchema>;
