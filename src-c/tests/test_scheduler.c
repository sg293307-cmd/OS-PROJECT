#include "scheduler.h"

#include <assert.h>
#include <math.h>
#include <stdio.h>

#define ARRAY_COUNT(values) (sizeof(values) / sizeof((values)[0]))

static void assert_close(double actual, double expected)
{
    assert(fabs(actual - expected) < 0.000001);
}

static const Process *find_process(const SchedulerResult *result, int pid)
{
    size_t i;

    for (i = 0; i < result->process_count; ++i) {
        if (result->processes[i].pid == pid) {
            return &result->processes[i];
        }
    }
    return NULL;
}

static int execution_time_for_pid(const SchedulerResult *result, int pid)
{
    size_t i;
    int total = 0;

    for (i = 0; i < result->segment_count; ++i) {
        if (result->segments[i].pid == pid) {
            total += result->segments[i].end_time - result->segments[i].start_time;
        }
    }
    return total;
}

static void assert_invariants(const Process *input,
                              size_t input_count,
                              const SchedulerResult *result)
{
    size_t i;
    int previous_end = 0;
    int busy_time = 0;

    assert(result->process_count == input_count);
    assert(result->segments != NULL);
    assert(result->segment_count > 0);
    for (i = 0; i < result->segment_count; ++i) {
        const ExecutionSegment *segment = &result->segments[i];
        assert(segment->start_time == previous_end);
        assert(segment->end_time > segment->start_time);
        if (i > 0) {
            assert(result->segments[i - 1].pid != segment->pid);
        }
        if (segment->pid != -1) {
            const Process *process = find_process(result, segment->pid);
            assert(process != NULL);
            assert(segment->start_time >= process->arrival_time);
            busy_time += segment->end_time - segment->start_time;
        }
        previous_end = segment->end_time;
    }
    assert(previous_end == result->metrics.total_elapsed_time);
    assert(busy_time == result->metrics.busy_time);
    assert(result->metrics.busy_time + result->metrics.idle_time ==
           result->metrics.total_elapsed_time);
    assert(result->metrics.cpu_utilization >= 0.0);
    assert(result->metrics.cpu_utilization <= 100.0);

    for (i = 0; i < input_count; ++i) {
        const Process *process = find_process(result, input[i].pid);
        assert(process != NULL);
        assert(process->completed == 1);
        assert(process->remaining_time == 0);
        assert(process->completion_time > 0);
        assert(process->turnaround_time ==
               process->completion_time - process->arrival_time);
        assert(process->waiting_time ==
               process->turnaround_time - process->burst_time);
        assert(process->response_time ==
               process->first_start_time - process->arrival_time);
        assert(process->first_start_time >= process->arrival_time);
        assert(execution_time_for_pid(result, process->pid) == process->burst_time);
    }
    assert(busy_time == result->metrics.busy_time);
}

static SchedulerResult run_checked(const Process *input,
                                   size_t count,
                                   SchedulerAlgorithm algorithm)
{
    SchedulerResult result;
    assert(scheduler_run(input, count, algorithm, &result) == SCHEDULER_OK);
    assert_invariants(input, count, &result);
    return result;
}

static void test_one_process(void)
{
    const Process input[] = {{.pid = 1, .arrival_time = 0, .burst_time = 5}};
    SchedulerResult result = run_checked(input, ARRAY_COUNT(input),
                                         SCHEDULER_ALGORITHM_SJF);
    assert(result.processes[0].completion_time == 5);
    assert(result.processes[0].turnaround_time == 5);
    assert(result.processes[0].waiting_time == 0);
    assert(result.processes[0].response_time == 0);
    assert(result.segment_count == 1);
    scheduler_result_free(&result);

    result = run_checked(input, ARRAY_COUNT(input), SCHEDULER_ALGORITHM_SRTF);
    assert(result.processes[0].completion_time == 5);
    assert(result.segment_count == 1);
    scheduler_result_free(&result);
}

static void test_all_arrive_at_zero(void)
{
    const Process input[] = {
        {.pid = 1, .arrival_time = 0, .burst_time = 5},
        {.pid = 2, .arrival_time = 0, .burst_time = 2},
        {.pid = 3, .arrival_time = 0, .burst_time = 3}
    };
    SchedulerResult result = run_checked(input, ARRAY_COUNT(input),
                                         SCHEDULER_ALGORITHM_SJF);
    assert(result.segments[0].pid == 2);
    assert(result.segments[1].pid == 3);
    assert(result.segments[2].pid == 1);
    assert(result.processes[0].completion_time == 10);
    assert(result.processes[1].completion_time == 2);
    assert(result.processes[2].completion_time == 5);
    scheduler_result_free(&result);
}

