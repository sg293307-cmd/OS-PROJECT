#include "gantt.h"
#include "process.h"

static int is_better(const Process *candidate, const Process *current)
{
    if (current == NULL) {
        return 1;
    }
    if (candidate->burst_time != current->burst_time) {
        return candidate->burst_time < current->burst_time;
    }
    if (candidate->arrival_time != current->arrival_time) {
        return candidate->arrival_time < current->arrival_time;
    }
    return candidate->pid < current->pid;
}

static int find_next_arrival(const Process *processes, size_t count, int time)
{
    size_t i;
    int next = -1;

    for (i = 0; i < count; ++i) {
        if (!processes[i].completed && processes[i].arrival_time > time &&
            (next < 0 || processes[i].arrival_time < next)) {
            next = processes[i].arrival_time;
        }
    }
    return next;
}

int sjf_run(Process *processes, size_t count, GanttChart *chart, int *elapsed)
{
    size_t completed = 0;
    size_t i;
    int time = 0;

    while (completed < count) {
        Process *selected = NULL;
        for (i = 0; i < count; ++i) {
            if (!processes[i].completed && processes[i].arrival_time <= time &&
                is_better(&processes[i], selected)) {
                selected = &processes[i];
            }
        }
        if (selected == NULL) {
            int next = find_next_arrival(processes, count, time);
            if (next < 0 || !gantt_append(chart, -1, time, next)) {
                return 0;
            }
            time = next;
            continue;
        }
        selected->first_start_time = time;
        selected->response_time = time - selected->arrival_time;
        selected->started = 1;
        if (!gantt_append(chart, selected->pid, time,
                          time + selected->burst_time)) {
            return 0;
        }
        time += selected->burst_time;
        selected->remaining_time = 0;
        selected->completion_time = time;
        selected->turnaround_time = time - selected->arrival_time;
        selected->waiting_time = selected->turnaround_time - selected->burst_time;
        selected->completed = 1;
        ++completed;
    }
    *elapsed = time;
    return 1;
}
