#include "gantt.h"
#include "process.h"

static int is_better(const Process *candidate, const Process *current)
{
    if (current == NULL) {
        return 1;
    }
    if (candidate->remaining_time != current->remaining_time) {
        return candidate->remaining_time < current->remaining_time;
    }
    if (candidate->arrival_time != current->arrival_time) {
        return candidate->arrival_time < current->arrival_time;
    }
    return candidate->pid < current->pid;
}

static Process *select_process(Process *processes,
                               size_t count,
                               int time,
                               Process *current)
{
    size_t i;
    Process *selected = NULL;

    if (current != NULL && !current->completed &&
        current->arrival_time <= time && current->remaining_time > 0) {
        selected = current;
    }
    for (i = 0; i < count; ++i) {
        if (!processes[i].completed && processes[i].arrival_time <= time &&
            processes[i].remaining_time > 0 &&
            (selected == NULL || processes[i].remaining_time < selected->remaining_time) &&
            is_better(&processes[i], selected)) {
            selected = &processes[i];
        }
    }
    return selected;
}

static int next_event_time(const Process *processes, size_t count, int time)
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

int srtf_run(Process *processes, size_t count, GanttChart *chart, int *elapsed)
{
    size_t completed = 0;
    int time = 0;
    Process *current = NULL;

    while (completed < count) {
        Process *selected = select_process(processes, count, time, current);
        int next_event;
        int run_until;

        if (selected == NULL) {
            next_event = next_event_time(processes, count, time);
            if (next_event < 0 || !gantt_append(chart, -1, time, next_event)) {
                return 0;
            }
            time = next_event;
            current = NULL;
            continue;
        }
        if (!selected->started) {
            selected->first_start_time = time;
            selected->response_time = time - selected->arrival_time;
            selected->started = 1;
        }
        next_event = next_event_time(processes, count, time);
        run_until = time + selected->remaining_time;
        if (next_event >= 0 && next_event < run_until) {
            run_until = next_event;
        }
        if (!gantt_append(chart, selected->pid, time, run_until)) {
            return 0;
        }
        selected->remaining_time -= run_until - time;
        time = run_until;
        if (selected->remaining_time == 0) {
            selected->completion_time = time;
            selected->turnaround_time = time - selected->arrival_time;
            selected->waiting_time = selected->turnaround_time - selected->burst_time;
            selected->completed = 1;
            ++completed;
            current = NULL;
        } else {
            current = selected;
        }
    }
    *elapsed = time;
    return 1;
}
