#include "scheduler.h"

#include <stdlib.h>
#include <string.h>

int sjf_run(Process *processes, size_t count, GanttChart *chart, int *elapsed);
int srtf_run(Process *processes, size_t count, GanttChart *chart, int *elapsed);

static int map_validation_error(int error)
{
    if (error == 1) {
        return SCHEDULER_ERROR_NULL_POINTER;
    }
    if (error == 2) {
        return SCHEDULER_ERROR_INVALID_COUNT;
    }
    if (error == 3) {
        return SCHEDULER_ERROR_DUPLICATE_PID;
    }
    if (error == 5) {
        return SCHEDULER_ERROR_OVERFLOW;
    }
    return SCHEDULER_ERROR_INVALID_PROCESS;
}

int scheduler_run(const Process *input,
                  size_t count,
                  SchedulerAlgorithm algorithm,
                  SchedulerResult *result)
{
    Process *working = NULL;
    GanttChart chart = {0};
    int validation;
    int elapsed = 0;
    int success;

    if (result == NULL) {
        return SCHEDULER_ERROR_NULL_POINTER;
    }
    memset(result, 0, sizeof(*result));
    if (algorithm != SCHEDULER_ALGORITHM_SJF &&
        algorithm != SCHEDULER_ALGORITHM_SRTF) {
        return SCHEDULER_ERROR_INVALID_ALGORITHM;
    }
    validation = process_validate_input(input, count);
    if (validation != 0) {
        return map_validation_error(validation);
    }
    working = malloc(count * sizeof(*working));
    if (working == NULL) {
        return SCHEDULER_ERROR_ALLOCATION;
    }
    process_initialize_working_copy(working, input, count);
    if (!gantt_init(&chart, count)) {
        free(working);
        return SCHEDULER_ERROR_ALLOCATION;
    }
    success = algorithm == SCHEDULER_ALGORITHM_SJF
        ? sjf_run(working, count, &chart, &elapsed)
        : srtf_run(working, count, &chart, &elapsed);
    if (!success) {
        gantt_free(&chart);
        free(working);
        return SCHEDULER_ERROR_ALLOCATION;
    }
    metrics_calculate(working, count, elapsed, &result->metrics);
    result->processes = working;
    result->process_count = count;
    result->segments = chart.segments;
    result->segment_count = chart.count;
    return SCHEDULER_OK;
}

void scheduler_result_free(SchedulerResult *result)
{
    if (result == NULL) {
        return;
    }
    free(result->processes);
    free(result->segments);
    memset(result, 0, sizeof(*result));
}

const char *scheduler_error_message(int error_code)
{
    switch (error_code) {
    case SCHEDULER_OK:
        return "success";
    case SCHEDULER_ERROR_NULL_POINTER:
        return "null pointer";
    case SCHEDULER_ERROR_INVALID_COUNT:
        return "process count must be greater than zero";
    case SCHEDULER_ERROR_INVALID_PROCESS:
        return "invalid process input";
    case SCHEDULER_ERROR_DUPLICATE_PID:
        return "process IDs must be unique";
    case SCHEDULER_ERROR_INVALID_ALGORITHM:
        return "invalid scheduling algorithm";
    case SCHEDULER_ERROR_ALLOCATION:
        return "memory allocation failed";
    case SCHEDULER_ERROR_OVERFLOW:
        return "time value overflow";
    case SCHEDULER_ERROR_BUFFER_TOO_SMALL:
        return "output buffer is too small";
    default:
        return "unknown scheduler error";
    }
}
