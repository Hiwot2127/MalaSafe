"""Background tasks run in-process via asyncio.create_task().

- monthly_close.run(close_id) — orchestrates a MonthlyClose state machine.
- predict_monthly.run_monthly_predictions(target_month=None) — batch predict
  for the next calendar month.
"""
