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

/** CPU utilization averaged over sampleDurationMs, not an instantaneous reading. */
export const cpuSchema = z
  .object({
    model: z.string().trim().min(1).max(512),
    logicalCoreCount: bytes.positive(),
    physicalCoreCount: bytes.positive(),
    usagePercent: z.number().finite().min(0).max(100),
    sampleDurationMs: bytes.positive(),
  })
  .strict()
  .refine((cpu) => cpu.physicalCoreCount <= cpu.logicalCoreCount, {
    path: ["physicalCoreCount"],
    message: "Physical core count must not exceed logical core count",
  });

/** System-drive capacity available to the current user (Windows quotas apply). */
export const storageSchema = z
  .object({
    volume: z.string().regex(/^[A-Z]:$/),
    totalBytes: bytes.positive(),
    freeBytes: bytes,
    usedBytes: bytes,
    freePercent: z.number().finite().min(0).max(100),
  })
  .strict()
  .superRefine((storage, context) => {
    if (storage.freeBytes > storage.totalBytes) {
      context.addIssue({
        code: "custom",
        path: ["freeBytes"],
        message: "Free bytes must not exceed total bytes",
      });
    }
    if (storage.usedBytes !== storage.totalBytes - storage.freeBytes) {
      context.addIssue({
        code: "custom",
        path: ["usedBytes"],
        message: "Used bytes must equal total minus free bytes",
      });
    }
    const freePercent = (storage.freeBytes / storage.totalBytes) * 100;
    if (
      Math.abs(storage.freePercent - freePercent) >
      Number.EPSILON * 100 * 4
    ) {
      context.addIssue({
        code: "custom",
        path: ["freePercent"],
        message:
          "Free percent must equal free bytes divided by total times 100",
      });
    }
  });

/**
 * Transport-independent system snapshot v1.
 * collectedAt is an ISO UTC timestamp. Required null means unavailable;
 * zero available/used bytes is a valid measurement, never missing data.
 * Validation rejects inconsistent derived values rather than repairing them.
 */
export const systemSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    collectedAt: z.iso.datetime(),
    memory: memorySchema.nullable(),
    // Optional for compatibility with existing memory-only v1 producers.
    cpu: cpuSchema.nullable().optional(),
    // Missing or null means unavailable, including older v1 producers.
    storage: storageSchema.nullable().optional(),
  })
  .strict();

export type MemorySnapshot = z.infer<typeof memorySchema>;
export type CpuSnapshot = z.infer<typeof cpuSchema>;
export type StorageSnapshot = z.infer<typeof storageSchema>;
export type SystemSnapshotV1 = z.infer<typeof systemSnapshotSchema>;
