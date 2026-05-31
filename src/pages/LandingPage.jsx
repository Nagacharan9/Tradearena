import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import HeroSection from '../components/landing/HeroSection'
import TournamentsSection from '../components/landing/TournamentsSection'
import WinnersSection from '../components/landing/WinnersSection'
import HowItWorksSection from '../components/landing/HowItWorksSection'
import FeaturesTestimonialsSection from '../components/landing/FeaturesTestimonialsSection'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <HeroSection />
      <TournamentsSection />
      <WinnersSection />
      <HowItWorksSection />
      <FeaturesTestimonialsSection />
      <Footer />
    </div>
  )
}
