//import React from "react";
//import Script from 'next/script';
import Layout from "./components/layout";
import { Header } from "./components/header";
import LoginForm from "../components/auth/LoginForm";
//import { auth } from "../auth";

export default async function Home() {
  
  return (
    <Layout>
      <Header />
     
      <div className="flex justify-center items-center h-full w-full bg-dark-slate-gray">
        <div className="text-center">
          <img src="/beatboxlogofinal.svg" alt="BeatBox" width={200} height={37} />
          
          <LoginForm />
          
          <pre>{/* Display user information here after login */}</pre>
        </div>
      </div>
    </Layout>
  );
}
