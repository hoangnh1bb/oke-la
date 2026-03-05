# SmartRec Pricing Policy v2.0

**Date:** March 5, 2026, 23:18 GMT+7  
**Changes:** Free users can buy add-ons + PRO bundle discount

---

## New Pricing Structure

### Standalone Plans
| Tier | Price | Description |
|------|-------|-------------|
| **FREE** | $0/mo | 500 lượt/tháng, có thể mua add-ons |
| **GROWTH** | $11/mo | Unlimited lượt, analytics, trial 7 ngày |

### Add-ons (Có thể mua với FREE hoặc GROWTH)
| Add-on | Price | Requirements |
|--------|-------|--------------|
| **Giao Diện Pro** | $5/mo | Không cần GROWTH |
| **Thống Kê Pro** | $7/mo | Không cần GROWTH |

### Bundle Package (NEW!)
| Bundle | Price | Included | Savings |
|--------|-------|----------|---------|
| **PRO** | $20/mo | GROWTH + 2 Add-ons | Save $3/mo |

---

## Pricing Comparison

### Old Policy (v1.0)
```
FREE: $0
GROWTH: $11
Add-ons: GROWTH required
Total if buy all: $11 + $5 + $7 = $23/mo
```

### New Policy (v2.0)
```
FREE: $0 (can buy add-ons)
GROWTH: $11
Add-ons: $5 + $7 (no GROWTH required)
PRO Bundle: $20/mo (save $3)

Comparison:
- Buy separately: $11 + $5 + $7 = $23/mo
- Buy PRO bundle: $20/mo
- Savings: $3/mo
```

---

## Use Cases

### FREE User
```
Option 1: Stay FREE
  → $0/mo, 500 lượt

Option 2: Buy Giao Diện Pro only
  → $5/mo, 500 lượt + customization

Option 3: Buy both add-ons
  → $12/mo, 500 lượt + full customization + analytics
  (Still has 500 limit)

Option 4: Upgrade to GROWTH
  → $11/mo, unlimited + can buy add-ons later
```

### GROWTH User
```
Option 1: Stay GROWTH only
  → $11/mo, unlimited

Option 2: Buy add-ons separately
  → $11 + $5 + $7 = $23/mo

Option 3: Upgrade to PRO bundle
  → $20/mo (save $3)
```

---

## Business Logic Changes

### Add-on Purchase
**Old:** Requires GROWTH plan  
**New:** No requirement (FREE can buy)

### PRO Bundle
**Old:** $23/mo (no discount)  
**New:** $20/mo (13% discount)

### Free Tier Limits
**Unchanged:** 500 lượt/tháng soft limit  
**With add-ons:** Still 500 lượt (must upgrade GROWTH for unlimited)

---

## Implementation Checklist

- [ ] Update pricing constants
- [ ] Update add-on purchase logic (remove GROWTH check)
- [ ] Update PRO bundle pricing ($20)
- [ ] Update pricing dashboard UI
- [ ] Update add-ons page UI
- [ ] Update comparison table
- [ ] Update bundle offer banner
- [ ] Test all flows

---

**Status:** Policy defined, ready to implement
