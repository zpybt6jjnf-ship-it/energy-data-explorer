# Energy Data Explorer - Expansion Workplan

*Generated: January 2026*

---

## Current State Summary

The existing project has solid foundations:
- React/TypeScript + Vite + Plotly.js stack
- Dynamic URLs via `useUrlFilters` hook (year range, states, colorBy, trendline)
- Working EIA data pipeline (generation data)
- One visualization: SAIDI vs VRE scatter plot
- Basic filtering (states, years, color coding)
- Statistical analysis (regression, confidence intervals)

---

## I. Key Questions & Decisions Needed

### A. Mission-Critical Features (Top 3 Priorities)

| Feature | Current State | Gap | Question |
|---------|---------------|-----|----------|
| **Dynamic URLs** | Partial - filters persist in URL | Need to extend to all future visualizations | How granular should URL state be? (e.g., zoom level, hover state?) |
| **Instant Rendering** | Plotly may lag with large datasets | May need data optimization or virtualization | What's the acceptable latency target? <100ms? |
| **Toggle Functionality** | Basic - states/years/colorBy | Need much richer toggling (resources, sectors, metrics) | Should toggles be global (affect all charts) or per-chart? |

### B. State Aggregation Feature (Novel Concept)

This is genuinely innovative—no existing tool does this. Key design questions:

1. **Grouping Interface**: How should users define custom groups?
   - Predefined templates (RTO vs non-RTO, dem/rep governance, etc.)?
   - Free-form multi-select with "Save as Group" functionality?
   - Both?

2. **Aggregation Method**: Confirm weighting approach:
   - For rates: Sales-weighted average
   - For SAIDI/SAIFI: Customer-weighted average?
   - For emissions intensity: Generation-weighted?

3. **Background Lines Feature**: The "dulled individual states behind group" concept—should this be:
   - Always available as a toggle?
   - Only for groups above N states?

### C. Visualization Type Questions

| Question | Options | Implication |
|----------|---------|-------------|
| Which chart types to support? | Scatter, Line, Bar, Map, Table | Each requires different component architecture |
| Should all charts share the same filter sidebar? | Yes (global) / No (per-chart) | Affects state management complexity |
| Map visualization: Choropleth vs point markers? | Choropleth (like OWID) | Requires GeoJSON state boundaries |

### D. Data Pipeline Questions

1. **SAIDI/SAIFI Source**: Currently using estimates. Real Form 861 data requires manual download—acceptable workflow?

2. **New Data Sources Needed** (from plot ideas):
   - Retail rates/bills (Form 861)
   - Emissions intensity (eGRID or EIA-923)
   - Load/consumption data (Form 861)
   - Capacity factors (Form 923)
   - Storage deployment (Form 860)
   - Historical AEO projections (manual compilation)
   - Transmission spend (FERC data—outside EIA)

3. **Update Frequency**: Daily/weekly/monthly/annual? Most EIA data is annual.

---

## II. Feature Prioritization Matrix

### Tier 1: Mission Critical (Phase 1 Completion)
- [ ] Complete URL state persistence for all interactions
- [ ] Performance optimization for instant rendering
- [ ] Rich toggle system (states, years, metrics, sectors)
- [ ] Hover tooltips with precise x/y readout

### Tier 2: High Value (Phase 2 Core)
- [ ] State aggregation with custom groupings
- [ ] Multiple visualization types (line charts, maps, tables)
- [ ] Additional reliability plots (SAIDI/SAIFI over time)
- [ ] Affordability plots (rates vs VRE, rates over time)
- [ ] Download data functionality
- [ ] Source links on each visualization

### Tier 3: Enhanced Experience (Phase 2 Extended)
- [ ] Load growth visualizations
- [ ] Resource mix over time
- [ ] Utility-level drill-down
- [ ] Parent company aggregation for IOUs
- [ ] Projection vs performance (AEO retrospectives)

### Tier 4: Future Exploration (Phase 3+)
- [ ] Explainer articles (noted out of scope for Phase 1)
- [ ] RTO-level data (may require FERC data)
- [ ] Transmission spend analysis (FERC data)
- [ ] County-level rate maps (inspired by NREL)

---

## III. Phased Project Plan

### Phase 1 Completion: Polish the Pilot

**Goal**: Make the SAIDI vs VRE chart production-ready with OWID-quality UX

