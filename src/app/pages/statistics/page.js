import React from "react";
import { Header } from "../../components/header";
import Layout from "../../components/layout";
import { auth } from "../../auth";


export default function statistics() {
    return (
        <Layout>
      <Header />
        <div>
            <main>
                <h1>My Stats</h1>
                <p>View your BeatBox battle tendencies... in other words, your favorite songs/artists/genres to use in battle! hehe</p>
            </main>
        </div>
        <div>
            <h2>
            {session
            ? 'something'
            : <LoginForm />}
            </h2>
        </div>
        </Layout>
    )
}