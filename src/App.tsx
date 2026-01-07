import { Routes, Route, Navigate } from 'react-router-dom'
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

        {/* Legacy redirects */}
        <Route path="/explore/reliability" element={<Navigate to="/explore/reliability/vre" replace />} />
        <Route path="/explore/affordability" element={<Navigate to="/explore/affordability/vre" replace />} />
        <Route path="/explore/energy-mix" element={<Navigate to="/explore/generation/mix" replace />} />
        <Route path="/explore/reliability-rates" element={<Navigate to="/explore/reliability/rates" replace />} />
        <Route path="/explore/reliability-map" element={<Navigate to="/explore/reliability/map" replace />} />
        <Route path="/explore/rto-analysis" element={<Navigate to="/explore/reliability/rto" replace />} />
        <Route path="/explore/energy-transitions" element={<Navigate to="/explore/generation/transitions" replace />} />
        <Route path="/explore/wholesale" element={<Navigate to="/explore/markets/wholesale-retail" replace />} />
        <Route path="/explore/outage-analysis" element={<Navigate to="/explore/outages/causes" replace />} />
      </Routes>
    </Layout>
  )
}
