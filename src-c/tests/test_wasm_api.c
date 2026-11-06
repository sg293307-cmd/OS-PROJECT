#include "wasm_api.h"

#include <assert.h>
#include <math.h>
#include <stdio.h>

static void assert_close(double actual, double expected)
{
    assert(fabs(actual - expected) < 0.000001);
}

static int run_reference(int algorithm, int max_segments)
{
    const int pids[] = {1, 2, 3, 4};
    const int arrivals[] = {0, 2, 4, 5};
    const int bursts[] = {7, 4, 1, 4};
    int completion[4];
    int turnaround[4];
    int waiting[4];
    int response[4];
    int segment_pids[8];
    int starts[8];
    int ends[8];
    int segment_count = 0;
    double average_waiting;
    double average_turnaround;
    double average_response;
    double utilization;
    double throughput;
    int elapsed;
    int busy;
    int idle;
    int status = run_scheduler(
        algorithm, 4, pids, arrivals, bursts, completion, turnaround, waiting,
        response, segment_pids, starts, ends, max_segments, &segment_count,
        &average_waiting, &average_turnaround, &average_response, &utilization,
        &throughput, &elapsed, &busy, &idle);

    if (max_segments < 6) {
        assert(status == SCHEDULER_ERROR_BUFFER_TOO_SMALL);
        assert(segment_count == 6);
        return status;
    }
    assert(status == SCHEDULER_OK);
    assert(segment_count == (algorithm == SCHEDULER_ALGORITHM_SJF ? 4 : 6));
    assert(completion[0] == (algorithm == SCHEDULER_ALGORITHM_SJF ? 7 : 16));
    assert(completion[1] == (algorithm == SCHEDULER_ALGORITHM_SJF ? 12 : 7));
    assert(completion[2] == (algorithm == SCHEDULER_ALGORITHM_SJF ? 8 : 5));
    assert(completion[3] == (algorithm == SCHEDULER_ALGORITHM_SJF ? 16 : 11));
    assert_close(average_waiting, algorithm == SCHEDULER_ALGORITHM_SJF ? 4.0 : 3.0);
    assert_close(average_turnaround, algorithm == SCHEDULER_ALGORITHM_SJF ? 8.0 : 7.0);
    assert_close(average_response, algorithm == SCHEDULER_ALGORITHM_SJF ? 4.0 : 0.5);
    assert_close(utilization, 100.0);
    assert_close(throughput, 0.25);
    assert(elapsed == 16);
    assert(busy == 16);
    assert(idle == 0);
    return status;
}

int main(void)
{
    int pids[] = {1};
    int arrivals[] = {0};
    int bursts[] = {1};
    int output[1];
    int segments[1];
    int count = 0;
    double metric = 0.0;
    int status;
    int invalid_arrivals[] = {-1};
    int invalid_bursts[] = {0};

    assert(run_reference(SCHEDULER_ALGORITHM_SJF, 8) == SCHEDULER_OK);
    assert(run_reference(SCHEDULER_ALGORITHM_SRTF, 8) == SCHEDULER_OK);
    assert(run_reference(SCHEDULER_ALGORITHM_SRTF, 1) ==
           SCHEDULER_ERROR_BUFFER_TOO_SMALL);
    status = run_scheduler(99, 1, pids, arrivals, bursts, output, output,
                           output, output, segments, segments, segments, 1,
                           &count, &metric, &metric, &metric, &metric, &metric,
                           output, output, output);
    assert(status == SCHEDULER_ERROR_INVALID_ALGORITHM);
    status = run_scheduler(SCHEDULER_ALGORITHM_SJF, 0, pids, arrivals, bursts,
                           output, output, output, output, segments, segments,
                           segments, 1, &count, &metric, &metric, &metric,
                           &metric, &metric, output, output, output);
    assert(status == SCHEDULER_ERROR_INVALID_COUNT);
    status = run_scheduler(SCHEDULER_ALGORITHM_SJF, 1, NULL, arrivals, bursts,
                           output, output, output, output, segments, segments,
                           segments, 1, &count, &metric, &metric, &metric,
                           &metric, &metric, output, output, output);
    assert(status == SCHEDULER_ERROR_NULL_POINTER);
    status = run_scheduler(SCHEDULER_ALGORITHM_SJF, 1, pids,
                           invalid_arrivals, bursts, output, output, output,
                           output, segments, segments, segments, 1, &count,
                           &metric, &metric, &metric, &metric, &metric, output,
                           output, output);
    assert(status == SCHEDULER_ERROR_INVALID_PROCESS);
    status = run_scheduler(SCHEDULER_ALGORITHM_SJF, 1, pids, arrivals,
                           invalid_bursts, output, output, output, output,
                           segments, segments, segments, 1, &count, &metric,
                           &metric, &metric, &metric, &metric, output, output,
                           output);
    assert(status == SCHEDULER_ERROR_INVALID_PROCESS);
    puts("All WASM ABI native tests passed.");
    return 0;
}