| Task | Description |
|------|-------------|
| URL completeness | Ensure every chart interaction updates URL (zoom, pan reset to defaults) |
| Performance audit | Profile Plotly rendering; consider WebGL mode for large N |
| Enhanced tooltips | Match OWID-style mouseover with formatted values |
| Data sources panel | Add collapsible section with EIA links + download button |
| Mobile responsiveness | Test/fix touch interactions and responsive layout |
| Real SAIDI data | Integrate actual Form 861 reliability data |

### Phase 2A: Visualization Framework

**Goal**: Build reusable infrastructure for multiple chart types

| Task | Description |
|------|-------------|
| Chart type abstraction | Create base component supporting scatter/line/bar/map |
| Global filter system | Unified state management for cross-chart filtering |
| State aggregation engine | Weighted averaging with custom group definitions |
| Preset groups | RTO membership, market structure, political, climate regions |
| Toggle UI components | Reusable multi-select with search, checkboxes, clear-all |

### Phase 2B: Expand Data & Charts

**Goal**: Add plots from the brainstorm list

**Reliability Suite:**
- SAIDI/SAIFI vs VRE (enhance existing)
- Δ SAIDI vs Δ VRE (user-defined year comparison)
- SAIDI over time by state (line chart)
- SAIDI vs retail rates

**Affordability Suite:**
- Retail rates vs VRE penetration
- Δ Rates vs Δ VRE
- Rates over time by state/sector
- Rates vs emissions intensity
- Gas exposure vs rate volatility

**Resource Mix Suite:**
- Generation mix over time (stacked area or line)
- Renewable penetration vs emissions intensity
- Storage deployment trends

### Phase 2C: Advanced Features

| Task | Description |
|------|-------------|
| Table view | Sortable data table alternative to charts |
| Map view | Choropleth map with state-level data |
| Background lines | Toggle to show individual states behind aggregated groups |
| Utility drill-down | Optional utility-level data where available |

### Phase 3: Stretch Goals

- AEO projection vs actuals (Auke Hoekstra-style)
- RTO-level analysis (requires FERC data integration)
- County-level rate maps
- Explainer articles integration

---

## IV. Technical Architecture Recommendations

```
src/
├── components/
│   ├── charts/
│   │   ├── BaseChart.tsx          # Shared Plotly config
│   │   ├── ScatterChart.tsx       # SAIDI vs VRE type
│   │   ├── LineChart.tsx          # Time series
│   │   ├── BarChart.tsx           # Comparisons
│   │   └── MapChart.tsx           # Choropleth
│   ├── filters/
│   │   ├── FilterSidebar.tsx      # Main filter container
│   │   ├── StateSelector.tsx      # Multi-select with groups
│   │   ├── YearRange.tsx          # Slider or dual input
│   │   ├── MetricSelector.tsx     # Toggle between metrics
│   │   └── GroupManager.tsx       # Create/save custom groups
│   └── common/
│       ├── DataDownload.tsx       # CSV/JSON export
│       └── SourceLinks.tsx        # Attribution panel
├── hooks/
│   ├── useUrlState.ts             # Enhanced URL sync
│   ├── useChartData.ts            # Data fetching + caching
│   └── useAggregation.ts          # Weighted averaging logic
├── utils/
│   ├── aggregation.ts             # Sales/customer weighting
│   └── stateGroups.ts             # Preset group definitions
└── data/
    └── groups/                    # RTO, market structure JSONs
```

---

## V. Outstanding Questions

### Strategic Questions

1. **Phase 1 scope**: Is the pilot (SAIDI vs VRE) considered complete enough, or should it be polished further before expanding?

2. **State aggregation priority**: Should this innovative feature be Phase 2A (build infrastructure first) or can it wait until 2C?

3. **Data acquisition**: Who handles Form 861 downloads and new data source integration? Is there a data pipeline owner?

4. **Hannah Ritchie connection**: At what point would her input be most valuable—architecture review, or later for UX polish?

### Technical Questions

5. **Performance baseline**: What devices/browsers must be supported? Mobile-first or desktop-primary?

6. **Utility-level data**: Is WattArchive-style utility drill-down worth pursuing given their apparent issues, or lower priority?

7. **Map visualization**: Priority relative to line/bar charts? Maps add complexity (GeoJSON, different interaction model).