static void test_reference_datasets(void)
{
    const Process input[] = {
        {.pid = 1, .arrival_time = 0, .burst_time = 7},
        {.pid = 2, .arrival_time = 2, .burst_time = 4},
        {.pid = 3, .arrival_time = 4, .burst_time = 1},
        {.pid = 4, .arrival_time = 5, .burst_time = 4}
    };
    const int sjf_order[] = {1, 3, 2, 4};
    const int srtf_order[] = {1, 2, 3, 2, 4, 1};
    SchedulerResult result;
    size_t i;

    result = run_checked(input, ARRAY_COUNT(input), SCHEDULER_ALGORITHM_SJF);
    assert(result.segment_count == ARRAY_COUNT(sjf_order));
    for (i = 0; i < ARRAY_COUNT(sjf_order); ++i) {
        assert(result.segments[i].pid == sjf_order[i]);
    }
    assert(find_process(&result, 1)->completion_time == 7);
    assert(find_process(&result, 2)->completion_time == 12);
    assert(find_process(&result, 3)->completion_time == 8);
    assert(find_process(&result, 4)->completion_time == 16);
    assert(find_process(&result, 1)->turnaround_time == 7);
    assert(find_process(&result, 2)->turnaround_time == 10);
    assert(find_process(&result, 3)->turnaround_time == 4);
    assert(find_process(&result, 4)->turnaround_time == 11);
    assert(find_process(&result, 1)->waiting_time == 0);
    assert(find_process(&result, 2)->waiting_time == 6);
    assert(find_process(&result, 3)->waiting_time == 3);
    assert(find_process(&result, 4)->waiting_time == 7);
    assert(find_process(&result, 1)->response_time == 0);
    assert(find_process(&result, 2)->response_time == 6);
    assert(find_process(&result, 3)->response_time == 3);
    assert(find_process(&result, 4)->response_time == 7);
    assert_close(result.metrics.average_waiting_time, 4.0);
    assert_close(result.metrics.average_turnaround_time, 8.0);
    assert_close(result.metrics.average_response_time, 4.0);
    assert_close(result.metrics.cpu_utilization, 100.0);
    assert_close(result.metrics.throughput, 0.25);
    scheduler_result_free(&result);

    result = run_checked(input, ARRAY_COUNT(input), SCHEDULER_ALGORITHM_SRTF);
    assert(result.segment_count == ARRAY_COUNT(srtf_order));
    for (i = 0; i < ARRAY_COUNT(srtf_order); ++i) {
        assert(result.segments[i].pid == srtf_order[i]);
    }
    assert(find_process(&result, 1)->completion_time == 16);
    assert(find_process(&result, 2)->completion_time == 7);
    assert(find_process(&result, 3)->completion_time == 5);
    assert(find_process(&result, 4)->completion_time == 11);
    assert(find_process(&result, 1)->turnaround_time == 16);
    assert(find_process(&result, 2)->turnaround_time == 5);
    assert(find_process(&result, 3)->turnaround_time == 1);
    assert(find_process(&result, 4)->turnaround_time == 6);
    assert(find_process(&result, 1)->waiting_time == 9);
    assert(find_process(&result, 2)->waiting_time == 1);
    assert(find_process(&result, 3)->waiting_time == 0);
    assert(find_process(&result, 4)->waiting_time == 2);
    assert(find_process(&result, 1)->response_time == 0);
    assert(find_process(&result, 2)->response_time == 0);
    assert(find_process(&result, 3)->response_time == 0);
    assert(find_process(&result, 4)->response_time == 2);
    assert_close(result.metrics.average_waiting_time, 3.0);
    assert_close(result.metrics.average_turnaround_time, 7.0);
    assert_close(result.metrics.average_response_time, 0.5);
    assert_close(result.metrics.cpu_utilization, 100.0);
    scheduler_result_free(&result);
}

