# Match Metrics

## Overview

Metrics related to match creation, acceptance, and completion.

## Match Volume

### Creation

| Metric                   | Breakdown                      |
| ------------------------ | ------------------------------ |
| Total Matches Created    | All-time, cumulative           |
| Matches Created (period) | Daily, weekly, monthly, yearly |
| Public vs Private        | Ratio                          |
| Singles vs Doubles       | Ratio                          |

### Match Funnel

```
Created → Sent → Accepted → Completed → Feedback
```

| Stage          | Count | Rate |
| -------------- | ----- | ---- |
| Created        | 1000  | 100% |
| Sent           | 950   | 95%  |
| Accepted       | 600   | 63%  |
| Completed      | 550   | 92%  |
| Feedback Given | 400   | 73%  |

## Match Outcomes

### Acceptance

| Metric          | Value                            |
| --------------- | -------------------------------- |
| Acceptance Rate | % of matches accepted            |
| Time to Accept  | Average time from send to accept |
| Decline Rate    | % explicitly declined            |
| Expiry Rate     | % expired without response       |

### Completion

| Metric                    | Value                           |
| ------------------------- | ------------------------------- |
| Completion Rate           | % of accepted matches completed |
| Cancellation Rate         | % cancelled after acceptance    |
| Last-Minute Cancellations | Within 24h                      |
| No-Show Rate              | % no-shows                      |

### Auto-Generated Matches

| Metric             | Value                 |
| ------------------ | --------------------- |
| Generated per Week | Average               |
| Approval Rate      | % approved by users   |
| Resulted in Match  | % that were completed |

## Timing Analytics

### Match Creation Speed

| Metric                | Value                 |
| --------------------- | --------------------- |
| Average Creation Time | Time to complete form |
| Drop-off Points       | Where users abandon   |

### Time to Fill

For matches with multiple recipients:

- Average time for first acceptance
- Fill rate (% filled before expiry)

## Quality Metrics

### Feedback Scores

| Metric                   | Value                      |
| ------------------------ | -------------------------- |
| Average Rating           | Stars given                |
| 5-Star Rate              | % of 5-star ratings        |
| 1-Star Rate              | % of 1-star ratings        |
| Feedback Completion Rate | % of matches with feedback |

### Repeat Play

| Metric                   | Value                      |
| ------------------------ | -------------------------- |
| Repeat Matches           | Same players matched again |
| Average Matches per Pair | For active pairs           |

## Geographic Distribution

- Matches by arrondissement
- Matches by city
- Matches by region
- Evolution over time

## Visualizations

- Funnel charts for match lifecycle
- Time series for volume
- Geographic heatmaps
- Distribution histograms
