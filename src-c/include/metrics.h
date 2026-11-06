#ifndef CPU_SCHEDULER_METRICS_H
#define CPU_SCHEDULER_METRICS_H

#include <stddef.h>

#include "process.h"

typedef struct {
    double average_waiting_time;
    double average_turnaround_time;
    double average_response_time;
    double cpu_utilization;
    double throughput;
    int total_elapsed_time;
    int busy_time;
    int idle_time;
} SchedulerMetrics;

void metrics_calculate(Process *processes,
                       size_t count,
                       int total_elapsed_time,
                       SchedulerMetrics *metrics);

#endif
