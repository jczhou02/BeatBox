"use client";

import React from "react";
import Layout from "./components/layout";
import { getUser } from "./utils/get-user";
import { Header } from "./components/header";
import { battle } from "./pages/battle/page";  
import { BrowserRouter, Route, Redirect } from "react-router-dom";


export default function Home() {
  const { user, isLoading } = getUser();

  // account for screen flicker
  // if (isLoading) {
  //   return null;
  // }

  return (
    <Layout>
      <Header user={user} />
      <h1>Welcome to BeatBox!</h1>
      <img src="/beatboxlogofinal.svg" alt="BeatBox" width={180} height={37} />
      <h2>Login to initiate a Battle!</h2>
      {user && (
        <Link href="/battle">
          <a className="btn">Challenge</a>
        </Link>
      )}
      <pre>{JSON.stringify(user, null, 2)}</pre>
      {user && <img src={user.imageUrl} />}
    </Layout>
  );
};

