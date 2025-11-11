import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import './App.css'
import PaystubForm from "./components/PaystubForm";
import BankStatementPage from "./components/BankStatementPage";
import SuccessPage from "./components/SuccessPage";
import Header, { HEADER_HEIGHT } from './components/Header';
import { Container, Flex, Box } from "@chakra-ui/react"

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Header />

      {/* Main wrapper: reserve header height and center content */}
      <Flex
        justify="center"
        align="center"                              // vertical centering
        width="100%"
        minH={`calc(100vh - ${HEADER_HEIGHT}px)`} // subtract header height
        pt="0"
        px="4"
      >
        <Container
          maxW="1200px"
          width="100%"
          px="4"
          // center inner content horizontally and vertically too:
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
        >
          <Router>
            <Routes>
              <Route path="/" element={<PaystubForm />} />
              <Route path="/success" element={<SuccessPage />} />
              <Route path="/bank-statements-generator" element={<BankStatementPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </Container>
      </Flex>
    </>
  )
}

export default App
