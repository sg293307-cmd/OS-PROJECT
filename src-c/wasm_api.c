#include "wasm_api.h"

#include <limits.h>
#include <stddef.h>
#include <stdlib.h>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define WASM_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define WASM_EXPORT
#endif

static int required_output_pointers_present(
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
    int *segment_count,
    double *average_waiting_time,
    double *average_turnaround_time,
    double *average_response_time,
    double *cpu_utilization,
    double *throughput,
    int *total_elapsed_time,
    int *busy_time,
    int *idle_time)
{
    return pids != NULL && arrival_times != NULL && burst_times != NULL &&
           completion_times != NULL && turnaround_times != NULL &&
           waiting_times != NULL && response_times != NULL &&
           segment_pids != NULL && segment_starts != NULL &&
           segment_ends != NULL && segment_count != NULL &&
           average_waiting_time != NULL && average_turnaround_time != NULL &&
           average_response_time != NULL && cpu_utilization != NULL &&
           throughput != NULL && total_elapsed_time != NULL &&
           busy_time != NULL && idle_time != NULL;
}

WASM_EXPORT int run_scheduler(
    int algorithm,
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
    int *idle_time)
{
    Process *input = NULL;
    SchedulerResult result = {0};
    int status;
    int i;

    if (!required_output_pointers_present(
            pids, arrival_times, burst_times, completion_times,
            turnaround_times, waiting_times, response_times, segment_pids,
            segment_starts, segment_ends, segment_count, average_waiting_time,
            average_turnaround_time, average_response_time, cpu_utilization,
            throughput, total_elapsed_time, busy_time, idle_time)) {
        return SCHEDULER_ERROR_NULL_POINTER;
    }
    *segment_count = 0;
    if (process_count <= 0) {
        return SCHEDULER_ERROR_INVALID_COUNT;
    }
    if (max_segments <= 0) {
        return SCHEDULER_ERROR_INVALID_COUNT;
    }
    if (process_count > INT_MAX / (int)sizeof(*input)) {
        return SCHEDULER_ERROR_OVERFLOW;
    }
    input = malloc((size_t)process_count * sizeof(*input));
    if (input == NULL) {
        return SCHEDULER_ERROR_ALLOCATION;
    }
    for (i = 0; i < process_count; ++i) {
        input[i].pid = pids[i];
        input[i].arrival_time = arrival_times[i];
        input[i].burst_time = burst_times[i];
    }
    status = scheduler_run(input, (size_t)process_count,
                           (SchedulerAlgorithm)algorithm, &result);
    free(input);
    if (status != SCHEDULER_OK) {
        return status;
    }
    if (result.segment_count > (size_t)max_segments) {
        *segment_count = result.segment_count > (size_t)INT_MAX
            ? INT_MAX
            : (int)result.segment_count;
        scheduler_result_free(&result);
        return SCHEDULER_ERROR_BUFFER_TOO_SMALL;
    }
    for (i = 0; i < process_count; ++i) {
        completion_times[i] = result.processes[i].completion_time;
        turnaround_times[i] = result.processes[i].turnaround_time;
        waiting_times[i] = result.processes[i].waiting_time;
        response_times[i] = result.processes[i].response_time;
    }
    for (i = 0; i < (int)result.segment_count; ++i) {
        segment_pids[i] = result.segments[i].pid;
        segment_starts[i] = result.segments[i].start_time;
        segment_ends[i] = result.segments[i].end_time;
    }
    *segment_count = (int)result.segment_count;
    *average_waiting_time = result.metrics.average_waiting_time;
    *average_turnaround_time = result.metrics.average_turnaround_time;
    *average_response_time = result.metrics.average_response_time;
    *cpu_utilization = result.metrics.cpu_utilization;
    *throughput = result.metrics.throughput;
    *total_elapsed_time = result.metrics.total_elapsed_time;
    *busy_time = result.metrics.busy_time;
    *idle_time = result.metrics.idle_time;
    scheduler_result_free(&result);
    return SCHEDULER_OK;
}
