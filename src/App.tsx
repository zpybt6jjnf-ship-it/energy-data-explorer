import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import SaidiVre from './pages/SaidiVre'
import Affordability from './pages/Affordability'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore/saidi-vre" element={<SaidiVre />} />
        <Route path="/explore/affordability" element={<Affordability />} />
      </Routes>
    </Layout>
  )
}
