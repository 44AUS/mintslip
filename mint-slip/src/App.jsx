import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import './App.css'
import PaystubForm from "./components/PaystubForm";
import SuccessPage from "./components/SuccessPage";
import Header from './components/Header';
import { Container, Flex } from "@chakra-ui/react"

/**
 * App.jsx
 * ----------------------------------------
 * This file sets up your app routes:
 *  - "/"         → user form (enter info + pay)
 *  - "/success"  → post-payment page (auto-generates + emails paystubs)
 * 
 * Once Stripe completes checkout, it redirects back to:
 *    https://yourdomain.com/success
 * 
 * That triggers SuccessPage.jsx, which runs jsPDF + EmailJS.
 */

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <Header />
    
<Flex justify="center" width="100%">
        <Container
          maxW="1200px"
          width="100%"
          px="4"
        >
<Router>
        <Routes>
          {/* Main paystub generator form */}
          <Route path="/" element={<PaystubForm />} />

          {/* Payment success / PDF generator page */}
          <Route path="/success" element={<SuccessPage />} />

          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </Router>
    </Container>
    </Flex>

    </>
  )
}

export default App
