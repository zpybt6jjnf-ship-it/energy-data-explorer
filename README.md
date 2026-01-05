# Energy Data Explorer

Interactive visualization platform for U.S. electricity sector data, inspired by [Our World in Data](https://ourworldindata.org).

## Pilot Project: SAIDI vs VRE Penetration

Explores the relationship between power outage duration (SAIDI) and variable renewable energy penetration by state.

## Quick Start

```bash
# Install dependencies
npm install
pip install -r requirements.txt

# Generate sample data for development
python scripts/build_chart_data.py --sample

# Start development server
npm run dev
```

## Data Pipeline

To use real EIA data:

1. Get an API key from [EIA](https://www.eia.gov/opendata/register.php)
2. Create `.env` file with your key:
   ```
   EIA_API_KEY=your_key_here
   ```
3. Fetch and process data:
   ```bash
   npm run data:update
   ```

## Deployment

The project is configured for Netlify deployment. Push to GitHub and connect to Netlify.

Set these secrets in GitHub for automated data updates:
- `EIA_API_KEY` - Your EIA API key
- `NETLIFY_BUILD_HOOK` - Netlify build hook URL (optional)

## Data Sources

- **SAIDI/SAIFI**: [EIA Form 861](https://www.eia.gov/electricity/data/eia861/)
- **Generation Mix**: [EIA State Electricity Profiles](https://www.eia.gov/electricity/state/)
