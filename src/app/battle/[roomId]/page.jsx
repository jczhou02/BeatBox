'use client';
import { useEffect } from "react";
import { getSocket } from "@/app/utils/socket/socket";
import { useRouter } from "next/navigation";

export default function BattlePage({ params }) {
    const router = useRouter();
    const { roomId } = params;

    useEffect(() => {
        const socket = getSocket();
        if (!socket) {
            router.push('/battle');
        }
    }, []);

    return (
        <div>
            <h1>Battle Room {roomId}</h1>
        </div>
    );
}