8. **Preset state groups**: Should initial groupings (RTO states, restructured markets, etc.) be drafted, or are there authoritative lists available?

---

## VI. Competitive Positioning

| Existing Tool | Strength | Gap This Project Fills |
|---------------|----------|------------------------|
| OWID | Gold-standard UX | No US state resolution |
| EIA Browsers | Official data | Poor UX, limited cross-dataset analysis |
| Ember | Clean state-level | No dynamic URLs, limited metrics |
| RMI Hub | Utility detail | Clunky interface |
| WattArchive | Utility SAIDI | Appears broken |

**Differentiation**: State-level cross-dataset analysis (SAIDI vs VRE, rates vs renewables) with OWID-quality interactivity AND custom state aggregation—none of these exist together anywhere.

---

## VII. Reference: Full Plot Ideas List

### Reliability
- SAIDI/SAIFI vs. VRE/total renewables penetration by state
- Change in SAIDI/SAIFI vs. change in VRE/renewables penetration by state between any 2 user-defined years
- SAIDI/SAIFI over time toggleable by state
- SAIDI/SAIFI over time toggleable by individual utility and utility type (muni, co-op, IOU)
- SAIDI/SAIFI vs retail rates/bills by state, year

### Affordability
- Retail rates/bills vs. VRE/total renewables penetration by state
- Change in retail rates/bills vs. change in VRE/renewables penetration by state between any 2 user-defined years
- Retail rates over time toggleable by state
- Retail rates over time toggleable by individual utility and utility type
- Retail rates vs emissions intensity by state, year
- Gas/renewable exposure vs retail rate volatility by state

### Load Growth
- Electrical production (TWh) vs. time by state
- Electrical consumption (TWh) vs. time by state, sector
- Load growth vs. reliability (SAIDI/SAIFI) by state
- Load growth vs. affordability (retail rates/bills) by state

### Resource Mix and Production
- Energy and electricity mix over time by state
- Electricity mix over time by RTOs (may require FERC data)
- Renewable penetration vs power sector emissions intensity by state, year
- Grid-scale storage deployment (capacity and energy) over time, by state
- Crude oil, gas, coal production by state, year
- Biofuels production by state, year, fuel type
- Net metering sales vs time by state, sector, utility
- Average capacity factor of gas, coal, wind, solar, hydro over time
- Wind turbine hub height over time (capacity-weighted)
- Trends in battery size over time
- Share of solar capacity from silicon vs. thin film vs. other
- Capacity-weighted share of gas turbine market by manufacturer
- Heat rate/efficiency of gas, coal fleets over time

### Projection vs. Performance (AEO Retrospectives)
- GDP ($, %)
- Cost of imported crude ($, %)
- Petroleum/liquids consumption (bbl, %)
- Crude production (bbl, %)
- Oil imports (bbl, %)
- Electric sector prices for gas, coal ($/mmbtu, %)
- Gas consumption (tcf, %)
- Natural gas imports/exports (tcf, %)
- Coal consumption, production (tons, %)
- Electricity prices (c/kWh, %)
- Total electric sales (TWh, %)
- Generation by source: solar, wind, hydro, coal, gas, nuclear (TWh, %)
- Energy consumption by sector: resi, commercial, industrial, transportation, total (quads, %)
- Energy-related CO2 emissions (MMT, %)
- Energy intensity (quads/$B)

### Other
- Transmission spend vs. renewable penetration by RTO (may require FERC data)
- Categorized transmission spend by state

---

## VIII. External Resources & Inspiration

- **Our World in Data**: https://ourworldindata.org/energy (gold standard)
- **EIA Electricity Data Browser**: https://www.eia.gov/electricity/data/browser/
- **EIA Total Energy Browser**: https://www.eia.gov/totalenergy/data/browser/
- **Ember US Electricity Explorer**: https://ember-energy.org/data/us-electricity-data-explorer/
- **RMI Utility Transition Hub**: https://utilitytransitionhub.rmi.org/emissions/
- **NREL Electricity Rate Map**: County-level rate visualization inspiration
- **Duke Nicholas Institute**: https://nicholasinstitute.duke.edu/project/energy-data-resources


---

## Appendix: Original Background Notes

*The following are the original planning notes provided as input for this workplan.*

---

