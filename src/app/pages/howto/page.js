'use client';

import React from "react";
import { getUser } from "../../utils/get-user";
import { Header } from "../../components/header";

export default function howto() {
    const user = getUser();
    return (
        <main>
            How to play BeatBox
            <p>
            Finally deciding who deserves to be on aux once an for all? Hehe! well we have a game for you...
            </p>
        </main>
        
        
    )
}