#ifndef CPU_SCHEDULER_WASM_API_H
#define CPU_SCHEDULER_WASM_API_H

#include "scheduler.h"

#ifdef __cplusplus
extern "C" {
#endif

/*
 * Flat-array ABI for JavaScript/WASM callers.
 *
 * Returns a SchedulerError code. All output buffers are caller-owned. The
 * segment arrays must have capacity max_segments; segment_count receives the
 * number of written segments on success and the required count on
 * SCHEDULER_ERROR_BUFFER_TOO_SMALL.
 */
int run_scheduler(int algorithm,
                  int process_count,
                  const int *pids,
                  const int *arrival_times,
                  const int *burst_times,
                  int *completion_times,
                  int *turnaround_times,
                  int *waiting_times,
                  int *response_times,
                  int *segment_pids,
                  int *segment_starts,
                  int *segment_ends,
                  int max_segments,
                  int *segment_count,
                  double *average_waiting_time,
                  double *average_turnaround_time,
                  double *average_response_time,
                  double *cpu_utilization,
                  double *throughput,
                  int *total_elapsed_time,
                  int *busy_time,
                  int *idle_time);

#ifdef __cplusplus
}
#endif

#endif