static void test_arrivals_and_idle_intervals(void)
{
    const Process input[] = {
        {.pid = 7, .arrival_time = 3, .burst_time = 2},
        {.pid = 9, .arrival_time = 8, .burst_time = 1},
        {.pid = 11, .arrival_time = 12, .burst_time = 2}
    };
    SchedulerResult result = run_checked(input, ARRAY_COUNT(input),
                                         SCHEDULER_ALGORITHM_SJF);
    assert(result.segment_count == 6);
    assert(result.segments[0].pid == -1);
    assert(result.segments[0].start_time == 0);
    assert(result.segments[0].end_time == 3);
    assert(result.segments[1].pid == 7);
    assert(result.segments[2].pid == -1);
    assert(result.segments[2].start_time == 5);
    assert(result.segments[2].end_time == 8);
    assert(result.segments[3].pid == 9);
    assert(result.segments[4].pid == -1);
    assert(result.segments[4].start_time == 9);
    assert(result.segments[4].end_time == 12);
    assert(result.segments[5].pid == 11);
    assert(result.metrics.total_elapsed_time == 14);
    assert(result.metrics.busy_time == 5);
    assert(result.metrics.idle_time == 9);
    assert_close(result.metrics.cpu_utilization, 100.0 * 5.0 / 14.0);
    assert_close(result.metrics.throughput, 3.0 / 14.0);
    scheduler_result_free(&result);
}

static void test_sjf_tie_breaking(void)
{
    const Process burst_tie[] = {
        {.pid = 3, .arrival_time = 0, .burst_time = 2},
        {.pid = 2, .arrival_time = 0, .burst_time = 2},
        {.pid = 1, .arrival_time = 0, .burst_time = 4}
    };
    const Process arrival_tie[] = {
        {.pid = 1, .arrival_time = 2, .burst_time = 2},
        {.pid = 2, .arrival_time = 0, .burst_time = 2},
        {.pid = 3, .arrival_time = 0, .burst_time = 5}
    };
    const Process pid_tie[] = {
        {.pid = 9, .arrival_time = 0, .burst_time = 1},
        {.pid = 4, .arrival_time = 0, .burst_time = 1}
    };
    SchedulerResult result = run_checked(burst_tie, ARRAY_COUNT(burst_tie),
                                         SCHEDULER_ALGORITHM_SJF);
    assert(result.segments[0].pid == 2);
    assert(result.segments[1].pid == 3);
    scheduler_result_free(&result);

    result = run_checked(arrival_tie, ARRAY_COUNT(arrival_tie),
                         SCHEDULER_ALGORITHM_SJF);
    assert(result.segments[0].pid == 2);
    assert(result.segments[1].pid == 1);
    scheduler_result_free(&result);

    result = run_checked(pid_tie, ARRAY_COUNT(pid_tie),
                         SCHEDULER_ALGORITHM_SJF);
    assert(result.segments[0].pid == 4);
    assert(result.segments[1].pid == 9);
    scheduler_result_free(&result);
}

static void test_srtf_preemption_and_ties(void)
{
    const Process preemption[] = {
        {.pid = 1, .arrival_time = 0, .burst_time = 10},
        {.pid = 2, .arrival_time = 2, .burst_time = 2}
    };
    const Process equal_remaining[] = {
        {.pid = 1, .arrival_time = 0, .burst_time = 4},
        {.pid = 2, .arrival_time = 2, .burst_time = 2}
    };
    const Process consecutive[] = {
        {.pid = 1, .arrival_time = 0, .burst_time = 12},
        {.pid = 2, .arrival_time = 2, .burst_time = 5},
        {.pid = 3, .arrival_time = 3, .burst_time = 1},
        {.pid = 4, .arrival_time = 4, .burst_time = 1}
    };
    const Process completion_event[] = {
        {.pid = 1, .arrival_time = 0, .burst_time = 3},
        {.pid = 2, .arrival_time = 3, .burst_time = 1}
    };
    const Process simultaneous[] = {
        {.pid = 8, .arrival_time = 0, .burst_time = 3},
        {.pid = 2, .arrival_time = 0, .burst_time = 1},
        {.pid = 5, .arrival_time = 0, .burst_time = 2}
    };
    SchedulerResult result;

    result = run_checked(preemption, ARRAY_COUNT(preemption),
                         SCHEDULER_ALGORITHM_SRTF);
    assert(result.segment_count == 3);
    assert(result.segments[0].pid == 1);
    assert(result.segments[1].pid == 2);
    assert(result.segments[2].pid == 1);
    scheduler_result_free(&result);

    result = run_checked(equal_remaining, ARRAY_COUNT(equal_remaining),
                         SCHEDULER_ALGORITHM_SRTF);
    assert(result.segment_count == 2);
    assert(result.segments[0].pid == 1);
    assert(result.segments[1].pid == 2);
    scheduler_result_free(&result);

    result = run_checked(consecutive, ARRAY_COUNT(consecutive),
                         SCHEDULER_ALGORITHM_SRTF);
    assert(result.segment_count == 6);
    assert(result.segments[0].pid == 1);
    assert(result.segments[1].pid == 2);
    assert(result.segments[2].pid == 3);
    assert(result.segments[3].pid == 4);
    scheduler_result_free(&result);

    result = run_checked(completion_event, ARRAY_COUNT(completion_event),
                         SCHEDULER_ALGORITHM_SRTF);
    assert(result.segment_count == 2);
    assert(result.segments[0].pid == 1);
    assert(result.segments[0].end_time == 3);
    assert(result.segments[1].pid == 2);
    scheduler_result_free(&result);

    result = run_checked(simultaneous, ARRAY_COUNT(simultaneous),
                         SCHEDULER_ALGORITHM_SRTF);
    assert(result.segments[0].pid == 2);
    assert(result.segments[1].pid == 5);
    assert(result.segments[2].pid == 8);
    scheduler_result_free(&result);
}

