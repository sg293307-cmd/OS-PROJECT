#ifndef CPU_SCHEDULER_GANTT_H
#define CPU_SCHEDULER_GANTT_H

#include <stddef.h>

typedef struct {
    int pid;
    int start_time;
    int end_time;
} ExecutionSegment;

typedef struct {
    ExecutionSegment *segments;
    size_t count;
    size_t capacity;
} GanttChart;

int gantt_init(GanttChart *chart, size_t initial_capacity);
int gantt_append(GanttChart *chart, int pid, int start_time, int end_time);
void gantt_free(GanttChart *chart);

#endif
