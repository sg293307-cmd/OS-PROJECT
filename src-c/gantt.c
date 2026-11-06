#include "gantt.h"

#include <limits.h>
#include <stdint.h>
#include <stdlib.h>

int gantt_init(GanttChart *chart, size_t initial_capacity)
{
    if (chart == NULL) {
        return 0;
    }
    chart->segments = NULL;
    chart->count = 0;
    chart->capacity = 0;
    if (initial_capacity == 0) {
        initial_capacity = 8;
    }
    chart->segments = malloc(initial_capacity * sizeof(*chart->segments));
    if (chart->segments == NULL) {
        return 0;
    }
    chart->capacity = initial_capacity;
    return 1;
}

static int gantt_grow(GanttChart *chart)
{
    size_t new_capacity;
    ExecutionSegment *new_segments;

    if (chart->capacity > SIZE_MAX / 2) {
        return 0;
    }
    new_capacity = chart->capacity == 0 ? 8 : chart->capacity * 2;
    new_segments = realloc(chart->segments,
                           new_capacity * sizeof(*new_segments));
    if (new_segments == NULL) {
        return 0;
    }
    chart->segments = new_segments;
    chart->capacity = new_capacity;
    return 1;
}

int gantt_append(GanttChart *chart, int pid, int start_time, int end_time)
{
    ExecutionSegment *last;

    if (chart == NULL || start_time < 0 || end_time <= start_time) {
        return 0;
    }
    if (chart->count > 0) {
        last = &chart->segments[chart->count - 1];
        if (last->pid == pid && last->end_time == start_time) {
            last->end_time = end_time;
            return 1;
        }
    }
    if (chart->count == chart->capacity && !gantt_grow(chart)) {
        return 0;
    }
    chart->segments[chart->count++] = (ExecutionSegment){
        .pid = pid,
        .start_time = start_time,
        .end_time = end_time
    };
    return 1;
}

void gantt_free(GanttChart *chart)
{
    if (chart == NULL) {
        return;
    }
    free(chart->segments);
    chart->segments = NULL;
    chart->count = 0;
    chart->capacity = 0;
}