### A. General Notes on Features

I know I'm a broken record on this, but I think the best way to make the plots we make hum is to replicate key features used by Our World in Data. Setting aside obvious things like generally appealing visuals, proper font sizes, etc., in rough descending order of importance, the OWID features that I see as being of highest value are:

- **Dynamically updating URLs** that preserve the exact state of whatever plot you are looking at. E.g., here is the default line plot you get for OWID's data explorer on energy by country. But if I change the settings so that it's not showing total primary energy consumption per capita for the 7 jurisdictions it uses as a default from 1965-present, but rather is showing total annual wind generation for Estonia and Belgium from 2005-2016, and then I simply copy the web address, it preserves that exact plot perfectly for anyone I want to share it with—true for all possible such configurations, of which for this plot alone there are hundreds of orders of magnitude more than there are particles in the observable universe.

- **Everything renders virtually instantaneously.** No lag when toggling, etc.

- **Heavy use of toggling** to enable many configurations on plots—used especially for rendering similar plots with different countries (states, for the data we'll be working with) and resources. There will probably also be electric sector use cases for us for commercial/resi/industrial/average rates.

- **Good dynamic mouseovers** that read off the x- and y-axis values to you anywhere on the plot.

- **Complementary visualizations**—e.g., where you can choose between a table view, a global map, a line plot, and a bar chart—all customizable/toggleable in different ways.

- **Readily available source materials** linked on the page, including the original data source, and an option to download the dataset.

- **The occasional explainer** on arcane topics that are necessary to understand in order to digest the information appropriately (this one is particularly good; we could honestly just link to it where issues of primary/final energy come up in the EIA data).

Note, I'm not saying all of these are necessary (we've already decided explainers are out of scope for phase 1)—or that there aren't even better ways to achieve some of them—on anything we produce. But I think the first three: **customizable links, instant rendering, and strong toggling functionality**—should be viewed as mission critical.

Also note: I know Hannah Ritchie from OWID, and if a connection to her is helpful at any point, I am happy to make it.

Finally, one other feature that seems natural to include in a lot of US state-based plots, but is not employed by OWID, would be **arbitrary aggregation of states**. E.g., if a user wants to compare the electricity rate trends in (1) RTO states with utility ownership of generation, (2) RTO states without utility ownership of generation, and (3) vertically integrated states, she should be able to custom-select the three corresponding groupings of states and have their data show up on the plot just as one state normally would. This sort of general feature would allow for rapid-fire probing of all sorts of hypotheses that all manner of groupings of states in a way that no current, publicly available software provides (ones with state NEPA policies vs. ones without; ones with net metering vs. ones without; ones with prolonged Democratic vs. Republican governance; the possibilities are endless). As a bonus, the software could afford the user an option to toggle on/off a setting for each grouping that would cause all of the included states to show up as dulled/grayed out lines on the plot behind it, so that within each grouping the presence of outliers or states that primarily drive the trend could be detected. Finally (and perhaps obviously), averaging should generally be done on the basis of energy sales, not of the states themselves (i.e., grouping of Delaware and Texas should probably end up looking a lot like Texas for any quantity of interest, regardless of how much Delaware diverges, given how much larger Texas is).

---

### B. What Else Is Out There

In tracking what we're building towards, I think it's good to have a running list of what other free resources (i.e., not counting stuff like Cleanview) are out there that provide similar (or even adjacent) functionality—either for the purpose of our taking inspiration from them, or not duplicating things that are already out there and meet the high standards we are aiming for. Here's what I am aware of so far—I am sure there are numerous resources I have forgotten or never come across, however. Also note that the most relevant ones are at the top. The ones towards the bottom of the list get pretty tangential but are mostly nice to be aware of.

- **Our World in Data**: https://ourworldindata.org/energy — they are the gold standard on plotting data imo but are not US focused—no state, RTO, or utility resolution. Very rarely, they will do a plot homing in on the US specifically (e.g., on the alignment/divergence of Hubbert's peak and US oil production), but as their name suggests, they don't view it as their role to focus on any one country.

- **EIA electricity data browser**: https://www.eia.gov/electricity/data/browser/ — this is the best tool I'm aware of that the EIA has created for the electric sector. It presents as impressive and quite functional, and the display and mouseover is nice… but try to get it to display any specific cross-section of the data that you know it should have, and you'll find its range is quite limited (and functionality to me is much less intuitive than OWID). I don't know if this is the actual story, but it has the feel of something that was DOGE'd out of existence midway through being born.

