"""Fixed test harness baked into the sandbox image. Never AI-authored per run -
only the hidden test *specs* (tests.json) come from the AI; this script's own
logic is static and version-controlled.

Reads the submitted solution and hidden test specs from a read-only mounted
/workspace, execs the solution in an isolated namespace, calls each hidden
test's target function, and prints one final line prefixed with
"##RESULTS##" containing a JSON payload the backend parses deterministically.
"""

import contextlib
import io
import json
import traceback

SOLUTION_PATH = "/workspace/solution.py"
TESTS_PATH = "/workspace/tests.json"
RESULTS_PREFIX = "##RESULTS##"


def run_tests(namespace, tests, stdout_buffer, stderr_buffer):
    results = []
    for test in tests:
        name = test.get("name", "unnamed test")
        function_name = test.get("functionName")
        args = test.get("args", [])
        expected = test.get("expected")

        func = namespace.get(function_name)
        if not callable(func):
            results.append(
                {"name": name, "passed": False, "details": f"Function '{function_name}' is not defined"}
            )
            continue

        try:
            with contextlib.redirect_stdout(stdout_buffer), contextlib.redirect_stderr(stderr_buffer):
                actual = func(*args)
            if actual == expected:
                results.append({"name": name, "passed": True})
            else:
                results.append(
                    {"name": name, "passed": False, "details": f"Expected {expected!r}, got {actual!r}"}
                )
        except Exception:
            results.append({"name": name, "passed": False, "details": traceback.format_exc()})
    return results


def main():
    with open(SOLUTION_PATH, "r", encoding="utf-8") as f:
        code = f.read()
    with open(TESTS_PATH, "r", encoding="utf-8") as f:
        tests = json.load(f)

    namespace = {"__name__": "__main__"}
    stdout_buffer = io.StringIO()
    stderr_buffer = io.StringIO()
    exec_error = None

    try:
        with contextlib.redirect_stdout(stdout_buffer), contextlib.redirect_stderr(stderr_buffer):
            exec(compile(code, "solution.py", "exec"), namespace)
    except Exception:
        exec_error = traceback.format_exc()

    if exec_error is None:
        results = run_tests(namespace, tests, stdout_buffer, stderr_buffer)
    else:
        results = [
            {"name": test.get("name", "unnamed test"), "passed": False, "details": "Solution raised an error before tests could run"}
            for test in tests
        ]

    payload = {
        "stdout": stdout_buffer.getvalue(),
        "stderr": stderr_buffer.getvalue() + (exec_error or ""),
        "testResults": results,
    }
    print(RESULTS_PREFIX + json.dumps(payload))


if __name__ == "__main__":
    main()
