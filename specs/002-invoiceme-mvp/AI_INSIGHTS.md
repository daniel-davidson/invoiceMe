# AI Insights: InvoiceMe MVP

**Version**: 1.0
**Date**: 2026-01-18
**Purpose**: Document 3 insight types and SQL→LLM rules

---

## Overview

AI Insights provide users with actionable spending recommendations based on their invoice data. The system follows a strict separation of concerns:

- **SQL computes all metrics**: Totals, averages, comparisons, anomaly detection
- **LLM summarizes and explains**: Generates natural language narratives from metrics

**Critical Rule**: The LLM NEVER computes truth. All numerical facts come from SQL queries.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INSIGHT GENERATION                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Step 1     │───►│   Step 2     │───►│   Step 3     │  │
│  │ SQL Metrics  │    │ LLM Prompt   │    │  Store       │  │
│  │ Computation  │    │ Generation   │    │  Insight     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘

SQL: SELECT SUM(...), AVG(...), COUNT(...)  →  Metrics JSON
                                                      ↓
LLM: "Given these metrics: {...}, explain..."  →  Narrative
                                                      ↓
DB: INSERT INTO insights (metrics, narrative)
```

---

## Insight Type 1: Monthly Narrative

### Purpose
Provide month-over-month spending analysis with trend identification.

### SQL Metrics Computation

```sql
-- Current month spend
SELECT
  SUM(normalizedAmount) as currentMonthSpend
FROM invoices
WHERE
  tenantId = $1
  AND invoiceDate >= DATE_TRUNC('month', CURRENT_DATE)
  AND invoiceDate < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';

-- Previous month spend
SELECT
  SUM(normalizedAmount) as previousMonthSpend
FROM invoices
WHERE
  tenantId = $1
  AND invoiceDate >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
  AND invoiceDate < DATE_TRUNC('month', CURRENT_DATE);

-- Top vendor change
SELECT
  v.name as vendorName,
  (
    SELECT SUM(i1.normalizedAmount)
    FROM invoices i1
    WHERE i1.vendorId = v.id
      AND i1.invoiceDate >= DATE_TRUNC('month', CURRENT_DATE)
  ) - (
    SELECT COALESCE(SUM(i2.normalizedAmount), 0)
    FROM invoices i2
    WHERE i2.vendorId = v.id
      AND i2.invoiceDate >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
      AND i2.invoiceDate < DATE_TRUNC('month', CURRENT_DATE)
  ) as change
FROM vendors v
WHERE v.tenantId = $1
ORDER BY ABS(change) DESC
LIMIT 1;
```

### Metrics JSON Structure

```json
{
  "type": "monthly_narrative",
  "currentMonthSpend": 5200.00,
  "previousMonthSpend": 4800.00,
  "changePercent": 8.33,
  "changeAbsolute": 400.00,
  "topVendorChange": {
    "name": "AWS",
    "change": 300.00,
    "changePercent": 25.0
  },
  "month": "January 2026",
  "currency": "USD"
}
```

### LLM Prompt Template

```
You are a financial insights assistant. Generate a concise, actionable narrative based on the following spending metrics.

METRICS:
{metricsJson}

Generate a 2-3 sentence narrative that:
1. Summarizes the overall spending change
2. Highlights the most significant vendor change
3. Provides a brief recommendation or observation

Return ONLY the narrative text, no JSON or additional formatting.
```

### Example Output

**Metrics**:
```json
{
  "currentMonthSpend": 5200.00,
  "previousMonthSpend": 4800.00,
  "changePercent": 8.33,
  "topVendorChange": { "name": "AWS", "change": 300.00 }
}
```

**LLM Narrative**:
> "Your spending increased by 8.3% this month, primarily driven by a $300 increase at AWS. Consider reviewing your cloud costs to identify optimization opportunities."

### Stored Insight

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "insightType": "MONTHLY_NARRATIVE",
  "title": "January 2026 Spending Summary",
  "content": "Your spending increased by 8.3% this month...",
  "relatedMetrics": { /* full metrics JSON */ },
  "generatedAt": "2026-01-18T10:00:00Z"
}
```

---

## Insight Type 2: Recurring Charges

### Purpose
Detect and summarize recurring subscriptions and regular payments.

### SQL Metrics Computation