- **EIA total energy browser**: https://www.eia.gov/totalenergy/data/browser/ — Gives a nice display of energy mix data, including annual/monthly, and different breakdowns within the sector. Also, good dynamically updating URLs and mouseover functionality. But no ability to break out by state, data selection is somewhat unintuitive.

- **Other EIA data browsers**: https://www.eia.gov/tools/ — EIA has a bunch more stuff here, but a lot of it is just real time monitoring stuff and I don't find most of it to have much overlap with our project.

- **WattArchive**: https://www.wattarchive.org/ — good utility by utility price and SAIDI display functionality if you can get it to work… (I can't, though in the past I recall it being better).

- **Hannah Ritchie data exporters** for state electricity prices and grid mixes. Hannah kindly made these at my request in 2022 and updated them in 2024. They do a good job showing some of the EIA data we would want to present, though they don't have the full suite of amazing features that Hannah and her colleagues use for OWID plots.

- **Ember US electricity data explorer**: https://ember-energy.org/data/us-electricity-data-explorer/ — Good individual displays of electric sector mixes, CO2 emissions, and carbon intensity by state with ability to show multiple states. Good mouseover, no dynamic URLs, no other functionality or data of interest displayed.

- **RMI Utility transition hub**: https://utilitytransitionhub.rmi.org/emissions/ — information dense utility-by-utility displays focused largely on emissions. Interface is clunky.

- **GridStatus EIA Data Browser**: https://www.gridstatus.io/eia — Very focused on real-time. Not much overlap.

- **Interconnection.fyi** — Great real-time view of the interconnection queues. Not much overlap with our project, but thematically adjacent.

- **NREL electricity rate map** — this is just a static map, but I love the county-by-county display for rates. Gives a much more interesting picture than the state-by-state view, and good inspiration. Could imagine similar visuals by utility territory.

- **ONRR Natural Resources Revenue data**: https://revenuedata.doi.gov/explore — again, not what we're quite after, but interesting and adjacent federal data re federal resource production.

- **USGS wind and solar installation viewers** — also afield from what we're doing, but adjacent.

- **Duke Nicholas Institute Energy Data Resources tracker**: https://nicholasinstitute.duke.edu/project/energy-data-resources — Duke seems to have curated a list of all manner of datasets on energy. Most don't have visualizations, and some links are broken, but a good repository to leaf through.

---

### C. Plot Ideas

Below are a broad set of ideas for information we could plot—mostly under a potential phase 2 of this project, though starting with a few of the reliability ones under the phase 1 pilot. Some plots are simple (or not so simple) visualizations of individual datasets that EIA has. Others plot a variable from one dataset against a variable from another (e.g., the impetus for all of this: SAIDI vs. renewable penetration by state, which nowhere exists in one dataset). Both types of plot can be high value, though my intuition is that the space to be creative in the latter category is greater, and might afford insights and narratives that few are focused on today.

Also, the list below is fairly expansive. Even under a scenario where we move forward with phase 2, it's not meant as conveying that we should necessarily plot all of these, or that there aren't other/better things to plot that I did not think of here. Rather, this is just meant to reflect my initial brainstorming based on poking around in the EIA data for things I would find interesting to have displayed, or think others might. Ultimately, this should really function as a living list of ideas, which at some point we would presumably want to crowd-source as well.

