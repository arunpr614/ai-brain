# S-2: Current Ollama cost (shadow)

**Estimated effort:** 30 minutes
**Depends on:** S-1 (needs monthly token volume from `llm_usage`)
**Produces:** a single number — what Brain currently costs you today — to benchmark against all cloud options.

---

## 0. Why this spike

We keep saying "Ollama is free." It isn't. It uses:
- Your Mac's GPU time (opportunity cost: you could be using the Mac for something else)
- Electricity (M1 Pro runs at ~20W idle, ~80W under LLM load; 4× multiplier)
- Disk space (Ollama models, backups, WAL files)
- Wear on SSD (writes from the backup scheduler every 6 h)

Before we say "cloud costs $7/month, let's move," we need to know Brain's current true cost. If it's $30/month in electricity + ~$40/month in laptop wear, cloud at $7 is a no-brainer. If current cost is ~$2/month, even "$5 cloud" is a 2.5× increase worth scrutinizing.

## 1. Questions to answer

### 1.1 Electricity
- Average wattage draw during enrichment / Ask (measured via `powermetrics` or inferred)
- Total LLM-active hours per month (from S-1 wall-time × monthly call count)
- kWh/month attributable to Brain
- Your local electricity rate — **[ASK USER]** — default: assume ~$0.12/kWh (US residential) unless user provides a different number for their location

### 1.2 Hardware amortization
- M1 Pro MacBook Pro 14" current used-market price
- Expected remaining life (years)
- % of laptop time used by Brain (rough estimate from S-1 active-hour data)
- Amortized monthly "Brain's share" of laptop depreciation

### 1.3 Storage
- Disk used: `data/brain.sqlite` + `data/backups/` + Ollama models (`~/.ollama/models/`)
- % of SSD capacity
- Expected SSD lifetime writes; current writes attributable to Brain (WAL + backup scheduler)

### 1.4 Opportunity cost (soft)
- Hours per month you can't use the Mac for something else because it's mid-enrichment
- Hours per month the fan is audible (livability)

## 2. Sources to consult

1. **`llm_usage` table** (already covered in S-1)
2. **`powermetrics`** — macOS built-in tool for per-process wattage. Usage: `sudo powermetrics --samplers cpu_power,gpu_power -n 1 -i 1000`
3. **Apple's published M1 Pro power envelope** — typically 10–12 W idle, 30–80 W under load
4. **Ollama model disk footprint** — `du -sh ~/.ollama/models/`
5. **SSD endurance ratings** — generic: Apple MacBook Pro SSDs rated for ~1800 TBW (terabytes written) over lifetime. Writes from WAL + 6h backup = a known rate from the `backup` scheduler.
6. **US / India / EU average electricity rates** — verify assumptions with current sources

## 3. Output format

Append to `docs/research/brain-usage-baseline.md` under a new section:

```markdown
## Shadow cost (current, local)

| Component | Rate | Monthly |
|---|---|---|
| Electricity (LLM active) | X W × Y hours × $0.12/kWh | $A.AA |
| Electricity (idle overhead) | Mac always-on hours at Z W | $B.BB |
| SSD write wear (Brain share) | X GB/month × $C per TB written | $D.DD |
| Hardware amortization (Brain share) | $MacCost / life years × N% | $E.EE |
| **Total shadow cost** | — | **$F.FF / month** |

Notes:
- Electricity rate used: $0.12/kWh (verify for user's locale)
- Hardware amortization assumes laptop is kept X more years
- Opportunity cost (fan noise, concurrent-task slowdown) not monetized
```

## 4. Success criteria

- [ ] A dollar figure for current monthly Brain cost
- [ ] That figure has an explicit method — not "feels right"
- [ ] At least 3 of the 4 components (electricity, amortization, SSD, opportunity) are quantified
- [ ] Sensitivity noted — if your electricity is $0.24/kWh (Europe) or $0.08/kWh (hydro states), what's the new total?

## 5. Open questions for the user

1. **Your electricity rate?** If in US, it's geo-dependent ($0.10–0.35/kWh). If in India, ~₹8/kWh (~$0.10/kWh). If EU, higher (€0.25–0.40/kWh).
2. **Do you consider the MacBook "Brain's" or "general purpose that runs Brain"?** (Amortization share swings the total by 10–20%.)

## 6. Execution note

This spike is forgivingly imprecise. We're not writing a research paper — we just want an order-of-magnitude baseline. "$2–5/month" is a valid answer; "$0.00" is a wrong answer; "$17.44/month" is suspicious false precision.
