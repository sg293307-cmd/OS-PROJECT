#include "process.h"

#include <limits.h>
#include <stdint.h>

static int has_duplicate_pid(const Process *processes, size_t count)
{
    size_t i;
    size_t j;

    for (i = 0; i < count; ++i) {
        for (j = i + 1; j < count; ++j) {
            if (processes[i].pid == processes[j].pid) {
                return 1;
            }
        }
    }
    return 0;
}

int process_validate_input(const Process *processes, size_t count)
{
    size_t i;
    long long total_burst = 0;

    if (processes == NULL) {
        return 1;
    }
    if (count == 0) {
        return 2;
    }
    if (has_duplicate_pid(processes, count)) {
        return 3;
    }
    for (i = 0; i < count; ++i) {
        if (processes[i].pid == -1 ||
            processes[i].arrival_time < 0 ||
            processes[i].burst_time <= 0 ||
            processes[i].burst_time > INT_MAX - processes[i].arrival_time) {
            return 4;
        }
        total_burst += processes[i].burst_time;
        if (total_burst > INT_MAX) {
            return 5;
        }
    }
    return 0;
}

void process_initialize_working_copy(Process *destination,
                                     const Process *source,
                                     size_t count)
{
    size_t i;

    for (i = 0; i < count; ++i) {
        destination[i] = source[i];
        destination[i].remaining_time = source[i].burst_time;
        destination[i].completion_time = 0;
        destination[i].turnaround_time = 0;
        destination[i].waiting_time = 0;
        destination[i].response_time = 0;
        destination[i].first_start_time = -1;
        destination[i].started = 0;
        destination[i].completed = 0;
    }
}