```sql
-- Detect recurring patterns (same vendor + similar amount)
WITH monthly_invoices AS (
  SELECT
    vendorId,
    DATE_TRUNC('month', invoiceDate) as month,
    AVG(normalizedAmount) as avgAmount,
    COUNT(*) as invoiceCount,
    STDDEV(normalizedAmount) as amountStdDev
  FROM invoices
  WHERE
    tenantId = $1
    AND invoiceDate >= CURRENT_DATE - INTERVAL '6 months'
  GROUP BY vendorId, DATE_TRUNC('month', invoiceDate)
),
recurring_candidates AS (
  SELECT
    v.name as vendorName,
    AVG(mi.avgAmount) as avgAmount,
    COUNT(DISTINCT mi.month) as monthsDetected,
    AVG(mi.amountStdDev) as avgStdDev
  FROM monthly_invoices mi
  JOIN vendors v ON v.id = mi.vendorId
  WHERE mi.invoiceCount >= 1  -- At least 1 invoice per month
  GROUP BY v.id, v.name
  HAVING
    COUNT(DISTINCT mi.month) >= 3  -- Present in at least 3 months
    AND AVG(mi.amountStdDev) < (AVG(mi.avgAmount) * 0.1)  -- Low variance (< 10%)
)
SELECT
  vendorName,
  ROUND(avgAmount, 2) as amount,
  monthsDetected,
  CASE
    WHEN monthsDetected >= 6 THEN 'monthly'
    WHEN monthsDetected >= 3 THEN 'quarterly'
    ELSE 'irregular'
  END as frequency,
  CASE
    WHEN avgStdDev < (avgAmount * 0.05) THEN 0.95
    WHEN avgStdDev < (avgAmount * 0.10) THEN 0.85
    ELSE 0.70
  END as confidence
FROM recurring_candidates
ORDER BY avgAmount DESC;
```

### Metrics JSON Structure

```json
{
  "type": "recurring_charges",
  "detected": [
    {
      "vendor": "Spotify",
      "amount": 9.99,
      "frequency": "monthly",
      "confidence": 0.95,
      "monthsDetected": 6
    },
    {
      "vendor": "AWS",
      "amount": 450.00,
      "frequency": "monthly",
      "confidence": 0.80,
      "monthsDetected": 6
    }
  ],
  "totalMonthlyRecurring": 459.99,
  "currency": "USD"
}
```

### LLM Prompt Template

```
You are a financial insights assistant. Analyze the following recurring charge data and generate a concise summary.

METRICS:
{metricsJson}

Generate a 2-3 sentence narrative that:
1. States how many recurring charges were detected
2. Highlights the total monthly recurring cost
3. Mentions the most significant or longest-running subscription

Return ONLY the narrative text, no JSON or additional formatting.
```

### Example Output

**Metrics**:
```json
{
  "detected": [
    { "vendor": "Spotify", "amount": 9.99, "monthsDetected": 6 },
    { "vendor": "AWS", "amount": 450.00, "monthsDetected": 6 }
  ],
  "totalMonthlyRecurring": 459.99
}
```

**LLM Narrative**:
> "We detected 2 recurring charges totaling $459.99 per month. AWS has been your largest recurring expense at $450.00, consistent for the past 6 months. Consider reviewing your subscriptions to ensure they're still providing value."

---

## Insight Type 3: Anomalies

### Purpose
Identify duplicates, spending spikes, and unusual patterns requiring user attention.

### SQL Metrics Computation

#### Duplicate Detection

```sql
-- Find potential duplicate invoices (same vendor, amount, and date)
SELECT
  v.name as vendorName,
  i.originalAmount as amount,
  i.invoiceDate,
  ARRAY_AGG(i.id) as invoiceIds,
  COUNT(*) as duplicateCount
FROM invoices i
JOIN vendors v ON v.id = i.vendorId
WHERE
  i.tenantId = $1
  AND i.invoiceDate >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY v.id, v.name, i.originalAmount, i.invoiceDate
HAVING COUNT(*) > 1
ORDER BY duplicateCount DESC, amount DESC;
```

#### Spending Spikes

