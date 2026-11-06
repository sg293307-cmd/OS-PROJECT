cmake_minimum_required(VERSION 3.16)
project(cpu_scheduler_engine LANGUAGES C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS OFF)

add_library(cpu_scheduler
    process.c
    gantt.c
    metrics.c
    sjf.c
    srtf.c
    scheduler.c
)

target_include_directories(cpu_scheduler PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/include")
target_compile_options(cpu_scheduler PRIVATE -Wall -Wextra -Werror -Wpedantic)

add_executable(test_scheduler tests/test_scheduler.c)
target_link_libraries(test_scheduler PRIVATE cpu_scheduler m)
target_compile_options(test_scheduler PRIVATE -Wall -Wextra -Werror -Wpedantic)

add_library(cpu_scheduler_wasm_api wasm_api.c)
target_link_libraries(cpu_scheduler_wasm_api PRIVATE cpu_scheduler)
target_include_directories(cpu_scheduler_wasm_api PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/include")
target_compile_options(cpu_scheduler_wasm_api PRIVATE -Wall -Wextra -Werror -Wpedantic)

add_executable(test_wasm_api tests/test_wasm_api.c)
target_link_libraries(test_wasm_api PRIVATE cpu_scheduler_wasm_api cpu_scheduler m)
target_compile_options(test_wasm_api PRIVATE -Wall -Wextra -Werror -Wpedantic)

enable_testing()
add_test(NAME scheduler_tests COMMAND test_scheduler)
add_test(NAME wasm_api_tests COMMAND test_wasm_api)

if (EMSCRIPTEN)
    set(WASM_OUTPUT_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../public/wasm")
    add_executable(scheduler_wasm wasm_api.c)
    target_link_libraries(scheduler_wasm PRIVATE cpu_scheduler)
    target_include_directories(scheduler_wasm PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}/include")
    set_target_properties(scheduler_wasm PROPERTIES
        SUFFIX ".js"
        RUNTIME_OUTPUT_DIRECTORY "${WASM_OUTPUT_DIR}"
        LINK_FLAGS "-sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web -sALLOW_MEMORY_GROWTH=1 -sEXPORTED_FUNCTIONS=['_run_scheduler','_malloc','_free'] -sEXPORTED_RUNTIME_METHODS=['HEAP32','HEAPF64']")
endif()
