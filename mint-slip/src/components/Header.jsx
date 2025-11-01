import React from "react";
import { Box, Heading, Flex, Text, Button, Image } from '@chakra-ui/react'
import logo from '../../public/logo.png';

const MenuItems = ({ children }) => (
  <Text mt={{ base: 4, md: 0 }} mr={6} display="block">
    {children}
  </Text>
);

const Header = props => {
  const [show, setShow] = React.useState(false);
  const handleToggle = () => setShow(!show);

  return (
    <Flex
      as="nav"
      align="center"
      justify="space-between"
      wrap="wrap"
      padding="1.5rem"
      bg="purple.950"
      color="white"
      {...props}
    >
      <Flex align="center" mr={5}>
        <Image src={logo} width='3rem'/>
        <Heading as="h2" size="xl" fontSize={"1.5rem"}>
          MintSlip
        </Heading>
      </Flex>

      <Box display={{ sm: "block", md: "none" }} onClick={handleToggle}>
        <svg
          fill="white"
          width="12px"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>Menu</title>
          <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
        </svg>
      </Box>

      <Box
        display={{ sm: show ? "block" : "none", md: "flex" }}
        width={{ sm: "full", md: "auto" }}
        alignItems="center"
        flexGrow={1}
      >
        <MenuItems>Buy Bank Statements</MenuItems>
        {/* <MenuItems>Examples</MenuItems>
        <MenuItems>Blog</MenuItems> */}
      </Box>

      <Box
        display={{ sm: show ? "block" : "none", md: "block" }}
        mt={{ base: 4, md: 0 }}
      >
  <Text mt={{ base: 4, md: 0 }} mr={6} display="block">
    FAQ
  </Text>
      </Box>
    </Flex>
  );
};

export default Header;
