import React from "react";
//import { getUser } from "../../utils/get-user";
import { Header } from "../../components/header";
//import { Battle } from "./components/battle";  // import the Battle component

export default function battle() {
    //const user = getUser();
    return (
        <div>
            <main>
                <h1>Battle</h1>
                <p>Challenge a friend to a BeatBox battle!</p>
            </main>
            <h2>
            <button type="button" className="btn">Challenge</button>
            </h2>
        </div>
        
    )
}