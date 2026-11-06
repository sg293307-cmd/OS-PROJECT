#include "metrics.h"

#include <string.h>

void metrics_calculate(Process *processes,
                       size_t count,
                       int total_elapsed_time,
                       SchedulerMetrics *metrics)
{
    size_t i;
    long long total_waiting = 0;
    long long total_turnaround = 0;
    long long total_response = 0;
    int busy_time = 0;

    memset(metrics, 0, sizeof(*metrics));
    metrics->total_elapsed_time = total_elapsed_time;
    for (i = 0; i < count; ++i) {
        total_waiting += processes[i].waiting_time;
        total_turnaround += processes[i].turnaround_time;
        total_response += processes[i].response_time;
        busy_time += processes[i].burst_time;
    }
    metrics->busy_time = busy_time;
    metrics->idle_time = total_elapsed_time - busy_time;
    if (count > 0) {
        metrics->average_waiting_time = (double)total_waiting / (double)count;
        metrics->average_turnaround_time = (double)total_turnaround / (double)count;
        metrics->average_response_time = (double)total_response / (double)count;
    }
    if (total_elapsed_time > 0) {
        metrics->cpu_utilization =
            ((double)busy_time / (double)total_elapsed_time) * 100.0;
        metrics->throughput =
            (double)count / (double)total_elapsed_time;
    }
}
