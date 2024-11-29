import { handlers , auth } from '@/auth'
import { NextRequest } from "next/server"

async function handler(request: NextRequest) {
    const session = await auth()
  
    const headers = new Headers(request.headers)
    headers.set("Authorization", `Bearer ${session?.accessToken}`)
  
    let backendUrl = process.env.THIRD_PARTY_API_EXAMPLE_BACKEND || "http://localhost:3000" 
  
    let url = request.nextUrl.href.replace(request.nextUrl.origin, backendUrl)
    let result = await fetch(url, { headers, body: request.body })
  
    return result
  }


export const { GET, POST } = handlers;