```sql
-- Find invoices significantly higher than vendor average
WITH vendor_stats AS (
  SELECT
    vendorId,
    AVG(normalizedAmount) as avgAmount,
    STDDEV(normalizedAmount) as stdDev
  FROM invoices
  WHERE
    tenantId = $1
    AND invoiceDate >= CURRENT_DATE - INTERVAL '6 months'
  GROUP BY vendorId
  HAVING COUNT(*) >= 3  -- Need at least 3 invoices for meaningful stats
)
SELECT
  v.name as vendorName,
  i.id as invoiceId,
  i.normalizedAmount as amount,
  vs.avgAmount as expectedAmount,
  (i.normalizedAmount / vs.avgAmount) as multiplier
FROM invoices i
JOIN vendors v ON v.id = i.vendorId
JOIN vendor_stats vs ON vs.vendorId = i.vendorId
WHERE
  i.tenantId = $1
  AND i.invoiceDate >= CURRENT_DATE - INTERVAL '1 month'
  AND i.normalizedAmount > (vs.avgAmount + (3 * vs.stdDev))  -- 3 sigma rule
ORDER BY multiplier DESC
LIMIT 5;
```

### Metrics JSON Structure

```json
{
  "type": "anomalies",
  "items": [
    {
      "category": "duplicate",
      "invoiceIds": ["uuid1", "uuid2"],
      "vendor": "Office Depot",
      "amount": 150.00,
      "date": "2026-01-15",
      "action": "Review for potential double-charge"
    },
    {
      "category": "spike",
      "invoiceIds": ["uuid3"],
      "vendor": "Office Supplies",
      "amount": 2500.00,
      "expectedAmount": 200.00,
      "multiplier": 12.5,
      "action": "Unusually high - verify this purchase"
    }
  ],
  "totalAnomalies": 2,
  "currency": "USD"
}
```

### LLM Prompt Template

```
You are a financial insights assistant. Analyze the following spending anomalies and generate a concise alert.

METRICS:
{metricsJson}

Generate a 2-3 sentence narrative that:
1. States how many anomalies were found
2. Highlights the most significant issue
3. Provides a clear recommended action

Return ONLY the narrative text, no JSON or additional formatting.
```

### Example Output

**Metrics**:
```json
{
  "items": [
    {
      "category": "duplicate",
      "vendor": "Office Depot",
      "amount": 150.00
    },
    {
      "category": "spike",
      "vendor": "Office Supplies",
      "amount": 2500.00,
      "expectedAmount": 200.00,
      "multiplier": 12.5
    }
  ]
}
```

**LLM Narrative**:
> "Found 2 spending anomalies requiring attention. Office Supplies shows an unusual charge of $2,500 (12.5x your normal amount), and a potential duplicate charge of $150 at Office Depot. Review these invoices to ensure accuracy."

---

## Generation Workflow

### Trigger Points

1. **Manual**: User clicks "Generate Insights" button
2. **Automatic**: After uploading 10+ invoices (POC)
3. **Scheduled**: Not implemented in POC (future: weekly/monthly)

### Generation Process

```typescript
async function generateInsights(tenantId: string, types?: InsightType[]): Promise<Insight[]> {
  const typesToGenerate = types || ['MONTHLY_NARRATIVE', 'RECURRING_CHARGES', 'ANOMALIES'];
  const results: Insight[] = [];

  for (const type of typesToGenerate) {
    try {
      // Step 1: Compute SQL metrics
      const metrics = await computeMetrics(type, tenantId);

      // Step 2: Check if sufficient data
      if (!hasSufficientData(metrics, type)) {
        continue;  // Skip this insight type
      }

      // Step 3: Generate LLM narrative
      const narrative = await generateNarrative(type, metrics);

      // Step 4: Store insight
      const insight = await prisma.insight.create({
        data: {
          tenantId,
          insightType: type,
          title: generateTitle(type, metrics),
          content: narrative,
          relatedMetrics: metrics,
          generatedAt: new Date()
        }
      });

      results.push(insight);
    } catch (error) {
      logger.error(`Failed to generate ${type} insight`, { tenantId, error });
    }
  }

  return results;
}
```

### Data Sufficiency Rules

| Insight Type | Minimum Data Required |
|--------------|----------------------|
| MONTHLY_NARRATIVE | At least 1 invoice in current month AND 1 in previous month |
| RECURRING_CHARGES | At least 3 months of invoice history with 3+ invoices |
| ANOMALIES | At least 5 invoices in last 3 months |

---

## LLM Configuration

### Ollama Settings

