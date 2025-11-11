import React, { useState, useEffect } from "react";
import { Box, Heading, Flex, Text, Button, Image, Link } from "@chakra-ui/react";
import logo from "../../public/logo.png";

const MenuItems = ({ children, href }) => (
  <Link
    href={href}
    fontWeight="500"
    color="gray.800"
    _hover={{ color: "purple.600" }}
    mx={3}
    fontSize="sm"
  >
    {children}
  </Link>
);

// IMPORTANT: export the header height constant so App can use it
export const HEADER_HEIGHT = 72; // px — adjust if you change header sizing

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <Flex
      position="fixed"
      top="1rem"
      left="50%"
      transform="translateX(-50%)"
      width="90%"
      maxW="1300px"
      align="center"
      justify="space-between"
      px="1.5rem"
      py="0.75rem"
      borderRadius="full"
      zIndex="999"
      backdropFilter="blur(10px)"
      bg={scrolled ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.6)"}
      boxShadow={scrolled ? "0 4px 20px rgba(0,0,0,0.05)" : "none"}
      transition="all 0.25s ease"
      border="1px solid rgba(255,255,255,0.3)"
    >
      {/* Logo + Brand */}
      <Flex align="center" gap={2}>
        <Image src={logo} width="28px" />
        <Heading
          as="h2"
          size="md"
          fontWeight="700"
          color="black"
          fontSize="1.1rem"
        >
          MintSlip
        </Heading>
      </Flex>

      {/* Navigation Links */}
      <Flex align="center" gap={5}>
        <MenuItems href="/paystub-generator">Paystubs</MenuItems>
        <MenuItems href="/bank-statements-generator">Bank Statements</MenuItems>
        <MenuItems href="/w2-form-generator">W2 Forms</MenuItems>
        <MenuItems href="/faq">FAQ</MenuItems>
      </Flex>

      {/* Buttons */}
      <Flex align="center" gap={3}>
        <Button
          size="md"
          bg="purple.600"
          color="white"
          borderRadius="full"
          _hover={{ bg: "purple.700" }}
        >
          FAQ
        </Button>
      </Flex>
    </Flex>
  );
}