#### Reliability
- SAIDI/SAIFI vs. VRE/total renewables penetration by state
- Change in SAIDI/SAIFI vs. change in VRE/renewables penetration by state between any 2 user-defined years (basically Zeke's plot with user-defined years)
- SAIDI/SAIFI over time toggleable by state (see Slide 7 here but imagine SAIDI or SAIFI on the y-axis)
- SAIDI/SAIFI over time toggleable by individual utility and utility type (muni, co-op, IOU) — note, on specific utilities, this starts to look like WattArchive. Except WattArchive seems not to work anymore from any browser on my computer or phone — not sure if this is a me problem or an it problem. To the degree WattArchive is still functional and up-to-date, this sort of plot could be viewed as a lower priority.
- SAIDI/SAIFI vs retail rates/bills by state, year (or averaged over user-defined period)

#### Affordability
- Retail rates/bills vs. VRE/total renewables penetration by state (another Zeke plot)
- Change in retail rates/bills vs. change in VRE/renewables penetration by state between any 2 user-defined years (yet another Zeke plot where we want to make the years user-defined)
- Retail rates over time toggleable by state (basically Slide 7 here)
- Retail rates over time toggleable by individual utility and utility type — but see comment above for corresponding reliability plot re WattArchive.
- Retail rates vs emissions intensity by state, year
- Gas/renewable exposure (share of grid mix over user-defined period) vs retail rate volatility (standard deviation of monthly rates over same period) by state

#### Load Growth
- Electrical production (TWh) vs. time by state
- Electrical consumption (TWh) vs. time by state, sector
- Load growth (avg. % over 5/10 year period) vs. reliability (SAIDI/SAIFI) by state
- Load growth (avg. % over 5/10 year period) vs. affordability (retail rates/bills) by state

#### Resource Mix and Production
- Energy and electricity mix over time by state (basically, exactly this line-plot but with states instead of countries, showing both absolute levels of production/consumption and relative share)
- Electricity mix over time by RTOs, if this is available (might require FERC data?)
- Renewable penetration vs power sector emissions intensity by state, year (this might be the sort of plot where you want to trace out states' trajectories over time in the 2D space being plotted)
- Grid-scale storage deployment (capacity and energy) over time, by state
- Crude oil, gas, coal production by state, year
- Biofuels production by state, year, fuel type
- Net metering sales – energy sold back (and other measures) vs time by state, sector, utility
- Average capacity factor of gas, coal, wind, solar, hydro over time — allow probing of questions like to what degree are we seeing a shift of gas plant usage to more capacity services; to what degree has tracking technology increased solar utilization; etc.
- Wind turbine hub height over time on a capacity-weighted basis (would require some massaging of data from Form 860 Subparts D-F)
- Trends in battery size over time (same data source as above)
- Share of solar capacity from silicon vs. thin film vs. other (same data source)
- Capacity-weighted share of gas turbine market by manufacturer (same data source)
- Heat rate/efficiency of gas, coal fleets over time (from Form 923)

#### Projection vs. Performance
(i.e., the Auke Hoekstra plot, but for everything the EIA forecasts; EIA already provides all the relevant data in tables in its AEO retrospectives, e.g., pp. 6-70 here)

- GDP ($, %) — this is not an obvious one to plot, but I think helpful to understand if the EIA has a systematic bias in GDP projections that drive other systematic effects
- Cost of imported crude ($, %) — on anything with $ units, will have to think about how to handle inflation (i.e., because we are looking at forward-projections for multiple years, there is a question of whether to leave projections in the $-year published or inflation adjust older $-years to present-day, and if so whether to adjust based on EIA's projections of inflation or real-world inflation that occurred)
- Petroleum/liquids consumption (bbl, %)
- Crude production (bbl, %)
- Oil imports (bbl, %) — some of the percentages here get hilariously large/negative; may have to think about contextualizing and/or plot logarithmically
- Electric sector prices for gas, coal ($/mmbtu, %)
- Gas consumption (tcf, %)
- Natural gas imports/exports (tcf, %)
- Coal consumption, production (tons, %)
- Electricity prices (c/kWh, %)
- Total electric sales (TWh, %)
- Gen by source: solar, wind, conventional hydro, coal, gas, nuc (TWh, %)
- Energy (note, not electricity) consumption by sector: resi, commercial, industrial, transportation, total (quads, %)
- Energy-related CO2 emissions (MMT, %)
- Energy intensity (quads/$B)

#### Other
- Transmission spend vs. renewable penetration by RTO with user-defined year or temporal trend (basically this plot with flexible year(s)) — may require FERC or other government data for transmission spend numbers
- Categorized transmission spend by state (local, regional-reliability, regional-economic, regional-public policy, interregional) — would very likely require non-EIA data, though Form 411 seems to have some relevant info for proposed high-voltage additions—if only the dataset was discontinued almost a decade ago.

**Note:** It would be extra neat on any plots that are broken out by utility to have the option of selecting utilities by parent company for IOUs. I.e., this would enable one to draw conclusions about (for example) AEP, rather than having to view 7 subsidiaries at once.