```typescript
{
  model: 'llama2',  // Or user-configured model
  temperature: 0.3,  // Low temperature for consistent, factual output
  max_tokens: 200,   // Short narratives only
  timeout: 10000     // 10 second timeout
}
```

### Prompt Engineering Best Practices

1. **Be explicit**: "Return ONLY the narrative text"
2. **Provide structure**: "Generate a 2-3 sentence narrative that..."
3. **Include all metrics**: Pass complete JSON to avoid hallucination
4. **Set constraints**: "Do not compute any numbers, only explain the provided metrics"

---

## Error Handling

### SQL Errors

| Error | Action |
|-------|--------|
| No data for time period | Skip insight generation, return empty array |
| Query timeout | Log error, skip insight type |
| Invalid tenant | Return 404 |

### LLM Errors

| Error | Action |
|-------|--------|
| Ollama unavailable | Return 503 Service Unavailable |
| Invalid response | Retry once, then use fallback template |
| Timeout | Retry once, then skip insight |

### Fallback Templates

If LLM fails, use template-based narratives:

```typescript
const fallbackTemplates = {
  MONTHLY_NARRATIVE: (metrics) =>
    `Your spending ${metrics.changePercent > 0 ? 'increased' : 'decreased'} by ${Math.abs(metrics.changePercent).toFixed(1)}% this month.`,

  RECURRING_CHARGES: (metrics) =>
    `Detected ${metrics.detected.length} recurring charges totaling $${metrics.totalMonthlyRecurring.toFixed(2)} per month.`,

  ANOMALIES: (metrics) =>
    `Found ${metrics.totalAnomalies} spending anomalies requiring review.`
};
```

---

## Performance Optimization

### Caching Strategy

- **Metrics**: Cache for 1 hour (metrics don't change frequently)
- **Insights**: Store in database, don't regenerate unless explicitly requested

### Parallel Generation

```typescript
const insights = await Promise.all([
  generateMonthlyNarrative(tenantId),
  generateRecurringCharges(tenantId),
  generateAnomalies(tenantId)
]);
```

**Expected Total Time**: 5-10 seconds for all 3 insights

---

## UI Display Guidelines

### Insight Card Layout

```
┌─────────────────────────────────────────┐
│ 📊 [Insight Type Icon]                  │
│ [Title]                                 │
│ [Generated: X hours ago]                │
├─────────────────────────────────────────┤
│ [Narrative text]                        │
├─────────────────────────────────────────┤
│ [View Details] [Dismiss]                │
└─────────────────────────────────────────┘
```

### Insight Type Icons

- **MONTHLY_NARRATIVE**: 📊 (chart)
- **RECURRING_CHARGES**: 🔄 (repeat)
- **ANOMALIES**: ⚠️ (warning)

### Priority Order

1. ANOMALIES (highest priority - requires action)
2. MONTHLY_NARRATIVE (informational)
3. RECURRING_CHARGES (informational)

---

## Testing Strategy

### Unit Tests

```typescript
describe('Monthly Narrative Metrics', () => {
  it('should compute correct change percentage', async () => {
    const metrics = await computeMonthlyNarrativeMetrics(testTenantId);
    expect(metrics.changePercent).toBe(8.33);
  });

  it('should identify top vendor change', async () => {
    const metrics = await computeMonthlyNarrativeMetrics(testTenantId);
    expect(metrics.topVendorChange.name).toBe('AWS');
  });
});
```

### Integration Tests

```typescript
describe('Insight Generation', () => {
  it('should generate all 3 insight types', async () => {
    const insights = await generateInsights(testTenantId);
    expect(insights).toHaveLength(3);
    expect(insights.map(i => i.insightType)).toContain('MONTHLY_NARRATIVE');
  });

  it('should not hallucinate numbers', async () => {
    const insight = await generateInsights(testTenantId, ['MONTHLY_NARRATIVE']);
    const narrative = insight[0].content;
    const metrics = insight[0].relatedMetrics;

    // Verify LLM used correct numbers from metrics
    expect(narrative).toContain(metrics.changePercent.toFixed(1));
  });
});
```

---

## Summary

**Insight Types**: 3
**SQL Queries per Generation**: 5-8
**LLM Calls per Generation**: 3
**Average Generation Time**: 5-10 seconds
**Data Retention**: Insights stored indefinitely (user can delete)

**Critical Rule**: SQL computes truth, LLM explains it. Never the other way around.
