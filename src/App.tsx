import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Reliability from './pages/Reliability'
import Affordability from './pages/Affordability'
import EnergyMix from './pages/EnergyMix'
import ReliabilityVsRates from './pages/ReliabilityVsRates'
import ReliabilityMap from './pages/ReliabilityMap'
import RtoAnalysis from './pages/RtoAnalysis'
import EnergyTransitions from './pages/EnergyTransitions'
import WholesaleAnalysis from './pages/WholesaleAnalysis'
import OutageAnalysis from './pages/OutageAnalysis'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
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
