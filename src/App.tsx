import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'

// Reliability pages
import ReliabilityVre from './pages/ReliabilityVre'
import ReliabilityTrends from './pages/ReliabilityTrends'
import ReliabilityChange from './pages/ReliabilityChange'
import ReliabilityMap from './pages/ReliabilityMap'
import ReliabilityVsRates from './pages/ReliabilityVsRates'
import ReliabilityOwnership from './pages/ReliabilityOwnership'
import RtoAnalysis from './pages/RtoAnalysis'

// Affordability pages
import AffordabilityVre from './pages/AffordabilityVre'
import AffordabilityTrends from './pages/AffordabilityTrends'
import AffordabilityVolatility from './pages/AffordabilityVolatility'

// Generation pages
import EnergyMix from './pages/EnergyMix'
import EnergyTransitions from './pages/EnergyTransitions'

// Markets pages
import WholesaleRetail from './pages/WholesaleRetail'
import WholesaleTrends from './pages/WholesaleTrends'

// Outages pages
import OutageCauses from './pages/OutageCauses'
import WeatherVulnerability from './pages/WeatherVulnerability'

// Legacy multi-chart pages (keep for backwards compatibility)
import Reliability from './pages/Reliability'
import Affordability from './pages/Affordability'
import WholesaleAnalysis from './pages/WholesaleAnalysis'
import OutageAnalysis from './pages/OutageAnalysis'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Reliability routes */}
        <Route path="/explore/reliability/vre" element={<ReliabilityVre />} />
        <Route path="/explore/reliability/trends" element={<ReliabilityTrends />} />
        <Route path="/explore/reliability/change" element={<ReliabilityChange />} />
        <Route path="/explore/reliability/map" element={<ReliabilityMap />} />
        <Route path="/explore/reliability/rates" element={<ReliabilityVsRates />} />
        <Route path="/explore/reliability/ownership" element={<ReliabilityOwnership />} />
        <Route path="/explore/reliability/rto" element={<RtoAnalysis />} />

        {/* Affordability routes */}
        <Route path="/explore/affordability/vre" element={<AffordabilityVre />} />
        <Route path="/explore/affordability/trends" element={<AffordabilityTrends />} />
        <Route path="/explore/affordability/volatility" element={<AffordabilityVolatility />} />

        {/* Generation routes */}
        <Route path="/explore/generation/mix" element={<EnergyMix />} />
        <Route path="/explore/generation/transitions" element={<EnergyTransitions />} />

        {/* Markets routes */}
        <Route path="/explore/markets/wholesale-retail" element={<WholesaleRetail />} />
        <Route path="/explore/markets/trends" element={<WholesaleTrends />} />

        {/* Outages routes */}
        <Route path="/explore/outages/causes" element={<OutageCauses />} />
        <Route path="/explore/outages/weather-map" element={<WeatherVulnerability />} />

        {/* Legacy routes for backwards compatibility */}
        <Route path="/explore/reliability" element={<Reliability />} />
        <Route path="/explore/affordability" element={<Affordability />} />
        <Route path="/explore/energy-mix" element={<EnergyMix />} />
        <Route path="/explore/reliability-rates" element={<ReliabilityVsRates />} />
        <Route path="/explore/reliability-map" element={<ReliabilityMap />} />
        <Route path="/explore/rto-analysis" element={<RtoAnalysis />} />
        <Route path="/explore/energy-transitions" element={<EnergyTransitions />} />
        <Route path="/explore/wholesale" element={<WholesaleAnalysis />} />
        <Route path="/explore/outage-analysis" element={<OutageAnalysis />} />
      </Routes>
    </Layout>
  )
}