static void test_invalid_inputs(void)
{
    const Process negative_arrival = {.pid = 1, .arrival_time = -1, .burst_time = 1};
    const Process zero_burst = {.pid = 1, .arrival_time = 0, .burst_time = 0};
    const Process negative_burst = {.pid = 1, .arrival_time = 0, .burst_time = -1};
    const Process duplicate[] = {
        {.pid = 1, .arrival_time = 0, .burst_time = 1},
        {.pid = 1, .arrival_time = 1, .burst_time = 1}
    };
    const Process valid = {.pid = 1, .arrival_time = 0, .burst_time = 1};
    SchedulerResult result;

    assert(scheduler_run(&negative_arrival, 1, SCHEDULER_ALGORITHM_SJF,
                         &result) == SCHEDULER_ERROR_INVALID_PROCESS);
    assert(scheduler_run(&zero_burst, 1, SCHEDULER_ALGORITHM_SJF,
                         &result) == SCHEDULER_ERROR_INVALID_PROCESS);
    assert(scheduler_run(&negative_burst, 1, SCHEDULER_ALGORITHM_SJF,
                         &result) == SCHEDULER_ERROR_INVALID_PROCESS);
    assert(scheduler_run(duplicate, ARRAY_COUNT(duplicate),
                         SCHEDULER_ALGORITHM_SJF, &result) ==
           SCHEDULER_ERROR_DUPLICATE_PID);
    assert(scheduler_run(&valid, 0, SCHEDULER_ALGORITHM_SJF, &result) ==
           SCHEDULER_ERROR_INVALID_COUNT);
    assert(scheduler_run(&valid, 1, (SchedulerAlgorithm)99, &result) ==
           SCHEDULER_ERROR_INVALID_ALGORITHM);
    assert(scheduler_run(NULL, 1, SCHEDULER_ALGORITHM_SJF, &result) ==
           SCHEDULER_ERROR_NULL_POINTER);
    assert(scheduler_run(&valid, 1, SCHEDULER_ALGORITHM_SJF, NULL) ==
           SCHEDULER_ERROR_NULL_POINTER);
}

static void test_gantt_merge_and_input_immutability(void)
{
    GanttChart chart;
    const Process input = {.pid = 1, .arrival_time = 0, .burst_time = 3};
    Process original = input;
    SchedulerResult result;

    assert(gantt_init(&chart, 1) == 1);
    assert(gantt_append(&chart, 1, 0, 1) == 1);
    assert(gantt_append(&chart, 1, 1, 3) == 1);
    assert(chart.count == 1);
    assert(chart.segments[0].start_time == 0);
    assert(chart.segments[0].end_time == 3);
    gantt_free(&chart);

    result = run_checked(&input, 1, SCHEDULER_ALGORITHM_SJF);
    assert(input.pid == original.pid);
    assert(input.arrival_time == original.arrival_time);
    assert(input.burst_time == original.burst_time);
    assert(input.remaining_time == original.remaining_time);
    assert(input.completion_time == original.completion_time);
    scheduler_result_free(&result);
}

int main(void)
{
    test_one_process();
    test_all_arrive_at_zero();
    test_reference_datasets();
    test_arrivals_and_idle_intervals();
    test_sjf_tie_breaking();
    test_srtf_preemption_and_ties();
    test_invalid_inputs();
    test_gantt_merge_and_input_immutability();
    puts("All comprehensive scheduler tests passed.");
    return 0;
}
