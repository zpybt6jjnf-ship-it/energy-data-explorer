import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Reliability from './pages/Reliability'
import Affordability from './pages/Affordability'
import EnergyMix from './pages/EnergyMix'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore/saidi-vre" element={<Reliability />} />
        <Route path="/explore/affordability" element={<Affordability />} />
        <Route path="/explore/energy-mix" element={<EnergyMix />} />
      </Routes>
    </Layout>
  )
}
