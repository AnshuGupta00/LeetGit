import Hero from './components/Hero.jsx'
import { Features, HowItWorks } from './components/Features.jsx'
import ClosingSection from './components/ClosingSection.jsx'
import './App.css'
import Navbar from './navbar.jsx'

function App() {
  return (
    <>
    <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <ClosingSection />
    </>
  )
}

export default App
