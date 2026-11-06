#ifndef CPU_SCHEDULER_PROCESS_H
#define CPU_SCHEDULER_PROCESS_H

#include <stddef.h>

typedef struct {
    int pid;
    int arrival_time;
    int burst_time;
    int remaining_time;
    int completion_time;
    int turnaround_time;
    int waiting_time;
    int response_time;
    int first_start_time;
    int started;
    int completed;
} Process;

int process_validate_input(const Process *processes, size_t count);
void process_initialize_working_copy(Process *destination,
                                     const Process *source,
                                     size_t count);

#endif
