import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'

// Lazy load all pages for code splitting
const Home = lazy(() => import('./pages/Home'))

// Reliability pages
const ReliabilityVre = lazy(() => import('./pages/ReliabilityVre'))
const ReliabilityTrends = lazy(() => import('./pages/ReliabilityTrends'))
const ReliabilityChange = lazy(() => import('./pages/ReliabilityChange'))
const ReliabilityMap = lazy(() => import('./pages/ReliabilityMap'))
const ReliabilityVsRates = lazy(() => import('./pages/ReliabilityVsRates'))
const ReliabilityOwnership = lazy(() => import('./pages/ReliabilityOwnership'))
const RtoAnalysis = lazy(() => import('./pages/RtoAnalysis'))

// Affordability pages
const AffordabilityVre = lazy(() => import('./pages/AffordabilityVre'))
const AffordabilityTrends = lazy(() => import('./pages/AffordabilityTrends'))
const AffordabilityVolatility = lazy(() => import('./pages/AffordabilityVolatility'))

// Generation pages
const EnergyMix = lazy(() => import('./pages/EnergyMix'))
const EnergyTransitions = lazy(() => import('./pages/EnergyTransitions'))

// Markets pages
const WholesaleRetail = lazy(() => import('./pages/WholesaleRetail'))
const WholesaleTrends = lazy(() => import('./pages/WholesaleTrends'))

// Outages pages
const OutageCauses = lazy(() => import('./pages/OutageCauses'))
const WeatherVulnerability = lazy(() => import('./pages/WeatherVulnerability'))

export default function App() {
  return (
    <ThemeProvider>
      <Layout>
        <Suspense fallback={<div className="loading"><span className="loading-text">Loading...</span></div>}>
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
        </Suspense>
      </Layout>
    </ThemeProvider>
  )
}
