import React from "react";
import Spinner from "react-bootstrap/Spinner";
import styled from "styled-components";

import Layout from "../components/Layout"

const CheckingSignedInWrapper = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.1);
`;

export default function CheckingSignedIn() {
  return (
    <Layout>
      <CheckingSignedInWrapper>
        <Spinner animation="border" role="status" />
      </CheckingSignedInWrapper>
    </Layout>
  );
}
