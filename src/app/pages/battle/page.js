import React from "react";
import { Header } from "../../components/header";
import Layout from "../../components/layout";
import LoginForm from "../../../components/auth/LoginForm";
//import { Battle } from "./components/battle";  // import the Battle component
import { auth } from "../../auth";

export default async function battle() {
    const session = await auth();

    return (
        <Layout>
      <Header />
        <div>
            <main>
                <h1>Battle</h1>
                <p>Challenge a friend to a BeatBox battle!</p>
            </main>
            <h2>
            {session
            ? <button type="button" className="btn">Challenge</button>
            : <LoginForm />}
            </h2>
        </div>
        </Layout>
    )
}