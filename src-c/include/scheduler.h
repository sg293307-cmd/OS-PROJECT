#ifndef CPU_SCHEDULER_SCHEDULER_H
#define CPU_SCHEDULER_SCHEDULER_H

#include <stddef.h>

#include "gantt.h"
#include "metrics.h"
#include "process.h"

typedef enum {
    SCHEDULER_ALGORITHM_SJF = 0,
    SCHEDULER_ALGORITHM_SRTF = 1
} SchedulerAlgorithm;

typedef enum {
    SCHEDULER_OK = 0,
    SCHEDULER_ERROR_NULL_POINTER = 1,
    SCHEDULER_ERROR_INVALID_COUNT = 2,
    SCHEDULER_ERROR_INVALID_PROCESS = 3,
    SCHEDULER_ERROR_DUPLICATE_PID = 4,
    SCHEDULER_ERROR_INVALID_ALGORITHM = 5,
    SCHEDULER_ERROR_ALLOCATION = 6,
    SCHEDULER_ERROR_OVERFLOW = 7,
    SCHEDULER_ERROR_BUFFER_TOO_SMALL = 8
} SchedulerError;

typedef struct {
    Process *processes;
    size_t process_count;
    ExecutionSegment *segments;
    size_t segment_count;
    SchedulerMetrics metrics;
} SchedulerResult;

int scheduler_run(const Process *input,
                  size_t count,
                  SchedulerAlgorithm algorithm,
                  SchedulerResult *result);
void scheduler_result_free(SchedulerResult *result);
const char *scheduler_error_message(int error_code);

#endif
