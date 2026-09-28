FROM python:3.12-slim

RUN useradd --create-home --shell /usr/sbin/nologin runner

COPY run_submission.py /app/run_submission.py
RUN chown -R runner:runner /app

USER runner
WORKDIR /app

ENTRYPOINT ["python", "/app/run_submission.py"]
