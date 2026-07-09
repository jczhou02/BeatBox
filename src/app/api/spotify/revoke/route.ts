import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    console.log("Spotify revoke request received. Token:", token);

    // Spotify does not support token revocation via an API call.
    // For now, simply log and return a success response.
    // If Spotify adds support in the future, you could make a request here.

    return NextResponse.json({
      success: true,
      message: 'Spotify does not support token revocation. Please clear the token on the client side.',
    });
  } catch (error) {
    console.error("Error in token revocation:", error);
    return NextResponse.json(
      { error: 'Failed to process token revocation.' },
      { status: 500 }
    );
  }
}
