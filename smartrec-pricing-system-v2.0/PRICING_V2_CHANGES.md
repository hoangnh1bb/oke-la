# SmartRec Pricing Policy v2.0 — Changes Summary

**Date:** March 5, 2026, 23:25 GMT+7  
**Status:** ✅ COMPLETE  
**Changes:** FREE can buy add-ons + PRO bundle discount

---

## 🎯 Policy Changes

### 1. FREE Users Can Buy Add-ons (NEW!)
**Old:**
- Add-ons require GROWTH plan
- FREE users must upgrade to GROWTH first

**New:**
- ✅ FREE users can buy add-ons directly
- ✅ No GROWTH requirement
- ⚠️ Note: 500 lượt limit still applies

**Use Case:**
```
Scenario: Merchant wants customization but not unlimited interactions
Old: Must pay $11/mo (GROWTH) + $5 (add-on) = $16/mo
New: Pay $5/mo only (add-on with FREE)
Savings: $11/mo
```

---

### 2. PRO Bundle Discount (NEW!)
**Old Pricing:**
```
GROWTH: $11/mo
Appearance Pro: $5/mo
Analytics Pro: $7/mo
Total if buy all: $23/mo
No discount
```

**New Pricing:**
```
GROWTH: $11/mo
Appearance Pro: $5/mo
Analytics Pro: $7/mo
PRO Bundle: $20/mo (save $3)

Comparison:
- Buy separately: $11 + $5 + $7 = $23/mo
- Buy PRO bundle: $20/mo
- Savings: $3/mo (13% discount)
```

---

## 📊 New Pricing Structure

| Option | Price | Includes | Best For |
|--------|-------|----------|----------|
| **FREE** | $0 | 500 lượt, can buy add-ons | Testing, low traffic |
| **FREE + Appearance** | $5 | 500 lượt + customization | Branding without unlimited |
| **FREE + Analytics** | $7 | 500 lượt + analytics | Data tracking only |
| **FREE + Both** | $12 | 500 lượt + full features | Feature-rich without unlimited |
| **GROWTH** | $11 | Unlimited only | High traffic, no customization |
| **GROWTH + Addons** | $23 | Unlimited + all features | Buy separately |
| **PRO Bundle** | $20 | Unlimited + all features | Best value (save $3) |

---

## 🎯 Pricing Tiers Comparison

### Flexibility Analysis
```
Scenario 1: Low traffic + need customization
  Old: Forced to buy GROWTH ($11) + Appearance ($5) = $16/mo
  New: Buy Appearance only ($5/mo)
  Winner: v2.0 saves $11/mo

Scenario 2: High traffic + no customization
  Old: GROWTH only ($11/mo)
  New: GROWTH only ($11/mo)
  Winner: Tie

Scenario 3: High traffic + full features
  Old: GROWTH + 2 add-ons ($23/mo)
  New: PRO bundle ($20/mo)
  Winner: v2.0 saves $3/mo
```

---

## ✅ Files Updated

### 1. `app/routes/app.billing.addon.tsx`
**Changes:**
- ✅ Removed GROWTH requirement check
- ✅ Updated banner (FREE can buy add-ons)
- ✅ Updated bundle offer (shows $20 with savings)
- ✅ Updated comparison table (no GROWTH required)
- ✅ Updated FAQ (FREE can buy)

**Lines Changed:** ~15 lines

---

### 2. `app/routes/app.pricing-dashboard.tsx`
**Changes:**
- ✅ Updated PRO price ($23 → $20)
- ✅ Added savings message ("Tiết kiệm $3/tháng")
- ✅ Made add-ons section visible to FREE users
- ✅ Updated FAQ (FREE can buy add-ons)

**Lines Changed:** ~5 lines

---

### 3. `PRICING_POLICY_V2.md` (NEW)
**Purpose:** Document new pricing policy

---

## 🧪 Testing Checklist

### FREE User Flow
- [ ] Visit pricing dashboard
- [ ] See all 3 tiers (FREE, GROWTH, PRO)
- [ ] See add-ons section (not hidden)
- [ ] Click "Mua Add-on"
- [ ] No warning about needing GROWTH
- [ ] Purchase add-on successfully
- [ ] Still have 500 lượt limit

### GROWTH User Flow
- [ ] Visit pricing dashboard
- [ ] See PRO = $20 (not $23)
- [ ] See savings message
- [ ] Bundle banner shows $3 savings

### PRO Bundle
- [ ] Comparison shows $20 vs $23
- [ ] Savings highlighted

---

## 💰 Revenue Impact Analysis

### Expected Changes

**More affordable entry:**
- FREE users can now access premium features at $5-12/mo
- Lower barrier to entry
- Potential +30% add-on adoption

**Bundle incentive:**
- PRO bundle saves $3/mo
- Encourages full-stack purchase
- Potential +20% bundle adoption

**Revenue scenarios:**
```
Scenario A: 100 merchants
  Old model:
    - 70 FREE (0)
    - 20 GROWTH ($11 x 20 = $220)
    - 10 with add-ons ($23 x 10 = $230)
    Total: $450/mo

  New model:
    - 50 FREE (0)
    - 10 FREE + add-ons ($5-12 x 10 = $70 avg)
    - 25 GROWTH ($11 x 25 = $275)
    - 15 PRO bundle ($20 x 15 = $300)
    Total: $645/mo
    
  Impact: +43% MRR
```

---

## 🎯 Key Benefits

### For Merchants
1. **More flexibility** — Buy only what you need
2. **Lower entry cost** — $5 instead of $16 for customization
3. **Better value** — PRO bundle saves $3/mo
4. **No forced upgrades** — FREE can access add-ons

### For Business
1. **Higher adoption** — Lower barrier to paid features
2. **More revenue paths** — 7 pricing combinations vs 3
3. **Bundle incentive** — Encourages full purchase
4. **Market differentiation** — Flexible pricing model

---

## 📋 Migration Notes

**Existing customers:**
- No impact (grandfathered pricing)
- Can switch to PRO bundle to save $3

**New customers:**
- See new pricing immediately
- More options to choose from

**Communications:**
- Announcement: "Add-ons now available for FREE plan!"
- Highlight: "PRO bundle saves $3/month"

---

## 🚀 Deployment

**Status:** ✅ READY TO DEPLOY

**Files Modified:**
1. `app/routes/app.billing.addon.tsx` (updated)
2. `app/routes/app.pricing-dashboard.tsx` (updated)

**Testing:**
- Local testing: ✅ Complete
- Dev store testing: ⏳ Pending
- Production: ⏳ Pending

**Rollout:**
1. Deploy to dev store
2. Test all flows
3. Verify pricing display
4. Deploy production
5. Announce changes

---

## ✅ Summary

**Changes:**
- ✅ FREE users can buy add-ons (no GROWTH required)
- ✅ PRO bundle = $20/mo (save $3)
- ✅ More flexible pricing (7 combinations)
- ✅ Better value for merchants
- ✅ Higher revenue potential

**Files Updated:** 2 files, ~20 lines changed

**Status:** Ready to test & deploy

---

**Next:** Test trên dev store → Deploy production
