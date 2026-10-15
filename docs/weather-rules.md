# Weather risk rules

`backend/app/data/weather_risk_rules.json` is intentionally an empty list. Without sourced crop-specific rules, the API presents live weather observations only and explicitly says that no disease risk is inferred.

Each configured rule has this shape:

```json
[
  {
    "crop": "Tomato",
    "title": "Potential advisory name",
    "conditions": [["humidity_pct", ">=", 90], ["temperature_c", "<=", 24]],
    "source": "Organization, publication title, URL or DOI, version/date"
  }
]
```

The numeric values above are a schema example only and must **not** be used as a real validated rule. Before adding any threshold, document the crop/pathogen, geography and growing context, observation window, unit, evidence source, limitations, and review date. The engine explains the observed conditions and always calls the output a potential indicator, not diagnosis. Missing or malformed configuration never creates a claim.
